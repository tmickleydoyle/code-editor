import React, { useState } from "react";
import { File, Folder, Loader2 } from "lucide-react";
import { useGitHubFiles } from "../hooks/use-gitHub-files";
import { useEditor } from "../context/editor-context";

export function Sidebar() {
  const { files, loading, error, getFileContent } = useGitHubFiles(
    "tmickleydoyle",
    "language-model"
  );
  const { openTab } = useEditor();
  const [expandedDirs, setExpandedDirs] = useState<{ [key: string]: boolean }>(
    {}
  );

  const handleFileClick = async (file: {
    type: string;
    url: string;
    path: string;
    name: string;
  }) => {
    if (file.type === "file") {
      try {
        const content = await getFileContent(file.url);
        openTab(file.path, file.name, content);
      } catch (err) {
        console.error("Failed to load file:", err);
      }
    } else if (file.type === "dir") {
      setExpandedDirs((prev) => ({
        ...prev,
        [file.path]: !prev[file.path],
      }));
    }
  };

  interface FileNode {
    type: string;
    url: string;
    path: string;
    name: string;
    children?: FileNode[];
  }

  const renderFiles = (files: FileNode[], parentPath = "") => {
    if (!Array.isArray(files)) {
      return null;
    }

    return files.map((file) => {
      const filePath = parentPath ? `${parentPath}/${file.name}` : file.name;
      const fileNameClass = file.name.endsWith(".py") ? "text-orange-300" : "";

      if (file.type === "dir") {
        const isExpanded = expandedDirs[filePath];
        return (
          <div key={filePath} className="ml-6 mb-2">
            <div
              className="flex items-center cursor-pointer text-purple-400"
              onClick={() => handleFileClick(file)}
            >
              <Folder className="mr-2" />
              <span>{file.name}</span>
            </div>
            {isExpanded &&
              file.children &&
              renderFiles(file.children, filePath)}
          </div>
        );
      } else {
        return (
          <div
            key={filePath}
            className={`flex items-center cursor-pointer ml-6 mb-2 ${fileNameClass}`}
            onClick={() => handleFileClick(file)}
          >
            <File className="mr-2" />
            <span>{file.name}</span>
          </div>
        );
      }
    });
  };

  return (
    <div className="w-64 bg-gray-800 flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-sm font-medium text-gray-200">Repository Files</h2>
      </div>
      <div className="flex-1 overflow-auto p-3">
        {loading ? (
          <Loader2 className="animate-spin" />
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          renderFiles(files)
        )}
      </div>
    </div>
  );
}
