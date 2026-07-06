"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { VariableFieldDefinition } from "@/types";

interface VariablePrefixControlsProps {
  field: VariableFieldDefinition;
  onChange: (patch: Partial<VariableFieldDefinition>) => void;
  compact?: boolean;
}

export function VariablePrefixControls({ field, onChange, compact = false }: VariablePrefixControlsProps) {
  return (
    <div className={compact ? "flex items-center gap-2" : "space-y-2"}>
      {!compact && <Label className="text-xs text-muted-foreground">变量前缀</Label>}
      <div className="flex flex-1 items-center gap-2">
        {compact && <Label className="shrink-0 text-xs text-muted-foreground">变量前缀</Label>}
        <Switch
          checked={Boolean(field.prefixEnabled)}
          onCheckedChange={(checked) => onChange({ prefixEnabled: checked })}
        />
        <Input
          value={field.prefix ?? ""}
          onChange={(event) => onChange({ prefix: event.target.value })}
          placeholder="如 --ar "
          disabled={!field.prefixEnabled}
          className="h-8"
        />
      </div>
    </div>
  );
}
