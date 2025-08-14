import type { BaseMessage }from "@langchain/core/messages";
import { AIMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

export async function chatNode(state: {
    messages: BaseMessage[];
    weather?: string | null;
    news?: string | null;
}) {
    const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.7 });
    const contextMessages: BaseMessage[] = [];
    
    if (state.weather){
        contextMessages.push(new AIMessage(`Weather info: ${state.weather}`));
    }

    if (state.news){
        contextMessages.push(new AIMessage(`News info: ${state.news}`));
    }

    const response = await model.invoke([...state.messages, ...contextMessages]);
    return { messages: [new AIMessage(String(response.content))] };
}