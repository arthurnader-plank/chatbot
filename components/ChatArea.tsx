// components/ChatArea.tsx
"use client";

import Image from "next/image";
import ChatInput from "@/components/ChatInput";
import LoadingDots from "@/components/LoadingDots";
import type { DBMessage } from "@/types/chat";
import type { RefObject } from "react";

interface ChatAreaProps {
    activeConversationId: string | null;
    dbMessages: DBMessage[];
    input: string;
    setInput: (value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    onToggleRecording: () => void;
    recording: boolean;
    onClear: () => void;
    messagesEndRef: RefObject<HTMLDivElement | null>;
}

export default function ChatArea({
    activeConversationId,
    dbMessages,
    input,
    setInput,
    onSubmit,
    onToggleRecording,
    recording,
    onClear,
    messagesEndRef,
}: ChatAreaProps) {
    return (
    <section className="flex flex-1 flex-col ml-4 mr-4 rounded-lg border-2 border-[#9a3015] p-4 bg-[#fff5f5]">
        <div
        className="flex-1 p-4 space-y-2 overflow-y-auto"
        style={{ maxHeight: "calc(100vh - 140px)" }}
        >
        {!activeConversationId ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-700">
            <Image
                src="/yoda.jpg"
                alt="Yoda"
                width={562}
                height={760}
                className="w-72 h-auto mb-4 rounded-lg shadow-lg"
            />
            <p className="max-w-md text-lg italic">
                To start your journey, select a previous conversation or begin a new one, you must, my Padawan.
            </p>
            </div>
        ) : (
            <>
            {dbMessages.map((msg, idx) => (
                <div
                key={msg.id ?? `${msg.sender}-${idx}`}
                className={`mr-1 flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                >
                <span className="text-sm font-semibold mb-1">
                    {msg.sender === "user" ? (
                    <span className="text-[#9a3015]">You</span>
                    ) : msg.route === "news" ? (
                    <span className="text-blue-500">Yoda (from the news of R2-D2)</span>
                    ) : msg.route === "weather" ? (
                    <span className="text-green-600">Yoda (sensed by the Force)</span>
                    ) : (
                    <span className="text-[#9a3015]">Yoda</span>
                    )}
                </span>
                <span
                    className={`px-4 py-2 rounded-lg ${
                    msg.sender === "user"
                        ? "bg-[#fff5f5] text-black border border-blue-500"
                        : "bg-[#fff5f5] text-black border border-[#9a3015]"
                    }`}
                >
                    {msg.text || (
                    <span className="italic">
                        R2-D2 is sending message to Dagobah <LoadingDots />
                    </span>
                    )}
                </span>
                </div>
            ))}
            <div ref={messagesEndRef} />
            </>
        )}
        </div>

        {activeConversationId && (
        <ChatInput
            input={input}
            setInput={setInput}
            onSubmit={onSubmit}
            onToggleRecording={onToggleRecording}
            recording={recording}
            onClear={onClear}
        />
        )}
    </section>
    );
}
