import { NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";
import {
  StateGraph,
  START,
  END,
  Annotation
} from "@langchain/langgraph";
import { loadConversation } from "@/lib/chats";

import type { BaseMessage } from "@langchain/core/messages";

interface DBMessage {
  id: number;
  sender: string;
  text: string;
}

// 1️⃣ Define State schema with automatic appending of messages
const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (existing, update) => {
      return existing.concat(Array.isArray(update) ? update : [update]);
    },
    default: () => [],
  }),
});

// 2️⃣ Define the Node function that calls the LLM
async function llmNode(
  state: { messages: BaseMessage[] }
): Promise<{ messages: BaseMessage[] }> {
  const model = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.7,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
  const response = await model.invoke(state.messages);
  return { messages: [new AIMessage(response.text)] };
}

// 3️⃣ Build the graph
const graph = new StateGraph(StateAnnotation)
  .addNode("llm", llmNode)
  .addEdge(START, "llm")
  .addEdge("llm", END)
  .compile();

export async function POST(req: Request) {
  const { conversationId, input } = await req.json();

  // Fetch history from Supabase
  const conversation = await loadConversation(conversationId);
  const history = conversation.messages || [];

  const systemPrompt = new SystemMessage(
    "You are Jim Morrison, a famous poet and singer of The Doors. " +
      "Respond with deep, philosophical, and poetic answers, blending mystery and insight into every response."
  );

  // 4️⃣ Build the initial state with system prompt + history + new input
  const initState = {
    messages: [
      systemPrompt,
      ...history.map((m: DBMessage) =>
        m.sender === "user" ? new HumanMessage(m.text) : new AIMessage(m.text)
      ),
      new HumanMessage(input),
    ],
  };

  // 5️⃣ Invoke the graph & extract last message
  const result = await graph.invoke(initState);
  const last = result.messages[result.messages.length - 1];
  return NextResponse.json({ output: last.content });
}
