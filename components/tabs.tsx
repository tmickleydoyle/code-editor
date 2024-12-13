import React from "react";
import { File, X } from "lucide-react";

export function Tabs() {
  return (
    <div className="flex bg-gray-800 px-4">
      <div className="flex items-center space-x-2 py-2 px-4 bg-gray-900 text-purple-300 border-t border-purple-500">
        <File className="w-4 h-4" />
        <span className="text-sm">Python Code</span>
      </div>
    </div>
  );
}
