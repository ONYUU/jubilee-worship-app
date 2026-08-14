"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={handleCopy} className="button-secondary">
        {copied ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
        {copied ? "주소를 복사했습니다" : "주소 복사"}
      </button>
      <p className="sr-only" aria-live="polite">{copied ? "주소가 클립보드에 복사되었습니다." : ""}</p>
    </div>
  );
}
