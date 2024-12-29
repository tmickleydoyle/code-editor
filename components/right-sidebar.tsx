"use client";

import React, { useRef, useCallback, useState } from "react";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

import { EngineerAssistant } from "../helpers/prompts";
import { useChatHistory } from "../helpers/chat-history-manager";

const CodeFileChange = z.object({
  summary_of_changes: z.string(),
  code_updates: z.array(
    z.object({
      filepath: z.string(),
      code: z.string(),
    })
  ),
});

const CodeSummary = z.object({
  summary_of_changes: z.string(),
  code_updates: z.array(
    z.object({
      filepath: z.string(),
      sunmary_of_code: z.string(),
    })
  ),
});

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
            `filepath: ${tabName}\n\ncontent: ${content}\n\n`
        )
        .join("");
    }

    try {
      let promptContent = searchValue;
      let responseFormat: z.ZodTypeAny = CodeFileChange;

      if (searchValue.startsWith("/update")) {
        promptContent =
          fileContent +
          "\n\nIf there are filepaths and content above, consider them in the response. \n\n" +
          searchValue.replace("/update", "");
      }

      if (searchValue.startsWith("/new")) {
        promptContent =
          "\n\nCreate a new application in a new directory. \n\n" +
          searchValue.replace("/new", "");
      }

      if (searchValue.startsWith("/summary")) {
        promptContent =
          fileContent +
          "\n\nSummarize the code. \n\n" +
          searchValue.replace("/summary", "");
        responseFormat = CodeSummary;
      }

      addMessage("user", searchValue);

      const resp = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "hf.co/tmickleydoyle/Qwen2.5-Coder-7B-Instruct.gguf:latest",
          messages: [
            { role: "system", content: EngineerAssistant },
            ...chatHistory,
            { role: "user", content: promptContent },
          ],
          format: zodToJsonSchema(responseFormat),
          stream: false,
          options: {
            temperature: 0.2,
          },
        }),
        signal: abortControllerRef.current.signal,
      });

      setIsLoading(false);
      setResponse(null);

      const reader = resp.body?.getReader();
      if (!reader) {
        setResponse("No response body available.");
        return;
      }

      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        fullResponse += chunk;
      }

      try {
        const parsedResponse = JSON.parse(fullResponse);
        setResponse(parsedResponse.message.content);
        addMessage("assistant", parsedResponse.message.content);
      } catch (e) {
        console.error("Error parsing JSON response:", e);
        setResponse(fullResponse);
        addMessage("assistant", fullResponse);
      }
    } catch (err) {
      if (err.name === "AbortError") {
        console.log("Request aborted");
      } else {
        console.error("Failed to fetch repository contents", err);
        setResponse("Failed to fetch repository contents");
      }
    }
  }, [searchValue, chatHistory, addMessage]);

  return (
    <div
      className={`fixed w-[50%] bg-gray-800 flex flex-col h-full transition-all duration-300 ${
        isOpen ? "right-0" : "right-[-50%]"
      } top-0 border-l border-gray-700 z-50`}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-sm font-medium text-gray-200">Code Assistant</h2>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed right-0 top-4 bg-gray-800 p-2 rounded-l z-50"
        >
          {isOpen ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
        </button>
      </div>
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearch();
            }
          }}
          className="bg-gray-700 text-gray-200 p-2 rounded w-full"
        />
      </div>
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <button
          onClick={handleSearch}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full flex items-center justify-center"
          disabled={isLoading}
        >
          <Send size={20} className="mr-2" />
          Submit
        </button>
        <button
          onClick={clearHistory}
          className="bg-purple-400 hover:bg-purple-200 text-white px-4 py-2 rounded w-[25%] flex items-center justify-center"
        >
          Clear History
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {chatHistory.map((message, index) => (
          <div key={index} className="mb-4 text-left">
            <div
              className={`inline-block p-2 rounded-lg ${
                message.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-700 text-gray-200"
              }`}
            >
              {message.role === "assistant" ? (
                (() => {
                  try {
                    const parsed = JSON.parse(message.content);
                    return (
                      <>
                        <div className="mb-6">
                          <h3 className="text-gray-200 font-medium mb-2">
                            Summary of Changes
                          </h3>
                          <pre className="bg-gray-700 p-3 rounded text-gray-200 text-sm whitespace-pre-wrap">
                            {parsed.summary_of_changes}
                          </pre>
                        </div>
                        {parsed.code_updates?.map((update, index) => (
                          <div key={index} className="mb-6">
                            <h3 className="text-gray-200 font-medium mb-2">
                              {update.filepath}
                            </h3>
                            <pre className="bg-gray-700 p-3 rounded text-gray-200 text-sm whitespace-pre-wrap">
                              {update.code}
                            </pre>
                          </div>
                        ))}
                      </>
                    );
                  } catch (error) {
                    return (
                      <pre className="whitespace-pre-wrap">
                        {message.content}
                      </pre>
                    );
                  }
                })()
              ) : (
                <pre className="whitespace-pre-wrap">{message.content}</pre>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin w-6 h-6 text-blue-500"></div>
          </div>
        )}
      </div>

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed right-0 top-4 bg-gray-800 p-2 rounded-l z-50"
        >
          <ArrowLeft size={20} className="text-gray-200" />
        </button>
      )}
    </div>
  );
};
