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
import { weatherNode } from "@/app/agents/weatherAgent";
import { newsNode } from "@/app/agents/newsAgent";

import type { BaseMessage } from "@langchain/core/messages";

interface DBMessage {
  id: number;
  sender: string;
  text: string;
  route?: string;
}

// 1️⃣ Define State schema with automatic appending of messages
const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (existing, update) => {
      return existing.concat(Array.isArray(update) ? update : [update]);
    },
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
});
// 2️⃣ Router Node (LLM-based)
async function routerNode(state: { messages: BaseMessage[] }) {
  const routerModel = new ChatOpenAI({ modelName: "gpt-4o-mini", temperature: 0 });
  const system = new SystemMessage(
    "Classify the user's query into one of the following: weather, news, chat. Respond with only one word."
  );

  const lastUserMessage = state.messages.findLast(m => m instanceof HumanMessage);

  if (!lastUserMessage) {
    console.warn("No HumanMessage found in state.messages");
    return { route: "chat" }; // fallback route
  }


  const response = await routerModel.invoke([system, lastUserMessage]);
  const route = String(response.content).trim().toLowerCase();
  console.log(route);
  return { route };
}


async function chatNode(state: { messages: BaseMessage[]; weather?: string; news?: string }) {
  const model = new ChatOpenAI({ modelName: "gpt-4o-mini", temperature: 0.7 });

  const contextMessages: BaseMessage[] = [];
  console.log(state.weather);
  if (state.weather) contextMessages.push(new AIMessage(`Weather info: ${state.weather}`));
  if (state.news) contextMessages.push(new AIMessage(`News info: ${state.news}`));

  const response = await model.invoke([
    ...state.messages,
    ...contextMessages
  ]);

  return { messages: [new AIMessage(String(response.content))] };
}

// 3️⃣ Build the graph
// 6️⃣ Graph definition
const graph = new StateGraph(StateAnnotation) // Defines the entry point
  .addNode("router", routerNode)
  .addNode("weatherNode", weatherNode)
  .addNode("newsNode", newsNode)
  .addNode("chat", chatNode)
  .addConditionalEdges("router", (state) => state.route, {
    weather: "weatherNode",
    news: "newsNode",
    chat: "chat"
  })
  .addEdge(START, "router")
  .addEdge("chat", END)
  .addEdge("weatherNode", "chat")
  .addEdge("newsNode", "chat")
  .compile();

export async function POST(req: Request) {
  const { conversationId } = await req.json();

  // Fetch history from Supabase
  const conversation = await loadConversation(conversationId);
  const history = conversation.messages || [];

  const systemPrompt = new SystemMessage(
    "You are Jim Morrison, a famous poet and singer of The Doors. " +
    "Respond with concise, poetic answers infused with mystery."
  );

  // 4️⃣ Build the initial state with system prompt + history + new input
  const initState = {
    messages: [
      systemPrompt,
      ...history.map((m: DBMessage) =>
        m.sender === "user" ? new HumanMessage(m.text) : new AIMessage(m.text)
      ),

    ],
  };

  // 5️⃣ Invoke the graph & extract last message
  const result = await graph.invoke(initState);
  const last = result.messages[result.messages.length - 1];

  return NextResponse.json({ output: last.content, route:result.route });
}