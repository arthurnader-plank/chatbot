import type {BaseMessage} from "@langchain/core/messages";
import { HumanMessage, SystemMessage} from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

async function extractCityWithLLM(query: string): Promise<string> {
    const model = new ChatOpenAI({ modelName: "gpt-4o-mini", temperature: 0 });

    const prompt = [
        new SystemMessage(
            "Extract the location (city, state, or region) from the user's query. If no location is found, respond with 'Belo Horizonte'. Return only the location name, nothing else."
        ),
        new HumanMessage(query),
    ];

    const response = await model.invoke(prompt);
    return String(response.content).trim();
}

export async function weatherNode(state: { messages: BaseMessage[] }) {
    const lastUserMessage = state.messages.findLast(m => m instanceof HumanMessage);
    const query = (lastUserMessage?.content as string) ?? "Weather in Belo Horizonte";

    // 🔹 Use LLM to extract city
    const location = await extractCityWithLLM(query);

    const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`
    );

    if (!res.ok) {
        return { weather: `Unable to fetch weather data for ${location}.` };
    }

    const data = await res.json();
    console.log(data);
    const temp = data.main?.temp ?? "unknown";
    const description = data.weather?.[0]?.description ?? "no data";

    return { weather: `The weather in ${location} is ${temp}°C with ${description}.` };
}