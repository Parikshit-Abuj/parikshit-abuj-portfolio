"use client";
import { useState } from "react";
export function Portrait({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  return failed === src ? null : (
    <img
      className="recruiter-portrait"
      src={src}
      width={160}
      height={160}
      alt={`Portrait of ${name}`}
      onError={() => setFailed(src)}
    />
  );
}
