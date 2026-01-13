import React from "react";

export default function BuildStamp() {
  // Safely access build constants (may be empty in dev)
  const buildSha = typeof __BUILD_SHA__ !== "undefined" ? __BUILD_SHA__ : "";
  const vercelEnv = typeof __VERCEL_ENV__ !== "undefined" ? __VERCEL_ENV__ : "";
  const vercelUrl = typeof __VERCEL_URL__ !== "undefined" ? __VERCEL_URL__ : "";
  
  const host = typeof window !== "undefined" ? window.location.host : "";
  const shaShort = buildSha ? buildSha.slice(0, 7) : "dev";
  const envLabel = vercelEnv || "local";

  return (
    <div
      style={{
        position: "fixed",
        bottom: 8,
        left: 8,
        zIndex: 999998,
        background: "rgba(0, 0, 0, 0.75)",
        color: "#fff",
        padding: "4px 8px",
        borderRadius: 4,
        fontSize: 10,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        lineHeight: 1.4,
        maxWidth: "90vw",
        wordBreak: "break-all",
      }}
    >
      <div>
        <b>BUILD:</b> {shaShort} ({envLabel})
      </div>
      {host && (
        <div>
          <b>host:</b> {host}
        </div>
      )}
      {vercelUrl && (
        <div>
          <b>vercel:</b> {vercelUrl}
        </div>
      )}
    </div>
  );
}

