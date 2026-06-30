"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  language?: string;
  height?: string;
}

export default function MonacoEditor({
  value,
  onChange,
  readOnly = false,
  language = "markdown",
  height = "100%",
}: MonacoEditorProps) {
  const handleMount: OnMount = (instance: editor.IStandaloneCodeEditor) => {
    instance.focus();
  };

  return (
    <Editor
      height={height}
      language={language}
      value={value}
      onChange={(nextValue) => onChange(nextValue ?? "")}
      onMount={handleMount}
      theme="vs-dark"
      options={{
        minimap: { enabled: false },
        wordWrap: "on",
        fontSize: 14,
        readOnly,
        scrollBeyondLastLine: false,
        automaticLayout: true,
      }}
    />
  );
}
