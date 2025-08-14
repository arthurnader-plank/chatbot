import type { DBMessage } from "@/types/chat";

export function normalizeMessages(msgs: Partial<DBMessage>[]): DBMessage[] {
    return (msgs || []).map((m, idx) => ({
        id: typeof m.id === "number" ? m.id : idx + 1,
        sender: (m.sender as DBMessage["sender"]) ?? "assistant",
        text: m.text ?? "",
        route: m.route,
    }));
}

/** Upsert the last assistant bubble while streaming */
export function updateOrAppendAssistantMessage(
    setDbMessages: React.Dispatch<React.SetStateAction<DBMessage[]>>,
    text: string,
    route?: string
) {
    setDbMessages(prev => {
    if (prev.length > 0 && prev[prev.length - 1].sender === "assistant") {
        return [
        ...prev.slice(0, -1),
        { ...prev[prev.length - 1], text, route: route ?? prev[prev.length - 1].route },
        ];
    }
    return [...prev, { id: Date.now(), sender: "assistant", text, route }];
    });
}
