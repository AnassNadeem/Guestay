import { useState } from "react";
import { CopyIcon, CheckIcon } from "./icons";

export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="copy-row">
      <code title={value}>{value}</code>
      <button
        type="button"
        className="btn secondary"
        style={{ height: 32, padding: "0 0.7rem", gap: 6 }}
        onClick={copy}
      >
        {copied ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
