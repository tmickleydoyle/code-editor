"use client";

import React, { useRef, useCallback, useState } from "react";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";
import { z } from "zod";
import OpenAI from "openai";
import { memo } from "react";

import {
  EngineerAssistant,
  CodeChangeOutput,
  CodeSummaryOutput,
  generateArtifactPrompt,
} from "../helpers/prompts";
import { useChatHistory } from "../helpers/chat-history-manager";
import { GitHubMarkdown } from "../components/github-markdown";

const CodeFileChange = z.object({
  summary_of_changes: z.string(),
  code_updates: z.array(
    z.object({
      filepath: z.string(),
      code: z.string(),
    }),
  ),
});

const CodeSummary = z.object({
  summary_of_changes: z.string(),
  code_summaries: z.array(
    z.object({
      filepath: z.string(),
      summary: z.string(),
    }),
  ),
});

const OpenAIClient = new OpenAI({
  baseURL: process.env.NEXT_PUBLIC_LLM_FIM_URL || "",
  apiKey: process.env.NEXT_PUBLIC_LLM_API_TOKEN || "",
  dangerouslyAllowBrowser: true,
});

const MemoizedChatHistory = memo(({ chatHistory, response, isStream }) => (
  <>
    {chatHistory.map((message, index) => (
      <div
        key={index}
        className={`mb-4 ${message.role === "user" ? "text-right" : "text-left"}`}
      >
        <div
          className={`inline-block p-2 rounded-lg ${
            message.role === "user"
              ? "bg-blue-500 text-white ml-auto"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {message.role === "user" ? (
            <pre className="whitespace-pre-wrap">{message.content}</pre>
          ) : (
            <div className="w-full">
              <GitHubMarkdown
                content={
                  isStream && index === chatHistory.length - 1
                    ? (response ?? "")
                    : message.content
                }
              />
            </div>
          )}
        </div>
      </div>
    ))}
  </>
));

MemoizedChatHistory.displayName = "MemoizedChatHistory";

interface RightSidebarProps {
  allContentWithTabNames: Record<string, string>;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  allContentWithTabNames,
}) => {
  const [searchValue, setSearchValue] = useState("/update ");
  const [isOpen, setIsOpen] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { chatHistory, addMessage, clearHistory } = useChatHistory();
  const [isStream, setIsStream] = useState(false);

  const handleSearch = useCallback(async () => {
    setIsLoading(true);
    setResponse("loading...");
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    let fileContent = null;

    if (allContentWithTabNames) {
      fileContent = Object.entries(allContentWithTabNames)
        .map(
          ([tabName, content]) =>
            `filepath: ${tabName}\n\ncontent: ${content}\n\n`,
        )
        .join("");
    }

    try {
      let promptContent = searchValue;
      // let responseFormat: z.ZodTypeAny = CodeFileChange;

      if (searchValue.startsWith("/update")) {
        promptContent =
          fileContent +
          "\n\n" +
          CodeChangeOutput +
          "\n\n" +
          searchValue.replace("/update", "");
      }

      if (searchValue.startsWith("/new")) {
        promptContent =
          "\n\nCreate a new application in a new directory. \n\n" +
          CodeChangeOutput +
          "\n\n" +
          searchValue.replace("/new", "");
      }

      if (searchValue.startsWith("/summary")) {
        promptContent =
          fileContent +
          "\n\n" +
          CodeSummaryOutput +
          "\n\n" +
          searchValue.replace("/summary", "");
      }

      if (searchValue.startsWith("/new-artifact")) {
        promptContent = generateArtifactPrompt(
          searchValue.replace("/artifact", ""),
        );
      }

      addMessage("user", searchValue);

      const messageResponse = await OpenAIClient.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: EngineerAssistant },
          ...chatHistory,
          { role: "user", content: promptContent },
        ],
        stream: true,
        temperature: 0,
      });

      setIsStream(true);
      let fullResponse = "";
      for await (const chunk of messageResponse) {
        const content = chunk.choices[0].delta.content || "";
        fullResponse += content;
        setResponse((prev) =>
          prev === "loading..." ? content : prev + content,
        );
      }
      addMessage("assistant", fullResponse);
      setIsStream(false);
      setIsLoading(false);
    } catch (err) {
      if (err.name === "AbortError") {
        console.log("Request aborted");
      } else {
        console.error("Failed to fetch repository contents", err);
        setResponse("Failed to fetch repository contents");
      }
    }
  }, [searchValue, chatHistory, addMessage, allContentWithTabNames]);

  return (
    <div
      className={`fixed w-[50%] bg-white flex flex-col h-full transition-all duration-300 ${
        isOpen ? "right-0" : "right-[-50%]"
      } top-0 border-l border-gray-200 z-50 shadow-lg`}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-sm font-medium text-gray-800">Code Assistant</h2>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed right-0 top-4 bg-white p-2 rounded-l z-50 shadow-md"
        >
          {isOpen ? (
            <ArrowRight size={20} className="text-gray-600" />
          ) : (
            <ArrowLeft size={20} className="text-gray-600" />
          )}
        </button>
      </div>
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearch();
            }
          }}
          className="bg-gray-100 text-gray-800 p-2 rounded w-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <button
          onClick={handleSearch}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full flex items-center justify-center transition duration-200 ease-in-out"
          disabled={isLoading}
        >
          <Send size={20} className="mr-2" />
          Submit
        </button>
        <button
          onClick={clearHistory}
          className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded w-[25%] flex items-center justify-center ml-2 transition duration-200 ease-in-out"
        >
          Clear History
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <MemoizedChatHistory
          chatHistory={chatHistory}
          response={response}
          isStream={isStream}
        />
        {isLoading && (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin w-6 h-6 text-blue-500"></div>
          </div>
        )}
      </div>

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed right-0 top-4 bg-white p-2 rounded-l z-50 shadow-md"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
      )}
    </div>
  );
};
