import { useState } from "react";
import { setPortalPassword } from "@/lib/onboarding/onboardingApi";

export function CreatePasswordMiniModal({
  open,
  onClose,
  onSuccess,
  mode = 'create',
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode?: 'create' | 'change';
}) {
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  const submit = async () => {
    setErr(null);
    if (pwd.length < 8) return setErr("Minimum 8 characters.");
    if (pwd !== pwd2) return setErr("Passwords do not match.");

    setLoading(true);
    try {
      await setPortalPassword(pwd);
      onSuccess();
      onClose();
      setPwd("");
      setPwd2("");
    } catch (e: any) {
      setErr(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900">{mode === 'change' ? 'Change password' : 'Create a password'}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900">✕</button>
        </div>

        <div className="space-y-3">
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Password (min 8)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2"
          />
          <input
            type="password"
            value={pwd2}
            onChange={(e) => setPwd2(e.target.value)}
            placeholder="Confirm password"
            className="w-full rounded-lg border border-slate-200 px-3 py-2"
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />

          {err && <div className="text-sm text-red-600">{err}</div>}

          <button
            disabled={loading}
            onClick={submit}
            className="w-full rounded-lg bg-slate-900 py-2 text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {loading ? "Saving..." : "Save password"}
          </button>

          <p className="text-xs text-slate-500">
            You'll be able to log in anytime with your email + password.
          </p>
        </div>
      </div>
    </div>
  );
}

