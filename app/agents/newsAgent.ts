import type { BaseMessage }from "@langchain/core/messages";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

async function extractTopicWithLLM(query: string): Promise<string> {
    const model = new ChatOpenAI({ modelName: "gpt-4o-mini", temperature: 0 });
    const prompt = [
    new SystemMessage(
        "Extract only the main topic from the user's query, in one or two words. If no topic is found, return 'general'."
    ),
    new HumanMessage(query),
    ];
    const response = await model.invoke(prompt);
    return String(response.content).trim();
}

export async function newsNode(state: { messages: BaseMessage[] }) {
    const lastUserMessage = state.messages.findLast(m => m instanceof HumanMessage);
    const query = (lastUserMessage?.content as string) ?? "general news";

    // 1️⃣ Extract topic using LLM
    const topic = await extractTopicWithLLM(query);
    // 2️⃣ Fetch from NewsAPI
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
        topic
    )}&language=en&sortBy=publishedAt&pageSize=5&apiKey=${process.env.NEWS_API_KEY}`;

    const response = await fetch(url);

    if (!response.ok) {
        console.error("News API error", await response.text());
        return { news: `Unable to fetch news about ${topic}.` };
    }

    const data = await response.json();
    const articles = (data.articles ?? []) as Array<{ title: string }>;

    if (articles.length === 0) {
        return { news: `No recent headlines found about ${topic}.` };
    }

    const headlines = articles
        .map((a, i) => `${i + 1}. ${a.title}`)
        .join("\n");

    return { news: `Top headlines about ${topic}:\n${headlines}` };
}