"use client";

import React, { useRef, useCallback, useState, useEffect } from "react";
import Editor from "react-simple-code-editor";
import { Sidebar } from "./sidebar";

interface EditorRefType {
  textareaRef: HTMLTextAreaElement;
}
import Prism from "prismjs";
import "prismjs/components/prism-python";
import "prismjs/components/prism-markup";
import "prismjs/themes/prism-tomorrow.css";
import { Tabs } from "./tabs";
import { useEditor, EditorContextType } from "../context/editor-context";
import { EditorProvider } from "../context/editor-context";

function CodeEditorContent() {
  const { tabs, activeTab, setTabs }: EditorContextType = useEditor();
  const activeContent = tabs.find((tab) => tab.id === activeTab);
  const [code, setCode] = useState("");
  const [autocomplete, setAutocomplete] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const editorRef = useRef<{ session: { history: History } } | null>(null);

  // Update code when active tab changes
  useEffect(() => {
    if (activeContent) {
      setCode(activeContent.content);
    } else {
      setCode("");
    }
  }, [activeContent]);

  // Track unsaved changes
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (activeContent && newCode !== activeContent.content) {
      const updatedTabs = tabs.map((tab) =>
        tab.id === activeTab
          ? { ...tab, isUnsaved: true, content: newCode }
          : tab
      );
      // Update the tabs state in context
      setTabs(updatedTabs);
    }
  };

  const getSelectedText = () => {
    const textarea = editorRef.current as unknown as { textareaRef: HTMLTextAreaElement };
    if (textarea?.textareaRef) {
      const { selectionStart, selectionEnd } = textarea.textareaRef;
      return code.slice(selectionStart, selectionEnd);
    }
    return "";
  };

  const getAutocomplete = useCallback(async () => {
    const selectedText = getSelectedText();
    const textToProcess = selectedText || code;;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
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
          model: "qwen2.5-coder:32b",
          prompt: `
          <|fim_prefix|>Update the following code in the editor for Python.
          Show an example of how to run it.
          Only return code.<|fim_suffix|><|fim_middle|>${textToProcess}
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
        let countCodeBlocks = 0;

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            accumulatedResponse += data["response"];
            if (data["response"] === "```") {
              countCodeBlocks += 1;
            }
            if (countCodeBlocks >= 2) {
              break;
            }
            setAutocomplete(
              accumulatedResponse + "\n" + "(Press Tab to merge)"
            );
          } catch (e) {
            console.error("Error parsing JSON:", e);
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        console.log("Request cancelled");
      } else {
        console.error("Error fetching autocomplete:", error);
      }
    }
  }, [code]);

  const highlightWithLineNumbers = (input: string) =>
    Prism.highlight(input, Prism.languages.python, "python")
      .split("\n")
      .map((line: string) => `${line}`)
      .join("\n");

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement | HTMLTextAreaElement>) => {
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
        const finalCode = lines.join("\n");

        const selectedText = getSelectedText();
        if (selectedText) {
          const textarea = (editorRef.current as unknown as EditorRefType)?.textareaRef;
          if (textarea) {
            const newCode =
              code.slice(0, textarea.selectionStart) +
              finalCode +
              code.slice(textarea.selectionEnd);
            setCode(newCode);
          }
        } else {
          setCode(finalCode);
        }
        setAutocomplete("");
      } else if (e.key === "Escape") {
        setAutocomplete("");
      } else if (e.key === "Alt") {
        e.preventDefault();
        getAutocomplete();
      }
    },
    [autocomplete, getAutocomplete]
  );

  if (!activeTab) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        Open a file from the sidebar to start editing
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4 relative">
      <Editor
        value={code}
        onValueChange={handleCodeChange}
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
            color: "rgba(156, 163, 175, 0.5)",
          }}
        >
          {code + "\n" + autocomplete}
        </div>
      )}
    </div>
  );
}

export default function CodeEditor() {
  return (
    <EditorProvider>
      <div className="flex h-screen bg-gray-900 text-gray-300">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Tabs />
          <CodeEditorContent />
        </div>
      </div>
    </EditorProvider>
  );
}
