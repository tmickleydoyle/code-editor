import { useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function useChatHistory() {
  const [chatHistory, setChatHistory] = useState<Message[]>([]);

  const addMessage = (role: "user" | "assistant", content: string) => {
    setChatHistory((prevHistory) => [...prevHistory, { role, content }]);
  };

  const clearHistory = () => {
    setChatHistory([]);
  };

  return { chatHistory, addMessage, clearHistory };
}
