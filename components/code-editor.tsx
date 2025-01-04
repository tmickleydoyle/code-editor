"use client";

import React, { useRef, useCallback, useState, useEffect } from "react";
import { DiffEditor, Editor } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import Prism from "prismjs";
import "prismjs/components/prism-python";
import "prismjs/components/prism-markup";
import "prismjs/themes/prism.css";
import OpenAI from "openai";
import { Send } from "lucide-react";

import { Sidebar } from "./sidebar";
import { Tabs } from "./tabs";
import { useEditor, EditorContextType } from "../context/editor-context";
import { EditorProvider } from "../context/editor-context";
import { RightSidebar } from "./right-sidebar";
import { EngineerAssistant } from "../helpers/prompts";
import { editor } from "monaco-editor";

interface CodeEditorContentProps {
  setAllContentWithTabNames: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
}

const OpenAIClient = new OpenAI({
  baseURL: process.env.NEXT_PUBLIC_LLM_FIM_URL + "/beta" || "",
  apiKey: process.env.NEXT_PUBLIC_LLM_API_TOKEN || "",
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
  const [tabContents, setTabContents] = useState<Record<string, string>>({});

  useEffect(() => {
    if (activeContent) {
      setTabContents((prev) => ({
        ...prev,
        [activeContent.id]: activeContent.content,
      }));
    }
  }, [activeContent]);

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const updateCursorAndSelection = useCallback(() => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    const model = editor.getModel();
    const selection = editor.getSelection();

    if (model && selection) {
      const startPosition = model.getOffsetAt(selection.getStartPosition());
      const endPosition = model.getOffsetAt(selection.getEndPosition());
      const selectedText = model.getValueInRange(selection);

      setCursorPosition(startPosition);
      setSelectionStart(startPosition);
      setSelectionEnd(endPosition);
      setHighlightedCode(selectedText);
    }
  }, []);

  const handleInputChange = (value: string | undefined) => {
    if (value === undefined) return;
    setCode(value);
    if (editorRef.current) {
      updateCursorAndSelection();
    }
  };

  const handleCursorMove = () => {
    if (editorRef.current) {
      updateCursorAndSelection();
    }
  };

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;

    editor.onDidChangeCursorSelection(() => {
      handleCursorMove();
    });
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
      // If we have stored content for this tab, use it
      if (tabContents[activeContent.id]) {
        setCode(tabContents[activeContent.id]);
      } else {
        setCode(activeContent.content);
      }
      setPrefix("");
      setSuffix("");
      setAutocomplete("");
    } else {
      setPrefix("");
      setSuffix("");
      setAutocomplete("");
      setCode("");
    }
  }, [activeContent, tabContents]);

  const handleCodeChange = (newCode: string | undefined) => {
    if (newCode === undefined) return;

    setCode(newCode);
    if (activeContent) {
      // Update the tabContents state
      setTabContents((prev) => ({
        ...prev,
        [activeContent.id]: newCode,
      }));

      // Update the tabs state
      const updatedTabs = tabs.map((tab) =>
        tab.id === activeTab
          ? { ...tab, isUnsaved: true, content: newCode }
          : tab,
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

    const prompt =
      EngineerAssistant +
      "\nAssume the import of functions and other varibles exist in the repo and focus on the code in the file only.\n" +
      "\nUse the highlighted code and the comment to update the code.\n" +
      "\nTake your time and focus on the user comment for the code update.\n" +
      "\nBased on the changes needed for the user, update other code in the document to make the user comment work.\n" +
      "\nFull Code:\n" +
      textToProcess +
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
    const editor = editorRef.current;
    if (!editor) return;

    const currentCode = editor.getValue();
    const position = editor.getPosition();
    if (!position) return;

    const model = editor.getModel();
    if (!model) return;
    const currentCursorPosition = model.getOffsetAt(position);

    const currentPrefix = currentCode.slice(0, currentCursorPosition);
    const currentSuffix = currentCode.slice(currentCursorPosition);

    setPrefix(currentPrefix);
    setSuffix(currentSuffix);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      const response = await OpenAIClient.completions.create({
        model: "deepseek-chat",
        prompt: EngineerAssistant + "\n" + currentPrefix,
        suffix: currentSuffix || " ",
        max_tokens: 1024,
        temperature: 0,
        stream: true,
      });

      let accumulatedResponse = "";
      setShowDiff(true);

      for await (const chunk of response) {
        accumulatedResponse += chunk.choices[0]?.text;
        const newCode = currentPrefix + accumulatedResponse + currentSuffix;
        setAutocomplete(newCode);

        // // Update the editor content
        // if (editor) {
        //   editor.setValue(newCode);
        // }
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        console.log("Request cancelled");
      } else {
        console.error("Error fetching autocomplete:", error);
      }
    }
  }, []);

  const highlightWithLineNumbers = (input: string) =>
    Prism.highlight(input, Prism.languages.python, "python")
      .split("\n")
      .map((line: string) => `${line}`)
      .join("\n");

  const handleKeyDown = useCallback(
    (event: monaco.IKeyboardEvent) => {
      const editor = editorRef.current;

      if (editor) {
        if (editor.getValue() === "Tab" && autocomplete) {
          event.preventDefault();
          const newCode = prefix + autocomplete + suffix;
          setCode(newCode);
          if (activeContent) {
            const updatedTabs = tabs.map((tab) =>
              tab.id === activeTab
                ? { ...tab, isUnsaved: true, content: newCode }
                : tab,
            );
            setTabs(updatedTabs);
          }
          setAutocomplete("");
          setPrefix("");
          setSuffix("");
        } else if (event.altKey) {
          event.preventDefault();
          getAutocomplete();
        } else if (event.metaKey || event.ctrlKey) {
          if (
            event.keyCode === monaco.KeyCode.KEY_Z ||
            event.keyCode === monaco.KeyCode.KEY_Y
          ) {
            setAutocomplete("");
            setPrefix("");
            setSuffix("");
          }
        } else if (event.keyCode === monaco.KeyCode.Escape) {
          setAutocomplete("");
          setPrefix("");
          setSuffix("");
          setCode(prefix + suffix);
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
      prefix,
      suffix,
    ],
  );

  if (!activeTab) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600">
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
            modified={aiSuggestions || autocomplete}
            language="python"
            theme="light"
            options={{
              readOnly: true,
              renderSideBySide: false,
              diffWordWrap: "on",
            }}
          />
        ) : (
          <>
            <Editor
              height="100%"
              defaultLanguage="python"
              value={code}
              theme="light"
              onChange={handleCodeChange}
              options={{
                wordWrap: "on",
                minimap: { enabled: false },
                lineNumbers: "on",
              }}
              onMount={(editor) => {
                editorRef.current = editor;
                editor.onKeyDown((e) => handleKeyDown(e));
                editor.onDidChangeCursorSelection(() => {
                  handleCursorMove();
                });
              }}
            />
          </>
        )}
      </div>
      {showDiff && (
        <div className="mt-4 flex justify-end space-x-2">
          <button
            onClick={() => {
              setShowDiff(false);
              setAiSuggestions("");
              setAutocomplete("");
              setCode(code);
            }}
            className="px-4 py-2 rounded-md text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 transition-colors duration-200"
          >
            Keep Original
          </button>
          <button
            onClick={() => {
              const newCode = aiSuggestions || autocomplete;
              setCode(newCode);
              if (activeContent) {
                setTabContents((prev) => ({
                  ...prev,
                  [activeContent.id]: newCode,
                }));
                const updatedTabs = tabs.map((tab) =>
                  tab.id === activeTab
                    ? { ...tab, isUnsaved: true, content: newCode }
                    : tab,
                );
                setTabs(updatedTabs);
              }
              setHighlightedCode("");
              setShowDiff(false);
            }}
            className="px-4 py-2 rounded-md text-sm bg-blue-500 hover:bg-blue-600 text-white transition-colors duration-200"
          >
            Accept AI Suggestion
          </button>
        </div>
      )}
      <div className="w-full h-16 flex items-center px-4 border-t border-gray-200">
        <div className="flex w-full gap-2">
          <input
            type="text"
            value={pagePrompt}
            placeholder="Ask about the highlighted code..."
            className="w-full h-10 px-4 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-800"
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
            className="h-10 px-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 focus:outline-none focus:border-blue-500"
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
      <div className="flex h-screen bg-white text-gray-800">
        <div className="flex">
          <Sidebar />
          <div
            className="w-1 cursor-col-resize hover:bg-gray-200 active:bg-gray-300"
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
                    Math.min(600, newWidth),
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
