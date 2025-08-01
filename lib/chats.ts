import { supabase } from "@/lib/supabaseClient";

interface DBMessage {
  id: number;
  sender: string;
  text: string;
}

export async function createNewConversation(userId: string) {
  const { data, error } = await supabase
    .from("chats")
    .insert([{ 
      user_id: userId,
      title: "New Conversation",
      messages: [] 
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchUserConversations(userId: string) {
    const { data, error } = await supabase
      .from("chats")
      .select("id, title, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
  
    if (error) throw error;
    return data;
  }

  export async function updateConversationTitle(conversationId: string, title: string) {
    const { data, error } = await supabase
      .from("conversations")
      .update({ title })
      .eq("id", conversationId)
      .select()
      .single();
  
    if (error) throw error;
    return data;
  }


  export async function loadConversation(conversationId: string) {
    const { data, error } = await supabase
      .from("chats")
      .select("messages")
      .eq("id", conversationId)
      .single();
  
    if (error) throw error;
    return data;
  }

  export async function updateConversation(conversationId: string, messages: DBMessage[]) {
    const { data, error } = await supabase
      .from("chats")
      .update({ messages })
      .eq("id", conversationId)
      .select();
  
    if (error) throw error;
    return data;
  }

  export async function appendMessageToConversation(
    conversationId: string,
    newMessage: { sender: string; text: string, route?:string }
  ) {
    const { data, error } = await supabase
      .from("chats")
      .select("messages")
      .eq("id", conversationId)
      .single();
  
    if (error) throw error;
  
    const messages = data?.messages ?? [];
    const updatedMessages = [...messages, newMessage];
  
    const { error: updateError } = await supabase
      .from("chats")
      .update({ messages: updatedMessages })
      .eq("id", conversationId);
  
    if (updateError) throw updateError;
  
    return updatedMessages;
  }

  export async function clearConversation(conversationId: string) {
    const { data, error } = await supabase
      .from("chats")
      .update({ messages: [] })
      .eq("id", conversationId)
      .select()
      .single();
  
    if (error) throw error;
    return data;
  }