import React, { useState, useEffect } from "react";
import { File, Folder, Loader2, Github } from "lucide-react";
import { useGitHubFiles } from "../hooks/use-gitHub-files";
import { useEditor } from "../context/editor-context";

export function Sidebar() {
  const [orgName, setOrgName] = useState("tmickleydoyle");
  const [repoName, setRepoName] = useState("python-app-demo");
  const [activeOrg, setActiveOrg] = useState("tmickleydoyle");
  const [activeRepo, setActiveRepo] = useState("python-app-demo");

  const { files, loading, error, getFileContent } = useGitHubFiles(
    activeOrg,
    activeRepo,
  );
  const { openTab } = useEditor();
  const [expandedDirs, setExpandedDirs] = useState<{ [key: string]: boolean }>(
    {},
  );

  const handlePull = () => {
    setActiveOrg(orgName);
    setActiveRepo(repoName);
    setExpandedDirs({});
  };

  useEffect(() => {
    setExpandedDirs({});
  }, [orgName, repoName]);

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
      const textBasedExtensions = [
        ".md",
        ".txt",
        ".csv",
        ".doc",
        ".docx",
        ".rtf",
        ".pdf",
      ];
      const fileNameClass = textBasedExtensions.some((ext) =>
        file.name.toLowerCase().endsWith(ext),
      )
        ? ""
        : "text-orange-600";

      if (file.type === "dir") {
        const isExpanded = expandedDirs[filePath];
        return (
          <div key={filePath} className="ml-6 mb-2">
            <div
              className="flex items-center cursor-pointer text-blue-600"
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
    <div className="w-64 bg-gray-100 flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-sm font-medium text-gray-800">Repository Files</h2>
      </div>
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <input
          type="text"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          placeholder="Organization Name"
          className="bg-white text-gray-800 p-2 rounded w-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <input
          type="text"
          value={repoName}
          onChange={(e) => setRepoName(e.target.value)}
          placeholder="Repository Name"
          className="bg-white text-gray-800 p-2 rounded w-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <button
          onClick={handlePull}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full transition duration-200 ease-in-out"
        >
          Pull
        </button>
      </div>
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <a
          href={`https://github.com/${activeOrg}/${activeRepo}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-gray-600 hover:text-gray-800 flex items-center transition duration-200 ease-in-out"
        >
          <Github className="w-4 h-4 mr-2" />
          {activeOrg}/{activeRepo}
        </a>
      </div>
      <div className="flex-1 overflow-auto p-3">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="animate-spin w-6 h-6 text-blue-500" />
          </div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : files ? (
          renderFiles(files)
        ) : null}
      </div>
    </div>
  );
}
