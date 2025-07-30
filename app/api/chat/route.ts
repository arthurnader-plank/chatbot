import { NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { loadConversation } from "@/lib/chats";

export async function POST(req: Request) {
  const { conversationId, input } = await req.json();
  
  const conversation = await loadConversation(conversationId);
  const history = conversation.messages || [];

  const messages = [
    ...history.map((m: any) =>
      m.sender === "user" ? new HumanMessage(m.text) : new AIMessage(m.text)
    ),
    new HumanMessage(input),
  ];

  const model = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0.7,
    openAIApiKey: process.env.OPENAI_API_KEY,  // works on server
  });

  const response = await model.invoke(messages);
  return NextResponse.json({ output: response.content });
}