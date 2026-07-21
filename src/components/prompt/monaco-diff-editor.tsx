"use client";

import "@/lib/monaco/setup";
import { DiffEditor } from "@monaco-editor/react";

interface MonacoDiffEditorProps {
  original: string;
  modified: string;
}

export default function MonacoDiffEditor({ original, modified }: MonacoDiffEditorProps) {
  return (
    <DiffEditor
      height="100%"
      language="markdown"
      original={original}
      modified={modified}
      theme="vs-dark"
      options={{
        readOnly: true,
        renderSideBySide: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
      }}
    />
  );
}
