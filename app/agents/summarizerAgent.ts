import type { BaseMessage } from "@langchain/core/messages";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({ modelName: "gpt-4o-mini", temperature: 0 });

export async function summarizerNode(state: { messages: BaseMessage[]; summary: string }) {
    console.log("SUMMARIZER IS RUNNING")
  // Walk backwards and collect messages until we have seen 10 HumanMessages
    let humanCount = 0;
    const selectedMessages: BaseMessage[] = [];

    for (let i = state.messages.length - 1; i >= 0; i--) {
    const msg = state.messages[i];
    selectedMessages.unshift(msg); // keep order

    if (msg instanceof HumanMessage) {
        humanCount++;
        if (humanCount === 10) break; // stop AFTER including the 10th human message
    }
    }

    let selectedCount = 0;
    const messagesUntilSixthHuman: BaseMessage[] = [];
    
    for (const msg of selectedMessages) {
        if (msg instanceof HumanMessage) {
            selectedCount++;
        if (selectedCount === 6) break; // stop after the 6th HumanMessage
        }
        messagesUntilSixthHuman.push(msg);
    }
    
    const toSummarize = messagesUntilSixthHuman
        .map((m) => {
        const role = m instanceof HumanMessage ? "Human" : m instanceof AIMessage ? "AI" : "Other";
        return `${role}: ${m.content}`;
        })
        .join("\n");

    const prompt = [
    new SystemMessage(
        "Summarize the following conversation segment, focusing on key facts and user intent. If a previous summary is provided, integrate it seamlessly into a single concise summary. Keep the final summary short and focused." 
    ),
    new HumanMessage(`Previous summary: ${state.summary || "(none)"}`),
    new HumanMessage(`Conversation segment:\n${toSummarize}`),
    ];

    const response = await model.invoke(prompt);
    const newSummary = String(response.content).trim();

    return { summary: newSummary };
}
