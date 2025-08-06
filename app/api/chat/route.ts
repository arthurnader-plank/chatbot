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
import { incrementConversationTurn, loadConversation, updateConversationTitle, updateSummarize} from "@/lib/chats";
import { weatherNode } from "@/app/agents/weatherAgent";
import { newsNode } from "@/app/agents/newsAgent";
import { summarizerNode } from "@/app/agents/summarizerAgent";

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
  summary: Annotation<string>({
    value: (_existing, update) => update,
    default: () => "",
  }),
  title: Annotation<string>({
    value: (_existing, update) => update,
    default: () => "",
  }),
  turn: Annotation<number>({
    value: (_existing, update) => update,
    default: () => 0,
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

  return { route };
}

async function titleAgent(state: { messages: BaseMessage[]}) {
 
  const model = new ChatOpenAI({ modelName: "gpt-4o-mini", temperature: 0 });
  const lastUserMessage = state.messages.findLast(m => m instanceof HumanMessage);

  const prompt = [
    new SystemMessage(
      "Generate a title with maximum of four words based on the user message."
    ),
    new HumanMessage(`${lastUserMessage?.content}`)
  ];

  const response = await model.invoke(prompt);
  return {title: String(response.content).trim()};
}


async function chatNode(state: { messages: BaseMessage[]; weather?: string; news?: string }) {
  const model = new ChatOpenAI({ modelName: "gpt-4o-mini", temperature: 0.7 });

  const contextMessages: BaseMessage[] = [];

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
const graph = new StateGraph(StateAnnotation)
  .addNode("titleAgent", titleAgent) // Defines the entry point
  .addNode("router", routerNode)
  .addNode("weatherNode", weatherNode)
  .addNode("newsNode", newsNode)
  .addNode("chat", chatNode)
  .addNode("summarizer", summarizerNode)
  .addConditionalEdges(START, (state) => {
    // If it's the first user turn, run titleAgent
    return state.turn === 1 ? "titleAgent" : "router";
  }, {
    titleAgent: "titleAgent",
    router: "router"
  })
  .addConditionalEdges("router", (state) => state.route, {
    weather: "weatherNode",
    news: "newsNode",
    chat: "chat"
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

export async function POST(req: Request) {
  const { conversationId } = await req.json();

  // Fetch history from Supabase
  const conversation = await loadConversation(conversationId);
  const history = conversation.messages || [];
  const conversationSummary = conversation.summary || "";
  const currentTurn = (conversation.current_turn ?? 0) + 1;

  // Update it in the database
  await incrementConversationTurn(conversationId, currentTurn);


  const systemPrompt = new SystemMessage(
    "You are Yoda from Star Wars. Speak in short, wise, and cryptic sentences. " +
    "Reverse word order where natural, omit unnecessary words, and use a calm, mystical tone. " +
    "Offer helpful advice when responding, guiding users with wisdom of the Force." +
    "If needed, use extra information about the weather or news to give an appropriante answer."
  );

  const numMessages = 6 + (currentTurn - 1) % 5
  
  const selectedMessages: DBMessage[] = [];
  let userCount = 0;

  // iterate backwards until we reach required number of user messages
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    selectedMessages.unshift(msg);

    if (msg.sender === "user") {
      userCount++;
      if (userCount >= numMessages) break;
    }
  }

  const recentMessages = selectedMessages.map((m: DBMessage) =>
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
  };

  // 5️⃣ Invoke the graph & extract last message
  const result = await graph.invoke(initState);
  const last = result.messages[result.messages.length - 1];

  if (currentTurn >= 10 && currentTurn % 5 === 0)
    await updateSummarize(conversationId, result.summary)

  if (currentTurn === 1)
    await updateConversationTitle(conversationId, result.title)

  return NextResponse.json({ output: last.content, route:result.route, title:result.title});
}