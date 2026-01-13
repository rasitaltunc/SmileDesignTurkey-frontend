import React from "react";

export default function DebugHud(props: {
  leadRef?: string | null;
  isDoctorPath?: boolean;
  finalIsDoctorMode?: boolean;
  isLoadingDoctorBrief?: boolean;
  pathname?: string;
  search?: string;
  params?: any;
}) {
  // Vercel provides these at build time only if we pass them, so we fallback gracefully.
  const buildSha =
    (import.meta as any).env?.VITE_BUILD_SHA ||
    (import.meta as any).env?.VERCEL_GIT_COMMIT_SHA ||
    "NO_SHA";
  const buildId =
    (import.meta as any).env?.VERCEL_DEPLOYMENT_ID ||
    (import.meta as any).env?.VITE_BUILD_ID ||
    "NO_DEPLOY_ID";

  return (
    <div
      style={{
        position: "fixed",
        bottom: 10,
        right: 10,
        zIndex: 999999,
        background: "rgba(0,0,0,0.78)",
        color: "#fff",
        padding: "8px 10px",
        borderRadius: 8,
        fontSize: 12,
        maxWidth: 520,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        lineHeight: 1.35,
      }}
    >
      <div><b>BUILD</b> sha={String(buildSha).slice(0, 10)} id={String(buildId).slice(0, 10)}</div>
      <div><b>PATH</b> {props.pathname || (typeof window !== 'undefined' ? window.location.pathname : '-')}</div>
      <div><b>QUERY</b> {props.search || (typeof window !== 'undefined' ? window.location.search : '-') || "-"}</div>
      <div><b>PARAMS</b> {JSON.stringify(props.params || {})}</div>
      <div><b>leadRef</b> {props.leadRef ?? "NULL"}</div>
      <div><b>doctorPath</b> {String(props.isDoctorPath)}</div>
      <div><b>doctorMode</b> {String(props.finalIsDoctorMode)}</div>
      <div><b>briefLoading</b> {String(props.isLoadingDoctorBrief)}</div>
    </div>
  );
}

