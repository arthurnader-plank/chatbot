"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import {
  appendMessageToConversation,
  clearConversation,
  createNewConversation,
  fetchUserConversations,
  loadConversation,
} from "@/lib/chats";
import { supabase } from "@/lib/supabaseClient";

interface DBMessage {
  id: number;
  sender: "user" | "assistant";
  text: string;
  route?: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

function LoadingDots() {
  return (
    <span className="inline-flex ml-2">
      <span className="dot animate-bounce delay-0">.</span>
      <span className="dot animate-bounce delay-150">.</span>
      <span className="dot animate-bounce delay-300">.</span>
    </span>
  );
}

/**
 * Parse message.content that may be:
 *  - a plain string
 *  - a JSON string like {"output":"...","route":"news","title":""}
 *  - an object in that same shape
 *  - an array of parts from the AI SDK
 */
type AssistantJSON = {
  output?: string;
  route?: string;
  title?: string;
};

function isAssistantJSON(value: unknown): value is AssistantJSON {
  return (
    typeof value === "object" &&
    value !== null &&
    ("output" in value || "route" in value || "title" in value)
  );
}

export function parseAssistantContent(content: unknown): { text: string; route?: string } {
  if (typeof content === "string") {
    try {
      const parsed = JSON.parse(content) as unknown;
      if (isAssistantJSON(parsed)) {
        return { text: String(parsed.output ?? ""), route: parsed.route };
      }
      return { text: content };
    } catch {
      return { text: content };
    }
  }

  if (isAssistantJSON(content)) {
    return { text: String(content.output ?? ""), route: content.route };
  }

  if (Array.isArray(content)) {
    const text = content
      .map((p) => {
        if (p && typeof p === "object" && "type" in p && (p as { type?: string }).type === "text") {
          return (p as { text?: string }).text ?? "";
        }
        return "";
      })
      .join("");
    return { text };
  }

  return { text: "" };
}

function normalizeMessages(msgs: Partial<DBMessage>[]): DBMessage[] {
  return (msgs || []).map((m, idx) => ({
    id: typeof m.id === "number" ? m.id : idx + 1,
    sender: (m.sender as DBMessage["sender"]) ?? "assistant",
    text: m.text ?? "",
    route: m.route,
  }));
}

export default function ChatPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const [dbMessages, setDbMessages] = useState<DBMessage[]>([]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const { input, setInput, append, isLoading } = useChat({
    api: "/api/chat",
    body: { conversationId: activeConversationId },
    streamProtocol: "text",
    onResponse: async (res) => {
      if (!res.ok) console.error("Chat error", await res.text());
    },
    // Append assistant reply into dbMessages AND persist it to Supabase
    onFinish: async (message) => {
      try {
        const { text, route } = parseAssistantContent(message.content);
        // 1) Persist bot message to DB
        if (activeConversationId) {
          await appendMessageToConversation(activeConversationId, {
            sender: "assistant",
            text,
            route: route ?? "chat",
          });
        }

        // 2) Update UI (optimistic/local)
        setDbMessages((prev) => [
          ...prev,
          { id: Date.now(), sender: "assistant", text, route },
        ]);

        // 3) Refresh sidebar titles
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const convs = await fetchUserConversations(user.id);
          setConversations(convs ?? []);
        }
      } catch (err) {
        console.error("Failed to persist assistant message:", err);
      } finally {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    },
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: messages dependency is needed for scroll behavior
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dbMessages]);

  // auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
      } else {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  // load conversations list
  useEffect(() => {
    const fetchConversationsList = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      try {
        const conversations = await fetchUserConversations(user.id);
        setConversations(conversations ?? []);
      } catch (error) {
        console.error("Error fetching conversations:", error);
      }
    };
    if (!loading) fetchConversationsList();
  }, [loading]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  async function toggleRecording() {
    if (!recording) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => audioChunksRef.current.push(event.data);

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("file", audioBlob, "recording.webm");

        const res = await fetch("/api/transcribe", { method: "POST", body: formData });
        const data = await res.json();
        setInput(data.text);
      };

      mediaRecorder.start();
      setRecording(true);
    } else {
      mediaRecorderRef.current?.stop();
      setRecording(false);
    }
  }

  const newChat = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("You must be logged in to create a new conversation.");
        return;
      }
      const conversation = await createNewConversation(user.id);
      setConversations((prev) => [conversation, ...prev]);
      setActiveConversationId(conversation.id);
      setDbMessages([]);
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  const handleLoadConversation = async (conversationId: string) => {
    setActiveConversationId(conversationId);
    const conversation = await loadConversation(conversationId);
    setDbMessages(normalizeMessages(conversation.messages || []));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeConversationId) return;

    const text = input.trim();

    // optimistic user message in UI
    const userMessage: DBMessage = {
      id: Date.now(),
      sender: "user",
      text,
    };
    setDbMessages((prev) => [...prev, userMessage]);

    // persist user message
    try {
      await appendMessageToConversation(activeConversationId, { sender: "user", text });
    } catch (err) {
      console.error("Failed to persist user message:", err);
    }

    // stream assistant reply (server may also persist; we persist again above for safety)
    await append({ role: "user", content: text }, { body: { conversationId: activeConversationId } });

    setInput("");
  };

  if (loading) {
    return (
      <div className="fixed top-4 left-0 w-full flex justify-center z-50">
        <p className="text-white text-sm font-semibold tracking-wider animate-pulse">
          Checking your Jedi credentials...
        </p>
      </div>
    );
  }

  return (
    <main className="flex h-screen w-full bg-[#fff5f5] p-4">
      <div className="flex flex-1 bg-[#fff5f5] rounded-lg shadow">
        {/* Sidebar */}
        <aside className="w-64 bg-[#450f01] p-4 hidden md:flex flex-col rounded-lg shadow h-full text-white">
          <div className="flex space-x-2 mb-4">
            <button
              type="button"
              onClick={newChat}
              className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-[#9a3015]"
            >
              + New Chat
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-2 bg-[#fb0000] text-white rounded hover:bg-[#450f01]"
            >
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
                    ${
                      activeConversationId === conv.id
                        ? "bg-[#9a3015] text-white"
                        : "bg-[#fff5f5] text-black hover:bg-[#9a3015] hover:text-white"
                    }`}
                  onClick={() => handleLoadConversation(conv.id)}
                >
                  {conv.title}
                </button>
              ))
            ) : (
              <p className="text-sm text-white">No previous conversations</p>
            )}
          </div>
        </aside>

        {/* Chat Area */}
        <section className="flex flex-1 flex-col ml-4 mr-4 rounded-lg border-2 border-[#9a3015] p-4 bg-[#fff5f5]">
          <div
            className="flex-1 p-4 space-y-2 overflow-y-auto"
            style={{ maxHeight: "calc(100vh - 140px)" }}
          >
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
                  {msg.text}
                </span>
              </div>
            ))}

            {isLoading && (
              <div className="flex flex-col items-start">
                <span className="px-4 py-2 rounded-lg bg-[#fff5f5] text-black border border-[#9a3015] italic">
                  R2-D2 is sending message to Dagobah
                  <LoadingDots />
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
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
              onClick={toggleRecording}
              className={`px-4 py-2 rounded ${recording ? "bg-red-300 animate-pulse" : "bg-green-800"} text-white`}
            >
              {recording ? "Stop" : "Rec"}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-[#9a3015]"
            >
              Send
            </button>
            {activeConversationId && (
              <button
                type="button"
                onClick={async () => {
                  await clearConversation(activeConversationId);
                  setDbMessages([]);
                }}
                className="px-4 py-2 bg-[#fb0000] text-white rounded hover:bg-[#450f01]"
              >
                Clear
              </button>
            )}
          </form>
        </section>
      </div>
    </main>
  );
}
