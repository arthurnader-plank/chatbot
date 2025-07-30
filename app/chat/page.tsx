"use client";
import { useState } from "react";
import Link from "next/link";

interface Message {
  id: number;
  sender: "user" | "bot";
  text: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: "bot", text: "Hello! How can I help you today?" },
  ]);
  const [input, setInput] = useState("");

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage: Message = {
      id: Date.now(),
      sender: "user",
      text: input.trim(),
    };

    setMessages((prev) => [...prev, newMessage]);

    // Simulate bot response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: "bot", text: "This is a bot reply." },
      ]);
    }, 600);

    setInput("");
  };

  const newChat = () => {
    setMessages([{ id: Date.now(), sender: "bot", text: "New chat started." }]);
  };

  return (
    <main className="flex min-h-screen">
      <aside className="w-64 bg-gray-200 p-4 hidden md:flex flex-col">
        <button
          onClick={newChat}
          className="mb-4 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + New Chat
        </button>
        <h2 className="font-bold mb-4 text-black">Previous Chats</h2>
        <p className="text-sm text-black">
          (Previous conversations list placeholder)
        </p>
      </aside>

      <section className="flex flex-1 flex-col">
        <div className="flex-1 p-4 space-y-2 overflow-y-auto bg-gray-50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <span
                className={`px-4 py-2 rounded-lg ${
                  msg.sender === "user"
                    ? "bg-blue-300 text-black"
                    : "bg-gray-300 text-black"
                }`}
              >
                {msg.text}
              </span>
            </div>
          ))}
        </div>

        <form
          onSubmit={sendMessage}
          className="flex border-t border-gray-300 p-2 bg-gray-300"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border rounded-l focus:outline-none focus:ring focus:ring-blue-300 text-black bg-blue-100"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-r hover:bg-blue-700"
          >
            Send
          </button>
        </form>
      </section>
    </main>
  );
}
