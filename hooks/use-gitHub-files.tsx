import { useState, useEffect } from "react";

interface GitHubFile {
  name: string;
  path: string;
  type: string;
  content?: string;
  url: string;
  children?: GitHubFile[];
}

export function useGitHubFiles(owner: string, repo: string) {
  const [files, setFiles] = useState<GitHubFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFiles(path = "") {
      try {
        const response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents${path}`,
          {
            headers: {
              Authorization:
                `token ${process.env.NEXT_PUBLIC_GITHUB_TOKEN}` || "",
              "X-GitHub-Api-Version": "2022-11-28",
            },
          },
        );
        const data = await response.json();

        if (Array.isArray(data)) {
          const filesWithChildren = await Promise.all(
            data.map(async (file): Promise<GitHubFile> => {
              if (file.type === "dir") {
                const children = await fetchFiles(file.path);
                return { ...file, children };
              }
              return file;
            }),
          );
          return filesWithChildren;
        }
        return [];
      } catch {
        setError("Failed to fetch repository contents");
        setLoading(false);
        return [];
      }
    }

    async function loadFiles() {
      const rootFiles = await fetchFiles();
      setFiles(rootFiles);
      setLoading(false);
    }

    loadFiles();
  }, [owner, repo]);

  const getFileContent = async (url: string) => {
    try {
      const response = await fetch(url);
      const data = await response.json();
      // GitHub API returns content as base64
      return atob(data.content);
    } catch {
      throw new Error("Failed to fetch file content");
    }
  };

  return { files, loading, error, getFileContent };
}
