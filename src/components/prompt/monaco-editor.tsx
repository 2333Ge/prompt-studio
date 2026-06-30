"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import { useRef } from "react";
import type { editor } from "monaco-editor";

interface MonacoEditorProps {
  defaultValue: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  language?: string;
  height?: string;
}

export default function MonacoEditor({
  defaultValue,
  onChange,
  readOnly = false,
  language = "markdown",
  height = "100%",
}: MonacoEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const handleMount: OnMount = (instance) => {
    editorRef.current = instance;
    instance.onDidChangeModelContent(() => {
      onChangeRef.current(instance.getValue());
    });
    instance.focus();
  };

  return (
    <Editor
      height={height}
      language={language}
      defaultValue={defaultValue}
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
