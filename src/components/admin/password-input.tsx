"use client";
import { useState } from "react";
import { Copy, Eye, EyeOff, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SETS = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%*?-"];

export function generatePassword(length = 14) {
  const rand = (n: number) => {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] % n;
  };
  const all = SETS.join("");
  const chars = SETS.map((s) => s[rand(s.length)]);
  while (chars.length < length) chars.push(all[rand(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export function PasswordInput({
  id,
  value,
  onChange,
  invalid,
  withGenerator = true,
  autoComplete = "new-password",
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  withGenerator?: boolean;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-invalid={invalid || undefined}
          className="pr-9 font-mono"
          maxLength={72}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-muted"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
      {withGenerator && (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Generate a strong password"
            title="Generate"
            onClick={() => {
              onChange(generatePassword());
              setVisible(true);
            }}
          >
            <Wand2 />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Copy password"
            title="Copy"
            disabled={!value}
            onClick={async () => {
              await navigator.clipboard.writeText(value);
              toast.success("Password copied");
            }}
          >
            <Copy />
          </Button>
        </>
      )}
    </div>
  );
}
