import type { BaseMessage} from "@langchain/core/messages";
import {
    Annotation,
    END,
    START,
    StateGraph,
} from "@langchain/langgraph";
import { chatNode } from "@/app/agents/chatAgent";
import { newsNode } from "@/app/agents/newsAgent";
import { routerNode } from "@/app/agents/routerAgent";
import { summarizerNode } from "@/app/agents/summarizerAgent";
import { titleNode } from "@/app/agents/titleAgent";
import { weatherNode } from "@/app/agents/weatherAgent";

const StateAnnotation = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (existing, update) => existing.concat(Array.isArray(update) ? update : [update]),
        default: () => [],
    }),
    route: Annotation<string>({
        value: (_existing, update) => update,
        default: () => "chat",
    }),
    weather: Annotation<string | null>({
        value: (_existing, update) => update,
        default: () => null,
    }),
    news: Annotation<string | null>({
        value: (_existing, update) => update,
        default: () => null,
    }),
    turn: Annotation<number>({
        value: (_existing, update) => update,
        default: () => 0,
    }),
    conversationId: Annotation<string>({
        value: (_existing, update) => update,
        default: () => "",
    }),
});

export const graph = new StateGraph(StateAnnotation)
    .addNode("titleNode", titleNode)
    .addNode("router", routerNode)
    .addNode("weatherNode", weatherNode)
    .addNode("newsNode", newsNode)
    .addNode("chat", chatNode)
    .addNode("summarizer", summarizerNode)
    .addConditionalEdges(
    START,
        (state) => (state.turn === 1 ? "titleNode" : "router"),
        { titleNode: "titleNode", router: "router" }
    )
    .addConditionalEdges("router", (state) => state.route, {
        weather: "weatherNode",
        news: "newsNode",
        chat: "chat",
    })
    .addEdge("titleNode", "router")
    .addEdge("weatherNode", "chat")
    .addEdge("newsNode", "chat")
    .addConditionalEdges("chat", (state) => {
        const turn = state.turn;
        const shouldSummarize = turn >= 10 && turn % 5 === 0;
        return shouldSummarize ? "summarizer" : END;
    })
    .addEdge("summarizer", END)
    .compile();