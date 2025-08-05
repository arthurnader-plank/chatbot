"use client";

// React and Next.js libraries
// Absolute imports from custom modules
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  sender: string;
  text: string;
  route?: string;
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
  const [messages, setMessages] = useState<DBMessage[]>([]);
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

      if (!user) {
        console.log("No user logged in");
        return;
      }
      
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


  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeConversationId) return;
  
    // --- 1. Add user message to UI and DB ---
    const userMessage = { id: Date.now(), sender: "user", text: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    await appendMessageToConversation(activeConversationId, {
      sender: "user",
      text: input.trim(),
    });
  
    setInput("");
  
    try {
      // --- 2. Call server API route ---
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversationId,
        }),
      }).then((res) => res.json());
  
      if (response.error) {
        console.error("Chat error:", response.error);
        return;
      }
  
      // --- 3. Add bot message to UI and DB ---
      const botMessage = { id: Date.now() + 1, sender: "bot", text: response.output, route: response.route };
      setMessages((prev) => [...prev, botMessage]);
      await appendMessageToConversation(activeConversationId, {
        sender: "bot",
        text: response.output,
        route: response.route,
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
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
      setActiveConversationId(conversation.id);
  
      // Reset local chat messages for this conversation
      setMessages([]);
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
      (conversation.messages || []).map((m: DBMessage, i: number) => ({
        id: i,
        sender: m.sender,
        text: m.text,
        route: m.route,
      }))
    );
  };
  

  return (
    <main className="flex h-screen w-full bg-[#fff5f5] p-4">
      <div className="flex flex-1 bg-[#fff5f5] rounded-lg shadow">
        {/* Sidebar */}
        <aside className="w-64 bg-[#450f01] p-4 hidden md:flex flex-col rounded-lg shadow h-full text-white">
          <div className="flex space-x-2 mb-4">
            <button
              type="button"
              onClick={newChat}
              className="px-3 py-2 bg-[#9a3015] text-white rounded hover:bg-[#9a3015]"
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
                        : "bg-[#fff5f5] text-black hover:bg-[#82def9]"
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
            {messages.map((msg) => (
              <div
                key={msg.id}
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
                      ? "bg-[#82def9] text-black"
                      : "bg-[#fff5f5] text-black border border-[#9a3015]"
                  }`}
                >
                  {msg.text}
                </span>
              </div>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="flex p-2 space-x-2 mt-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border border-[#9a3015] rounded-xl focus:outline-none focus:ring focus:ring-[#82def9] text-black"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#9a3015] text-white rounded hover:bg-[#9a3015]"
            >
              Send
            </button>
            {activeConversationId && (
              <button
                type="button"
                onClick={async () => {
                  await clearConversation(activeConversationId);
                  setMessages([]);
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