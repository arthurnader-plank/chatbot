import { createDataStreamResponse } from "ai"; // v4: from "ai"
import { ChatOpenAI } from "@langchain/openai";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import {
  StateGraph,
  START,
  END,
  Annotation
} from "@langchain/langgraph";
import {
  incrementConversationTurn,
  loadConversation,
  updateConversationTitle
} from "@/lib/chats";
import { weatherNode } from "@/app/agents/weatherAgent";
import { newsNode } from "@/app/agents/newsAgent";
import { summarizerNode } from "@/app/agents/summarizerAgent";

// -------------- Types --------------
interface DBMessage {
  id: number;
  sender: string;
  text: string;
  route?: string;
}

// -------------- Graph State --------------
const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (existing, update) =>
      existing.concat(Array.isArray(update) ? update : [update]),
    default: () => [],
  }),
  route: Annotation<string>({
    value: (_existing, update) => update,
    default: () => "chat",
  }),
  weather: Annotation<string | null>({
    value: (_existing, update) => update,
    default: () => null,
  }),
  news: Annotation<string | null>({
    value: (_existing, update) => update,
    default: () => null,
  }),
  turn: Annotation<number>({
    value: (_existing, update) => update,
    default: () => 0,
  }),
  conversationId: Annotation<string>({
    value: (_existing, update) => update,
    default: () => "",
  }),
});

// -------------- Nodes --------------
async function routerNode(state: { messages: BaseMessage[] }) {
  const routerModel = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });
  const system = new SystemMessage(
    "Classify the user's query into one of: weather, news, chat. Respond with only one word."
  );
  const lastUserMessage = state.messages.findLast(
    (m) => m instanceof HumanMessage
  );
  if (!lastUserMessage) return { route: "chat" };
  const response = await routerModel.invoke([system, lastUserMessage]);
  const route = String(response.content).trim().toLowerCase();
  return { route };
}

async function titleAgent(state: { messages: BaseMessage[], conversationId: string  }) {
  const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });
  const lastUserMessage = state.messages.findLast(
    (m) => m instanceof HumanMessage
  );
  const prompt = [
    new SystemMessage(
      "Generate a title with a maximum of four words based on the user message."
    ),
    new HumanMessage(`${lastUserMessage?.content ?? ""}`),
  ];
  const response = await model.invoke(prompt);
  const title = String(response.content).trim();

  // Update Supabase directly here
  if (state.conversationId && title) {
    await updateConversationTitle(state.conversationId, title);
  }

  // No state mutation needed
  return {};
}

async function chatNode(state: {
  messages: BaseMessage[];
  weather?: string | null;
  news?: string | null;
}) {
  const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.7 });
  const contextMessages: BaseMessage[] = [];
  if (state.weather) contextMessages.push(new AIMessage(`Weather info: ${state.weather}`));
  if (state.news) contextMessages.push(new AIMessage(`News info: ${state.news}`));
  const response = await model.invoke([...state.messages, ...contextMessages]);
  return { messages: [new AIMessage(String(response.content))] };
}

// -------------- Graph --------------
const graph = new StateGraph(StateAnnotation)
  .addNode("titleAgent", titleAgent)
  .addNode("router", routerNode)
  .addNode("weatherNode", weatherNode)
  .addNode("newsNode", newsNode)
  .addNode("chat", chatNode)
  .addNode("summarizer", summarizerNode)
  .addConditionalEdges(
    START,
    (state) => (state.turn === 1 ? "titleAgent" : "router"),
    { titleAgent: "titleAgent", router: "router" }
  )
  .addConditionalEdges("router", (state) => state.route, {
    weather: "weatherNode",
    news: "newsNode",
    chat: "chat",
  })
  .addEdge("titleAgent", "router")
  .addEdge("weatherNode", "chat")
  .addEdge("newsNode", "chat")
  .addConditionalEdges("chat", (state) => {
    const turn = state.turn;
    const shouldSummarize = turn >= 10 && turn % 5 === 0;
    return shouldSummarize ? "summarizer" : END;
  })
  .addEdge("summarizer", END)
  .compile();

// -------------- Route Handler (STREAM) --------------
export async function POST(req: Request) {
  const { conversationId } = await req.json();

  // Load + bump turn
  const conversation = await loadConversation(conversationId);
  const history: DBMessage[] = conversation.messages || [];
  const conversationSummary: string = conversation.summary || "";
  const currentTurn = (conversation.current_turn ?? 0) + 1;
  await incrementConversationTurn(conversationId, currentTurn);

  // System + history selection
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
    
          // ✅ Detect agent and store route
          if (!routeSeen && nodeName === "weatherNode") {
            finalRoute = "weather";
            routeSeen = true;
          }
    
          if (!routeSeen && nodeName === "newsNode") {
            finalRoute = "news";
            routeSeen = true;
          }
    
          // ✅ Skip other nodes
          if (nodeName !== targetNode) continue;
    
          // ✅ Stream chat tokens
          if (evt.event === "on_chat_model_stream" && evt.data?.chunk) {
            const chunk = evt.data.chunk;
    
            // Stream tokens
            const token = Array.isArray(chunk.content)
              ? chunk.content
                  .map((p: string | { text?: string }) =>
                    typeof p === "string" ? p : p?.text ?? ""
                  )
                  .join("")
              : String(chunk.content ?? "");
    
            dataStream.write(`0:${JSON.stringify(token)}\n`);
    
            // ✅ Write annotation *once* at the beginning of chatNode
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