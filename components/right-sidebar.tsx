"use client";

import React, { useRef, useCallback, useState, useEffect } from "react";

import { ArrowLeft, ArrowRight } from "lucide-react";

interface RightSidebarProps {
  allContentWithTabNames: Record<string, string>;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  allContentWithTabNames,
}) => {
  const [searchValue, setSearchValue] = useState("/review");
  const [isOpen, setIsOpen] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSearch = async () => {
    // Added async here
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    let blinkInterval: NodeJS.Timeout | null = null;

    const startBlinking = () => {
      blinkInterval = setInterval(() => {
        setResponse((prev) => (prev === null ? "Found" : null));
      }, 500);
    };

    const stopBlinking = () => {
      if (blinkInterval) {
        clearInterval(blinkInterval);
        blinkInterval = null;
      }
    };

    startBlinking();

    try {
      const resp = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "hf.co/tmickleydoyle/Qwen2.5-Coder-7B-Instruct.gguf",
          prompt: ``,
          system: `
                        You are a staff engineering manager.
                        Provide feedback on the following code snippet based on the prompt and the context
                    `,
          options: {
            temperature: 0,
          },
        }),
        signal: abortControllerRef.current.signal,
      });

      // Handle the response here if needed
      stopBlinking();
    } catch (err) {
      console.error("Failed to fetch repository contents", err);
      stopBlinking();
      setResponse("Failed to fetch repository contents");
    }
  };

  const allContent = Object.entries(allContentWithTabNames).reduce(
    (acc, [tabName, content]) => {
      return `${acc}Filename: ${tabName}\nContent: ${content}\n\n`;
    },
    ""
  );

  return (
    <>
      <div
        className={`fixed w-[33%] bg-gray-800 flex flex-col h-full transition-all duration-300 ${
          isOpen ? "right-0" : "right-[-33%]"
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
            placeholder="Search"
            className="bg-gray-700 text-gray-200 p-2 rounded w-full"
          />
        </div>
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <button
            onClick={handleSearch}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full"
          >
            Search
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {Object.entries(allContentWithTabNames).map(
            ([tabName, content], index) => (
              <div key={index} className="mb-6">
                <h3 className="text-gray-200 font-medium mb-2">
                  {tabName.length > 40 ? `...${tabName.slice(-40)}` : tabName}
                </h3>
                <pre className="bg-gray-700 p-3 rounded text-gray-200 text-sm whitespace-pre-wrap">
                  {content}
                </pre>
              </div>
            )
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
    </>
  );
};
