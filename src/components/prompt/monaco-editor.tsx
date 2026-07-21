"use client";

import "@/lib/monaco/setup";
import Editor, { type OnMount } from "@monaco-editor/react";
import { forwardRef, useImperativeHandle, useRef } from "react";
import type { editor } from "monaco-editor";

export interface MonacoEditorHandle {
  insertText: (text: string) => void;
  focus: () => void;
}

interface MonacoEditorProps {
  defaultValue: string;
  onChange: (value: string) => void;
  onReady?: (handle: MonacoEditorHandle) => void;
  readOnly?: boolean;
  language?: string;
  height?: string;
}

const MonacoEditor = forwardRef<MonacoEditorHandle, MonacoEditorProps>(function MonacoEditor(
  { defaultValue, onChange, onReady, readOnly = false, language = "markdown", height = "100%" },
  ref,
) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const handle: MonacoEditorHandle = {
    insertText(text: string) {
      const instance = editorRef.current;
      if (!instance) return;
      const selection = instance.getSelection();
      if (!selection) return;
      instance.executeEdits("insert-text", [
        {
          range: selection,
          text,
          forceMoveMarkers: true,
        },
      ]);
      instance.focus();
      onChangeRef.current(instance.getValue());
    },
    focus() {
      editorRef.current?.focus();
    },
  };

  useImperativeHandle(ref, () => handle);

  const handleMount: OnMount = (instance) => {
    editorRef.current = instance as editor.IStandaloneCodeEditor;
    instance.onDidChangeModelContent(() => {
      onChangeRef.current(instance.getValue());
    });
    onReady?.(handle);
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
});

export default MonacoEditor;
