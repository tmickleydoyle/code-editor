import React from 'react'
import { File, Folder, Settings } from 'lucide-react'

export function Sidebar() {
  return (
    <div className="w-16 bg-gray-800 flex flex-col items-center py-4">
      <button className="p-2 hover:bg-gray-700 rounded mb-4">
        <File className="w-6 h-6 text-gray-400" />
      </button>
      <button className="p-2 hover:bg-gray-700 rounded mb-4">
        <Folder className="w-6 h-6 text-gray-400" />
      </button>
      <button className="p-2 hover:bg-gray-700 rounded mt-auto">
        <Settings className="w-6 h-6 text-gray-400" />
      </button>
    </div>
  )
}

