"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface Tab {
  id: string;
  name: string;
  content: string;
  path: string;
  isUnsaved?: boolean;
}

export interface EditorContextType {
  tabs: Tab[];
  activeTab: string | null;
  openTab: (path: string, name: string, content: string) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  createNewTab: () => void;
  setTabs: (tabs: Tab[]) => void;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [untitledCount, setUntitledCount] = useState(1);

  // Handle Command+T for new tab
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "t") {
        e.preventDefault();
        createNewTab();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const createNewTab = () => {
    const newTab = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Untitled-${untitledCount}`,
      content: "",
      path: `untitled-${untitledCount}`,
      isUnsaved: true,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTab(newTab.id);
    setUntitledCount((prev) => prev + 1);
  };

  const openTab = (path: string, name: string, content: string) => {
    const existingTab = tabs.find((tab) => tab.path === path);
    if (existingTab) {
      setActiveTab(existingTab.id);
      return;
    }

    const newTab = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      content,
      path,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTab(newTab.id);
  };

  const closeTab = (id: string) => {
    setTabs((prev) => prev.filter((tab) => tab.id !== id));
    if (activeTab === id) {
      setActiveTab(tabs.length > 1 ? tabs[tabs.length - 2].id : null);
    }
  };

  return (
    <EditorContext.Provider
      value={{
        tabs,
        activeTab,
        openTab,
        closeTab,
        setActiveTab,
        createNewTab,
        setTabs: (tabs: Tab[]) => setTabs(tabs),
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error("useEditor must be used within an EditorProvider");
  }
  return context;
}
