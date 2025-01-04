import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";

interface GitHubMarkdownProps {
    content: string;
}

export function GitHubMarkdown({ content }: GitHubMarkdownProps) {
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const mockRunInTerminal = (command: string) => {
        console.log('Running command:', command);
    };

    const mockCreateFile = (code: string) => {
        console.log('Creating new file with:', code);
    };

    const mockUpdateFile = (code: string) => {
        console.log('Updating file with:', code);
    };

    const determineCodeType = (code: string): 'new' | 'update' | 'info' => {
        // Simple heuristic - can be made more sophisticated
        if (code.includes('Create new file') || code.includes('touch ')) {
            return 'new';
        }
        if (code.includes('Update') || code.includes('modify')) {
            return 'update';
        }
        return 'info';
    };

    return (
        <div className="prose max-w-none [&>p]:mb-8">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeSanitize]}
                components={{
                    h1: ({ children }) => <h1 className="text-3xl font-bold my-8">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-2xl font-bold my-6">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-xl font-bold my-4">{children}</h3>,
                    code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || "");
                        const codeString = String(children).replace(/\n$/, "");
                        const codeType = determineCodeType(codeString);
                        
                        if (!inline && match) {
                            return (
                                <div className="relative">
                                    <SyntaxHighlighter
                                        language={match[1]}
                                        PreTag="div"
                                        {...props}
                                    >
                                        {codeString}
                                    </SyntaxHighlighter>
                                    <div className="absolute top-2 right-2 flex gap-2">
                                        <button
                                            onClick={() => copyToClipboard(codeString)}
                                            className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-sm"
                                        >
                                            Copy
                                        </button>
                                        {match[1] === 'bash' && (
                                            <button
                                                onClick={() => mockRunInTerminal(codeString)}
                                                className="bg-green-700 hover:bg-green-600 text-white px-2 py-1 rounded text-sm"
                                            >
                                                Run
                                            </button>
                                        )}
                                        {codeType === 'new' && (
                                            <button
                                                onClick={() => mockCreateFile(codeString)}
                                                className="bg-blue-700 hover:bg-blue-600 text-white px-2 py-1 rounded text-sm"
                                            >
                                                Create File
                                            </button>
                                        )}
                                        {codeType === 'update' && (
                                            <button
                                                onClick={() => mockUpdateFile(codeString)}
                                                className="bg-yellow-700 hover:bg-yellow-600 text-white px-2 py-1 rounded text-sm"
                                            >
                                                Update File
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <code className={className} {...props}>
                                {children}
                            </code>
                        );
                    },
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
