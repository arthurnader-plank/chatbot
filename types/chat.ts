export interface DBMessage {
    id: number;
    sender: "user" | "assistant";
    text: string;
    route?: string;
}

export interface Conversation {
    id: string;
    title: string;
    created_at: string;
}
