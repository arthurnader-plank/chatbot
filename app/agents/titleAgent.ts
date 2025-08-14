import type { BaseMessage }from "@langchain/core/messages";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import {
  updateConversationTitle
} from "@/lib/chats";

export async function titleNode(state: { messages: BaseMessage[], conversationId: string  }) {
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

  if (state.conversationId && title) {
    await updateConversationTitle(state.conversationId, title);
  }

  return {};
}