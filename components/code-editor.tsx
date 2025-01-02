"use client";

import React, { useRef, useCallback, useState, useEffect, use } from "react";
import Editor from "react-simple-code-editor";
import { DiffEditor } from "@monaco-editor/react";
import Prism from "prismjs";
import "prismjs/components/prism-python";
import "prismjs/components/prism-markup";
import "prismjs/themes/prism-tomorrow.css";
import OpenAI from "openai";
import { Send } from "lucide-react";

import { Sidebar } from "./sidebar";
import { Tabs } from "./tabs";
import { useEditor, EditorContextType } from "../context/editor-context";
import { EditorProvider } from "../context/editor-context";
import { RightSidebar } from "./right-sidebar";
import { EngineerAssistant } from "../helpers/prompts";
import { set } from "zod";

interface CodeEditorContentProps {
  setAllContentWithTabNames: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
}

const OpenAIClient = new OpenAI({
  baseURL: process.env.NEXT_PUBLIC_LLM_FIM_URL + "/beta",
  apiKey: process.env.NEXT_PUBLIC_LLM_API_TOKEN,
  dangerouslyAllowBrowser: true,
});

const CodeEditorContent: React.FC<CodeEditorContentProps> = ({
  setAllContentWithTabNames,
}) => {
  const { tabs, activeTab, setTabs }: EditorContextType = useEditor();
  const activeContent = tabs.find((tab) => tab.id === activeTab);
  const [code, setCode] = useState("");
  const [autocomplete, setAutocomplete] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  const [highlightedCode, setHighlightedCode] = useState("");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [showDiff, setShowDiff] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState("");
  const [pagePrompt, setPagePrompt] = useState("");

  const updateCursorAndSelection = (target: HTMLTextAreaElement) => {
    setCursorPosition(target.selectionStart);
    setSelectionStart(target.selectionStart);
    setSelectionEnd(target.selectionEnd);
    setHighlightedCode(
      target.value.slice(target.selectionStart, target.selectionEnd)
    );
  };

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

  useEffect(() => {
    if (activeContent) {
      setAllContentWithTabNames((prev) => ({
        ...prev,
        [activeContent.path]: activeContent.content,
      }));
    }

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
  }, [activeContent, tabs, setAllContentWithTabNames]);

  useEffect(() => {
    if (activeContent) {
      setPrefix("");
      setSuffix("");
      setAutocomplete("");
      setCode(activeContent.content);
    } else {
      setPrefix("");
      setSuffix("");
      setAutocomplete("");
      setCode("");
    }
  }, [activeContent]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (activeContent && newCode !== activeContent.content) {
      const updatedTabs = tabs.map((tab) =>
        tab.id === activeTab
          ? { ...tab, isUnsaved: true, content: newCode }
          : tab
      );
      setTabs(updatedTabs);
    }
  };

  const codeUpdate = useCallback(async () => {
    const textToProcess = code;
    const pagePromptText = pagePrompt;
    setHighlightedCode(textToProcess.slice(selectionStart, selectionEnd));
    const highlightedCode = textToProcess.slice(selectionStart, selectionEnd);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    let prompt =
      EngineerAssistant +
      "\nAssume the import of functions and other varibles exist in the repo and focus on the code in the file only.\n" +
      "\nUse the highlighted code and the comment to update the code.\n" +
      "\nTake your time and focus on the user comment for the code update.\n" +
      "\nBased on the changes needed for the user, update other code in the document to make the user comment work.\n" +
      "\nHighlighted Code:\n" +
      highlightedCode +
      "\nUser Comment:\n" +
      pagePromptText +
      "\nOnly return code on the complete file. Do not include code boxes.";

    try {
      const response = await OpenAIClient.completions.create({
        model: "deepseek-chat",
        prompt: prompt + "\n```\n",
        suffix: " ",
        max_tokens: 1024,
        temperature: 0,
        stream: true,
        stop: ["```"],
      });

      let accumulatedResponse = "";

      setShowDiff(true);

      let returnedContex = "";
      for await (const chunk of response) {
        returnedContex = chunk.choices[0]?.text || "";
        accumulatedResponse += returnedContex;
        setAiSuggestions(accumulatedResponse);
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        console.log("Request cancelled");
      } else {
        console.error("Error fetching autocomplete:", error);
      }
    }
  }, [code, activeContent, pagePrompt, highlightedCode]);

  const getAutocomplete = useCallback(async () => {
    const textToProcess = code;

    setPrefix(textToProcess.slice(0, cursorPosition));
    const prefix = textToProcess.slice(0, cursorPosition);
    setSuffix(textToProcess.slice(cursorPosition));
    const suffix = textToProcess.slice(cursorPosition);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      const response = await OpenAIClient.completions.create({
        model: "deepseek-chat",
        prompt: EngineerAssistant + "\n" + prefix,
        suffix: suffix || " ",
        max_tokens: 1024,
        temperature: 0,
        stream: true,
      });

      let accumulatedResponse = "";

      for await (const chunk of response) {
        accumulatedResponse += chunk.choices[0]?.text;
        setAutocomplete(accumulatedResponse);
        setCode(prefix + accumulatedResponse + suffix);
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        console.log("Request cancelled");
      } else {
        console.error("Error fetching autocomplete:", error);
      }
    }
  }, [code, cursorPosition]);

  const highlightWithLineNumbers = (input: string) =>
    Prism.highlight(input, Prism.languages.python, "python")
      .split("\n")
      .map((line: string) => `${line}`)
      .join("\n");

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement | HTMLTextAreaElement>) => {
      if (e.key === "Tab" && autocomplete) {
        e.preventDefault();
        const newCode = prefix + autocomplete + suffix;
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
        if (e.key === "z" || e.key === "Z" || e.key === "y" || e.key === "Y") {
          setAutocomplete("");
          setPrefix("");
          setSuffix("");
        }
      } else if (e.key === "Escape") {
        setAutocomplete("");
        setPrefix("");
        setSuffix("");
        setCode(prefix + suffix);
      }
    },
    [
      autocomplete,
      getAutocomplete,
      activeContent,
      activeTab,
      tabs,
      setTabs,
      prefix,
      suffix,
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
    <>
      <div className="flex-1 overflow-auto p-4 relative">
        {showDiff ? (
          <DiffEditor
            height="100%"
            original={code}
            modified={aiSuggestions}
            language="python"
            theme="vs-dark"
            options={{
              readOnly: true,
              renderSideBySide: true,
              diffWordWrap: "on",
            }}
          />
        ) : (
          <>
            <Editor
              value={code}
              onValueChange={handleCodeChange}
              highlight={highlightWithLineNumbers}
              onKeyDown={handleKeyDown}
              onKeyUp={handleCursorMove}
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
              className="min-h-full bg-gray-900 text-gray-300 [&_.editorLineNumber]:inline-block [&_.editorLineNumber]:w-[2em] [&_.editorLineNumber]:mr-4 [&_.editorLineNumber]:text-gray-500"
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
            {highlightedCode && (
              <div
                className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none"
                style={{
                  fontFamily: '"Fira code", "Fira Mono", monospace',
                  fontSize: 14,
                  lineHeight: "1.5",
                  padding: "1rem",
                  whiteSpace: "pre-wrap",
                  color: "transparent", // Make the base text transparent
                }}
              >
                <span style={{ color: "transparent" }}>
                  {code.slice(0, selectionStart)}
                </span>
                <span
                  className="bg-purple-700"
                  style={{ color: "rgb(209 213 219)" }}
                >
                  {highlightedCode}
                </span>
                <span style={{ color: "transparent" }}>
                  {code.slice(selectionEnd)}
                </span>
              </div>
            )}
          </>
        )}
      </div>
      {showDiff && (
        <div className="mt-4 flex justify-end space-x-2">
          <button
            onClick={() => setShowDiff(false)}
            className="px-4 py-2 rounded-md text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors duration-200"
          >
            Keep Original
          </button>
          <button
            onClick={() => {
              setCode(aiSuggestions);
              setHighlightedCode("");
              setShowDiff(false);
            }}
            className="px-4 py-2 rounded-md text-sm bg-green-600 hover:bg-green-500 text-white transition-colors duration-200"
          >
            Accept AI Suggestion
          </button>
        </div>
      )}
      <div className="w-full h-16 flex items-center px-4 border-t border-gray-700">
        <div className="flex w-full gap-2">
          <input
            type="text"
            value={pagePrompt}
            placeholder="Ask about the highlighted code..."
            className="w-full h-10 px-4 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 text-gray-300"
            onChange={(e) => {
              setPagePrompt(e.target.value);
            }}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                codeUpdate();
              }
            }}
          />
          <button
            className="h-10 px-4 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 focus:outline-none focus:border-blue-500"
            onClick={() => codeUpdate()}
          >
            <Send size={20} className="mr-2" />
          </button>
        </div>
      </div>
    </>
  );
};

const CodeEditor: React.FC = () => {
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
};

export default CodeEditor;
