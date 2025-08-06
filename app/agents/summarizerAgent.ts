import type { BaseMessage } from "@langchain/core/messages";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({ modelName: "gpt-4o-mini", temperature: 0 });

export async function summarizerNode(state: { messages: BaseMessage[]; summary: string }) {

    // Select all conversation until (but not including) the 6th HumanMessage
    let humanCount = 0;
    const messagesToSummarize: BaseMessage[] = [];

    for (const msg of state.messages) {
        if (msg instanceof HumanMessage) {
            humanCount++;
            if (humanCount === 6) break; // stop BEFORE including this one
        }
        messagesToSummarize.push(msg);
    }

    const toSummarize = messagesToSummarize
        .map((m) => {
            const role = m instanceof HumanMessage ? "Human" : m instanceof AIMessage ? "AI" : "Other";
            return `${role}: ${m.content}`;
        })
        .join("\n");

    const prompt = [
        new SystemMessage(
            "Summarize the following conversation segment, focusing on key facts and user intent. "
            + "If a previous summary is provided, integrate it seamlessly into a single concise summary. "
        ),
        new HumanMessage(`Previous summary: ${state.summary || "(none)"}`),
        new HumanMessage(`Conversation segment:\n${toSummarize}`),
    ];

    const response = await model.invoke(prompt);
    const newSummary = String(response.content).trim();

    return { summary: newSummary };
}
