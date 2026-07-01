"use client";

import { Braces, FilePlus2 } from "lucide-react";
import { IconTipButton } from "@/components/ui/icon-tip-button";

interface EditorInsertToolbarProps {
  onInsertVariable: () => void;
  onInsertPrompt: () => void;
}

export function EditorInsertToolbar({ onInsertVariable, onInsertPrompt }: EditorInsertToolbarProps) {
  return (
    <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1">
      <IconTipButton label="插入变量" size="icon" variant="secondary" onClick={onInsertVariable}>
        <Braces className="h-4 w-4" />
      </IconTipButton>
      <IconTipButton label="插入 Prompt" size="icon" variant="secondary" onClick={onInsertPrompt}>
        <FilePlus2 className="h-4 w-4" />
      </IconTipButton>
    </div>
  );
}
