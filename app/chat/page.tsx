"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { fetchUserConversations, createNewConversation, loadConversation, updateConversation } from "@/lib/chats";

interface Message {
  id: number;
  sender: "user" | "bot";
  text: string;
}

interface Conversation {
    id: string;
    title: string;
    created_at: string;
  }

export default function ChatPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: "bot", text: "Hello! How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Check authentication on component mount
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
      console.log(user.id);
      if (!user) return;

      try {
        const conversations = await fetchUserConversations(user.id);
        setConversations(conversations?? []);
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

  useEffect(() => {
    if (!activeConversationId) return; // No conversation selected yet
    if (messages.length === 0) return; // Nothing to save
  
    const syncMessages = async () => {
      try {
        // Remove local-only `id` (optional)
        const formattedMessages = messages.map(({ sender, text }) => ({
          sender,
          text,
          timestamp: new Date().toISOString(),
        }));
  
        await updateConversation(activeConversationId, formattedMessages);
      } catch (error) {
        console.error("Failed to update conversation:", error);
      }
    };
  
    syncMessages();
  }, [messages, activeConversationId]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
  
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: "user", text: input.trim() }
    ]);
  
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: "bot", text: "This is a bot reply." }
      ]);
    }, 600);
  
    setInput("");
  };
  

  const newChat = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("You must be logged in to create a new conversation.");
        return;
      }
      const conversation = await createNewConversation(user.id);
      console.log("New conversation created:", conversation);

      // Update sidebar conversations list
      setConversations((prev) => [conversation, ...prev]);
  
      // Reset local chat messages for this conversation
      setMessages([{ id: Date.now(), sender: "bot", text: "New chat started." }]);
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  if (loading) {
    return <p className="text-center mt-10">Checking authentication...</p>;
  }

  const handleLoadConversation = async (conversationId: string) => {
    setActiveConversationId(conversationId);
    const conversation = await loadConversation(conversationId);
    setMessages(
      (conversation.messages || []).map((m: any, i: number) => ({
        id: i,
        sender: m.sender,
        text: m.text,
      }))
    );
  };
  

  return (
    <main className="flex min-h-screen">
      <aside className="w-64 bg-gray-200 p-4 hidden md:flex flex-col">
        <div className="flex space-x-2 mb-4">
          <button
            onClick={newChat}
            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + New Chat
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-2 bg-red-400 text-white rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
        <h2 className="font-bold mb-4 text-black">Previous Chats</h2>
        <div className="space-y-2">
          {conversations.length > 0 ? (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className="p-2 bg-white rounded shadow hover:bg-gray-100  text-black cursor-pointer"
                onClick={() => handleLoadConversation(conv.id)}
              >
                {conv.title}
              </div>
            ))
          ) : (
            <p className="text-sm text-black">No previous conversations</p>
          )}
        </div>
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
                    ? "bg-blue-200 text-black"
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
