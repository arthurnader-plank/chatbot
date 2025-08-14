// External libraries (sorted alphabetically)
import { createDataStreamResponse } from "ai";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  type BaseMessage,
} from "@langchain/core/messages";

import {
  incrementConversationTurn,
  loadConversation,
} from "@/lib/chats";
import { graph } from "@/app/graph/graph";
// -------------- Types --------------

interface DBMessage {
  id: number;
  sender: string;
  text: string;
  route?: string;
}

export async function POST(req: Request) {
  const { conversationId } = await req.json();

  const conversation = await loadConversation(conversationId);
  const history: DBMessage[] = conversation.messages || [];
  const conversationSummary: string = conversation.summary || "";
  const currentTurn = (conversation.current_turn ?? 0) + 1;
  await incrementConversationTurn(conversationId, currentTurn);

  const systemPrompt = new SystemMessage(
    "You are Yoda from Star Wars. Speak in short, wise, and cryptic sentences. " +
      "Reverse word order where natural, omit unnecessary words, and use a calm, mystical tone. " +
      "Offer helpful advice when responding, guiding users with wisdom of the Force. " +
      "If needed, use extra information about the weather or news to give an appropriate answer."
  );

  const numMessages = 6 + ((currentTurn - 1) % 5);
  const selectedMessages: DBMessage[] = [];
  let userCount = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    selectedMessages.unshift(msg);
    if (msg.sender === "user") {
      userCount++;
      if (userCount >= numMessages) break;
    }
  }

  const recentMessages: BaseMessage[] = selectedMessages.map((m) =>
    m.sender === "user" ? new HumanMessage(m.text) : new AIMessage(m.text)
  );

  const initState = {
    messages: [
      systemPrompt,
      ...(conversationSummary
        ? [new AIMessage(`Summary of past conversation: ${conversationSummary}`)]
        : []),
      ...recentMessages,
    ],
    turn: currentTurn,
    summary: conversationSummary,
    conversationId, 
  };

  const events = await graph.streamEvents(initState, {
    version: "v2",
    streamMode: "messages",
  });
  
  // 2) stream to the client with node metadata
  return createDataStreamResponse({
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Vercel-AI-Agent": "v1",
    },
    execute: async (dataStream) => {
      try {
        let currentNode: string | null = null;
        const targetNode = "chat";
    
        let finalRoute: "weather" | "news" | "chat" = "chat"; // ← default
        let routeSeen = false;
    
        for await (const evt of events) {
          const md = evt.metadata as { langgraph_node?: string } | undefined;
          const nodeName = md?.langgraph_node ?? null;
    
          if (!routeSeen && nodeName === "weatherNode") {
            finalRoute = "weather";
            routeSeen = true;
          }
    
          if (!routeSeen && nodeName === "newsNode") {
            finalRoute = "news";
            routeSeen = true;
          }

          if (nodeName !== targetNode) continue;
    
          // ✅ Stream chat tokens
          if (evt.event === "on_chat_model_stream" && evt.data?.chunk) {
            const chunk = evt.data.chunk;
    
            const token = Array.isArray(chunk.content)
              ? chunk.content
                  .map((p: string | { text?: string }) =>
                    typeof p === "string" ? p : p?.text ?? ""
                  )
                  .join("")
              : String(chunk.content ?? "");
    
            dataStream.write(`0:${JSON.stringify(token)}\n`);

            if (nodeName && nodeName !== currentNode) {
              currentNode = nodeName;
              dataStream.writeMessageAnnotation({
                route: finalRoute,
                agent: "chat",
              });
            }
          }
        }
      } catch (err) {
        console.error("Streaming error:", err);
      }
    },
  });
}