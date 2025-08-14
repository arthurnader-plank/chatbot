"use client";
import type React from "react";

type Props = {
    input: string;
    setInput: (v: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    onToggleRecording: () => void;
    recording: boolean;
    onClear: () => void;
};

export default function ChatInput({
    input, setInput, onSubmit, onToggleRecording, recording, onClear,
}: Props) {
    return (
    <form onSubmit={onSubmit} className="flex p-2 space-x-2 m-4">
        <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-[#9a3015] rounded-xl focus:outline-none focus:ring focus:ring-[#9a3015] text-black"
        />
        <button
            type="button"
            onClick={onToggleRecording}
            className={`px-4 py-2 rounded ${recording ? "bg-red-300 animate-pulse" : "bg-green-800"} text-white`}
        >
            {recording ? "Stop" : "Rec"}
        </button>
        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-[#9a3015]">
            Send
        </button>
        <button type="button" onClick={onClear} className="px-4 py-2 bg-[#fb0000] text-white rounded hover:bg-[#450f01]">
            Clear
        </button>
    </form>
    );
}
