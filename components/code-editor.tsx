"use client";

import React, { useRef, useCallback, useState, useEffect } from "react";
import Editor from "react-simple-code-editor";
import { Sidebar } from "./sidebar";
import Prism from "prismjs";
import "prismjs/components/prism-python";
import "prismjs/components/prism-markup";
import "prismjs/themes/prism-tomorrow.css";
import { Tabs } from "./tabs";
import { useEditor, EditorContextType } from "../context/editor-context";
import { EditorProvider } from "../context/editor-context";
import { RightSidebar } from "./right-sidebar";

interface EditorRefType {
  textareaRef: HTMLTextAreaElement;
}

function CodeEditorContent({
  setAllContentWithTabNames,
}: {
  setAllContentWithTabNames: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
}) {
  const { tabs, activeTab, setTabs }: EditorContextType = useEditor();
  const activeContent = tabs.find((tab) => tab.id === activeTab);
  const [code, setCode] = useState("");
  const [autocomplete, setAutocomplete] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const editorRef = useRef<{ session: { history: History } } | null>(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [highlighted, setHighlighted] = useState("");

  const handleInputChange = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    updateCursorAndSelection(target);
  };

  const handleCursorMove = (
    e:
      | React.MouseEvent<HTMLTextAreaElement>
      | React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    const target = e.target as HTMLTextAreaElement;
    updateCursorAndSelection(target);
  };

  const updateCursorAndSelection = (target: HTMLTextAreaElement) => {
    setCursorPosition(target.selectionStart);
    setSelectionStart(target.selectionStart);
    setSelectionEnd(target.selectionEnd);
  };

  // Gather all content with tab names as they are opened
  useEffect(() => {
    // Update content when tab changes
    if (activeContent) {
      setAllContentWithTabNames((prev) => ({
        ...prev,
        [activeContent.path]: activeContent.content,
      }));
    }

    // Remove content for closed tabs
    setAllContentWithTabNames((prev) => {
      const currentTabNames = tabs.map((tab) => tab.path);
      const newContent = { ...prev };
      Object.keys(newContent).forEach((name) => {
        if (!currentTabNames.includes(name)) {
          delete newContent[name];
        }
      });
      return newContent;
    });
  }, [activeContent, tabs, setAllContentWithTabNames, setTabs]);

  // Update code when active tab changes
  useEffect(() => {
    if (activeContent) {
      setCode(activeContent.content);
    } else {
      setCode("");
    }
  }, [activeContent, setCode]);

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

  const getAutocomplete = useCallback(async () => {
    const textToProcess = await code;

    await setPrefix(textToProcess.slice(0, cursorPosition));
    const prefix = await textToProcess.slice(0, cursorPosition);
    await setSuffix(textToProcess.slice(cursorPosition));
    const suffix = await textToProcess.slice(cursorPosition);
    console.log("Code:", code);
    console.log("cursorPosition", cursorPosition);
    console.log("prefix", prefix);
    console.log("suffix", suffix);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      let body;

      body = {
        model: "hf.co/tmickleydoyle/Qwen2.5-Coder-7B-Instruct.gguf:latest",
        prompt: prefix,
        suffix: suffix + " ",
        system:
          "Write python code. you are an AI autocompleter. complete the code based on the prompt.",
        options: {
          temperature: 0.1,
        },
      };
      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: abortControllerRef.current.signal,
      });

      const reader = response.body?.getReader();
      if (!reader) return;

      let accumulatedResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            const generatedCode = data["response"];

            accumulatedResponse += generatedCode;

            // Update UI with the new code
            await setAutocomplete(accumulatedResponse);
            await setCode(prefix + accumulatedResponse + suffix);
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

        let newCode: string;
        newCode = prefix + autocomplete + suffix;
        setCode(newCode);
        if (activeContent) {
          const updatedTabs = tabs.map((tab) =>
        tab.id === activeTab
          ? { ...tab, isUnsaved: true, content: newCode }
          : tab
          );
          setTabs(updatedTabs);
        }

        setAutocomplete("");
        setPrefix("");
        setSuffix("");
      } else if (e.key === "Alt") {
        e.preventDefault();
        getAutocomplete();
      } else if (e.metaKey || e.ctrlKey) {
        if (e.key === "z" || e.key === "Z") {
          setAutocomplete("");
          setPrefix("");
          setSuffix("");
        } else if (e.key === "y" || e.key === "Y") {
          setAutocomplete("");
          setPrefix("");
          setSuffix("");
        }
      }
    },
    [
      autocomplete,
      getAutocomplete,
      activeContent,
      activeTab,
      tabs,
      setTabs,
      code,
    ]
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
        onKeyUp={handleCursorMove}
        onClick={handleCursorMove}
        onSelect={handleCursorMove}
        onChange={handleInputChange}
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
          <span>{prefix}</span>
          <span className="bg-gray-900">{autocomplete}</span>
          <span>{suffix}</span>
        </div>
      )}
    </div>
  );
}

export default function CodeEditor() {
  const [allContentWithTabNames, setAllContentWithTabNames] = useState<
    Record<string, string>
  >({});

  return (
    <EditorProvider>
      <div className="flex h-screen bg-gray-900 text-gray-300">
        <div className="flex">
          <Sidebar />
          <div
            className="w-1 cursor-col-resize hover:bg-gray-600 active:bg-gray-500"
            onMouseDown={(e) => {
              const startX = e.pageX;
              const sidebarElement = e.currentTarget
                .previousElementSibling as HTMLElement;
              const initialWidth = sidebarElement?.clientWidth ?? 0;

              const onMouseMove = (e: MouseEvent) => {
                if (sidebarElement) {
                  const newWidth = initialWidth + (e.pageX - startX);
                  sidebarElement.style.width = `${Math.max(
                    200,
                    Math.min(600, newWidth)
                  )}px`;
                }
              };

              const onMouseUp = () => {
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
              };

              document.addEventListener("mousemove", onMouseMove);
              document.addEventListener("mouseup", onMouseUp);
            }}
          />
        </div>
        <RightSidebar allContentWithTabNames={allContentWithTabNames} />
        <div className="flex-1 flex flex-col">
          <Tabs />
          <CodeEditorContent
            setAllContentWithTabNames={setAllContentWithTabNames}
          />
        </div>
      </div>
    </EditorProvider>
  );
}
