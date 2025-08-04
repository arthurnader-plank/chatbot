import { loadConversation } from "@/lib/chats";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";


interface DBMessage {
  id: number;
  sender: string;
  text: string;
}

const model = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0.7,
});

export async function chatAgent(conversationId: string, input: string) {
  const conversation = await loadConversation(conversationId);
  const history = conversation.messages || [];

  const messages = [
    ...history.map((m: DBMessage) =>
      m.sender === "user" ? new HumanMessage(m.text) : new AIMessage(m.text)
    ),
    new HumanMessage(input),
  ];

  const response = await model.invoke(messages);
  return { output: response.content };
}