import type { BaseMessage }from "@langchain/core/messages";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

export async function routerNode(state: { messages: BaseMessage[] }) {
  const routerModel = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });
  const system = new SystemMessage(
    "Classify the user's query into one of: weather, news, chat. Respond with only one word."
  );
  const lastUserMessage = state.messages.findLast(
    (m) => m instanceof HumanMessage
  );
  if (!lastUserMessage){
    return { route: "chat" };
  }
  
    const response = await routerModel.invoke([system, lastUserMessage]);
  const route = String(response.content).trim().toLowerCase();

  return { route };
}