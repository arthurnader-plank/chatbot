"use client";


import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import {
  appendMessageToConversation,
  clearConversation,
  createNewConversation,
  fetchUserConversations,
  loadConversation,
} from "@/lib/chats";
import { supabase } from "@/lib/supabaseClient";
import type { Conversation, DBMessage} from "@/types/chat"
import Sidebar from "@/components/Sidebar";
import ChatArea from "@/components/ChatArea";
import { normalizeMessages, updateOrAppendAssistantMessage } from "@/utils/messages";
import DialogBox from "@/components/DialogBox";


export default function ChatPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [dbMessages, setDbMessages] = useState<DBMessage[]>([]);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const { input, setInput, append, isLoading, messages } = useChat({
    api: "/api/chat",
    body: { conversationId: activeConversationId },
    streamProtocol: "data",
    onResponse: async (res) => {
      if (!res.ok) console.error("Chat error", await res.text());
    },
    onFinish: async (message) => {
      console.log(message);
      try {
        const text = message.content;
        const annotation = message?.annotations?.[0] as { route?: string; agent?: string } | undefined;
        const route = annotation?.route ?? "chat";
        console.log(route)

        updateOrAppendAssistantMessage(setDbMessages, text, route);

        if (activeConversationId) {
          await appendMessageToConversation(activeConversationId, {
            sender: "assistant",
            text,
            route,
          });
        }

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

  useEffect(() => {
    if (isLoading) {
      const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant");
      if (lastAssistantMsg) {
        updateOrAppendAssistantMessage(setDbMessages, lastAssistantMsg.content);
      } else {
        updateOrAppendAssistantMessage(setDbMessages, ""); // placeholder bubble
      }
    }
  }, [messages, isLoading]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: messages dependency is needed for scroll behavior
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dbMessages]);

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
    messages.length = 0;
    e.preventDefault();
    if (!input.trim() || !activeConversationId) return;

    const text = input.trim();
    setInput("");

    const userMessage: DBMessage = {
      id: Date.now(),
      sender: "user",
      text,
    };
    setDbMessages((prev) => [...prev, userMessage]);

    try {
      await appendMessageToConversation(activeConversationId, { sender: "user", text });
    } catch (err) {
      console.error("Failed to persist user message:", err);
    }

    await append(
      { role: "user", content: text },
      { body: { conversationId: activeConversationId } }
    );
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
        <Sidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onNewChat={newChat}
          onLogout={handleLogout}
          onLoadConversation={handleLoadConversation}
        />

        {confirmClearOpen && (
          <DialogBox
            title="Are you sure?"
            message="Clear the conversation, you will. Certain, are you?"
            confirmText="Clear"
            cancelText="Cancel"
            onCancel={() => setConfirmClearOpen(false)}
            onConfirm={async () => {
              if (activeConversationId) {
                await clearConversation(activeConversationId);
                setDbMessages([]);
              }
              setConfirmClearOpen(false);
            }}
          />
        )}

        {/* Chat Area */}
        <ChatArea
          activeConversationId={activeConversationId}
          dbMessages={dbMessages}
          input={input}
          setInput={setInput}
          onSubmit={onSubmit}
          onToggleRecording={toggleRecording}
          recording={recording}
          onClear={() => setConfirmClearOpen(true)}
          messagesEndRef={messagesEndRef}
        />
      </div>
    </main>
  );
}