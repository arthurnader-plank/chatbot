"use client";
import type { Conversation } from "@/types/chat";

type Props = {
    conversations: Conversation[];
    activeConversationId: string | null;
    onNewChat: () => void;
    onLogout: () => void;
    onLoadConversation: (id: string) => void;
};

export default function Sidebar({
    conversations,
    activeConversationId,
    onNewChat,
    onLogout,
    onLoadConversation,
}: Props) {
    return (
    <aside className="w-64 bg-[#450f01] p-4 hidden md:flex flex-col rounded-lg shadow h-full text-white">
        <div className="flex space-x-2 mb-4">
        <button type="button" onClick={onNewChat}
            className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-[#9a3015]">
            + New Chat
        </button>
        <button type="button" onClick={onLogout}
            className="px-3 py-2 bg-[#fb0000] text-white rounded hover:bg-[#450f01]">
            Logout
        </button>
        </div>

        <h2 className="font-bold mb-4 text-white">Previous Chats</h2>

        <div className="flex-1 overflow-y-auto space-y-2">
        {conversations.length > 0 ? (
            conversations.map((conv) => (
            <button
                type="button"
                key={conv.id}
                className={`w-full max-w-[200px] truncate text-left p-2 rounded shadow cursor-pointer transition 
                ${activeConversationId === conv.id
                    ? "bg-[#9a3015] text-white"
                    : "bg-[#fff5f5] text-black hover:bg-[#9a3015] hover:text-white"}`}
                onClick={() => onLoadConversation(conv.id)}
            >
                {conv.title}
            </button>
            ))
        ) : (
            <p className="text-sm text-white">No previous conversations</p>
        )}
        </div>
    </aside>
    );
}
