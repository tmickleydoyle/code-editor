"use client";

import React from "react";
import { File, X } from "lucide-react";
import { useEditor } from "../context/editor-context";
import { cn } from "@/lib/utils";

export function Tabs() {
  const { tabs, activeTab, closeTab, setActiveTab } = useEditor();

  if (tabs.length === 0) {
    return (
      <div className="flex bg-gray-100 px-4 h-[53px] border-b border-gray-200">
        <div className="flex items-center">
          <span className="text-sm text-gray-600">
            Press ⇧⌘T to create a new tab
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-gray-100 px-4 overflow-x-auto h-[53px] border-b border-gray-200">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={cn(
            "flex items-center space-x-2 py-2 px-4 border-t-2 border-transparent cursor-pointer group",
            activeTab === tab.id
              ? "bg-white text-blue-600 border-t-blue-500"
              : "text-gray-600 hover:bg-gray-200",
          )}
          onClick={() => setActiveTab(tab.id)}
        >
          <File className="w-4 h-4" />
          <span className="text-sm">
            {tab.name}
            {tab.isUnsaved && " •"}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeTab(tab.id);
            }}
            className="ml-2 p-0.5 rounded-sm opacity-0 group-hover:opacity-100 hover:bg-gray-300"
          >
            <X className="w-3 h-3" />
            <span className="sr-only">Close tab</span>
          </button>
        </div>
      ))}
    </div>
  );
}
