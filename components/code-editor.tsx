"use client";

import React, { useState, useRef, useCallback } from "react";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-python";
import "prismjs/components/prism-markup";
import "prismjs/themes/prism-tomorrow.css";
import { Tabs } from "./tabs";

export default function CodeEditor() {
  const [code, setCode] = useState(``);
  const [autocomplete, setAutocomplete] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const editorRef = useRef<Editor | null>(null);

  const getAutocomplete = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    // set autocomplete while thinking to three blinking dots
    setAutocomplete("...");
    let blinkInterval: NodeJS.Timeout | null = null;

    const startBlinking = () => {
      blinkInterval = setInterval(() => {
        setAutocomplete((prev) => (prev === "..." ? "" : "..."));
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
      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "qwen2.5-coder:7b",
          // prompt: `${code}`,
          prompt: `
          <|fim_prefix|>Update the following code in the editor for Python.
          Show an example of how to run it.
          Only include code.<|fim_suffix|><|fim_middle|>${code}
          `,
          system: `
          Update the code and do not provide other information. This will happen directly in a code editor.
          `,
        }),
        signal: abortControllerRef.current.signal,
      });

      const reader = response.body?.getReader();
      if (!reader) return;

      stopBlinking();
      let accumulatedResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            console.log(data);
            accumulatedResponse += data["response"];
            setAutocomplete(
              accumulatedResponse + "\n" + "(Press Tab to merge)",
            );
          } catch (e) {
            console.error("Error parsing JSON:", e);
          }
        }
      }
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("Request cancelled");
      } else {
        console.error("Error fetching autocomplete:", error);
      }
    }
  }, [code]);

  const highlightWithLineNumbers = (input: string) =>
    Prism.highlight(input, Prism.languages.python, "python")
      .split("\n")
      .map((line: string, i: number) => `${line}`)
      .join("\n");

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab" && autocomplete) {
        e.preventDefault();
        const lines = autocomplete.split("\n");
        if (lines[0].trim() === "```python" || lines[0].trim() === "```") {
          lines.shift();
        }
        if (lines[lines.length - 2].trim() === "```") {
          lines.pop();
        }
        if (lines[lines.length - 1].trim() === "```") {
          lines.pop();
        }
        // add lines back to the code
        const finalCode = lines.join("\n");
        setCode(finalCode);
        setAutocomplete("");
      } else if (e.key === "Escape") {
        setAutocomplete("");
      } else if (e.key === "Alt") {
        e.preventDefault();
        getAutocomplete();
      }
    },
    [autocomplete, getAutocomplete],
  );

  return (
    <div className="flex h-screen bg-gray-900 text-gray-300">
      {/* <Sidebar /> */}
      <div className="flex-1 flex flex-col">
        <Tabs />
        <div className="flex-1 overflow-auto p-4 relative">
          <Editor
            ref={editorRef}
            value={code}
            onValueChange={(code) => setCode(code)}
            highlight={highlightWithLineNumbers}
            onKeyDown={handleKeyDown}
            padding={0}
            style={{
              fontFamily: '"Fira code", "Fira Mono", monospace',
              fontSize: 14,
              lineHeight: "1.5",
              overflow: "auto",
              margin: 0,
              position: "relative",
            }}
            textareaClassName="focus:outline-none"
            className="min-h-full bg-gray-900 text-gray-300 [&_.editorLineNumber]:inline-block [&_.editorLineNumber]:w-[2em] [&_.editorLineNumber]:text-right [&_.editorLineNumber]:mr-4 [&_.editorLineNumber]:text-gray-500"
          />
          {autocomplete && (
            <div
              className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none"
              style={{
                fontFamily: '"Fira code", "Fira Mono", monospace',
                fontSize: 14,
                lineHeight: "1.5",
                padding: "1rem",
                whiteSpace: "pre-wrap",
                color: "rgba(156, 163, 175, 0.5)", // Light shade of grey
              }}
            >
              {code + "\n" + autocomplete}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
