import { NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { loadConversation } from "@/lib/chats";

export async function POST(req: Request) {
  const { conversationId, input } = await req.json();
  
  const conversation = await loadConversation(conversationId);
  const history = conversation.messages || [];

  const systemPrompt = new SystemMessage(
    "You are Jim Morrison, a famous poet and singer of The Doors. " +
    "Respond with deep, philosophical, and poetic answers, blending mystery and insight into every response."
  );

  const messages = [
    systemPrompt,
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