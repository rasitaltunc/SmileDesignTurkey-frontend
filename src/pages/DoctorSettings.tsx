import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { apiJsonAuth } from "@/lib/api";

type DoctorPreferences = {
  doctor_id?: string;
  locale?: "en" | "tr";
  brief_style?: "bullets" | "detailed";
  tone?: "warm_expert" | "formal_clinical";
  risk_tolerance?: "conservative" | "balanced" | "aggressive";
  specialties?: string[];
  preferred_materials?: Record<string, any>;
  clinic_protocol_notes?: string | null;
};

type PreferencesResponse = {
  ok: true;
  preferences: DoctorPreferences;
  requestId?: string;
  buildSha?: string | null;
};

function safeString(v: any) {
  return typeof v === "string" ? v : "";
}

export default function DoctorSettings() {
  const { user, role } = useAuthStore();

  const displayName =
    safeString((user as any)?.user_metadata?.full_name) ||
    safeString((user as any)?.user_metadata?.name) ||
    safeString((user as any)?.email);
  const email = safeString((user as any)?.email);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // MVP form fields
  const [defaultMaterial, setDefaultMaterial] = useState<"zirconia" | "emax" | "composite">(
    "zirconia"
  );
  const [defaultLanguage, setDefaultLanguage] = useState<"en" | "tr">("en");
  const [briefTone, setBriefTone] = useState<"short" | "detailed">("short");
  const [showPriceBreakdown, setShowPriceBreakdown] = useState<boolean>(true);

  const canSave = !!user && !saving;

  // Load preferences
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const resp = await apiJsonAuth<PreferencesResponse>("/api/doctor/preferences");
        const prefs = resp?.preferences || {};

        const locale = prefs.locale === "tr" ? "tr" : "en";
        const briefStyle = prefs.brief_style === "detailed" ? "detailed" : "bullets";
        const preferred = prefs.preferred_materials || {};

        if (!cancelled) {
          setDefaultLanguage(locale);
          setBriefTone(briefStyle === "detailed" ? "detailed" : "short");
          setDefaultMaterial(
            preferred?.default_material === "emax"
              ? "emax"
              : preferred?.default_material === "composite"
                ? "composite"
                : "zirconia"
          );
          setShowPriceBreakdown(
            typeof preferred?.show_price_breakdown === "boolean" ? preferred.show_price_breakdown : true
          );
        }
      } catch (err: any) {
        console.error("[DoctorSettings] Failed to load preferences", err);
        toast.error(err?.message || "Failed to load preferences");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const payload = useMemo(() => {
    return {
      // API expects these enums
      locale: defaultLanguage,
      brief_style: briefTone === "detailed" ? "detailed" : "bullets",
      tone: "warm_expert",
      risk_tolerance: "balanced",
      specialties: [],
      preferred_materials: {
        default_material: defaultMaterial,
        show_price_breakdown: showPriceBreakdown,
      },
      clinic_protocol_notes: null,
    } satisfies DoctorPreferences;
  }, [defaultLanguage, briefTone, defaultMaterial, showPriceBreakdown]);

  async function handleSave() {
    if (!user) {
      toast.error("Session missing. Please login again.");
      return;
    }
    setSaving(true);
    try {
      await apiJsonAuth<PreferencesResponse>("/api/doctor/preferences", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast.success("Preferences saved");
    } catch (err: any) {
      console.error("[DoctorSettings] Save failed", err);
      toast.error(err?.message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Doctor Settings</h1>
          <p className="text-sm text-gray-600 mt-1">Doctor Profile + Preferences</p>
        </div>
      </div>

      {/* Profile */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-sm font-semibold text-gray-900">Doctor Profile</h2>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-gray-500">Name</div>
            <div className="mt-1 text-gray-900">{displayName || "-"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Email</div>
            <div className="mt-1 text-gray-900">{email || "-"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Role</div>
            <div className="mt-1 text-gray-900">{(role || "doctor").toString()}</div>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-gray-900">Preferences (MVP)</h2>
          {loading ? (
            <div className="text-xs text-gray-500">Loading…</div>
          ) : (
            <div className="text-xs text-gray-500">Ready</div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <div className="text-xs font-semibold text-gray-700 mb-1">Default material</div>
            <select
              value={defaultMaterial}
              onChange={(e) => setDefaultMaterial(e.target.value as any)}
              disabled={loading}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white disabled:bg-gray-100 disabled:text-gray-700 disabled:border-gray-200 disabled:cursor-not-allowed"
            >
              <option value="zirconia">Zirconia</option>
              <option value="emax">Emax</option>
              <option value="composite">Composite</option>
            </select>
          </label>

          <label className="block">
            <div className="text-xs font-semibold text-gray-700 mb-1">Default language</div>
            <select
              value={defaultLanguage}
              onChange={(e) => setDefaultLanguage(e.target.value as any)}
              disabled={loading}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white disabled:bg-gray-100 disabled:text-gray-700 disabled:border-gray-200 disabled:cursor-not-allowed"
            >
              <option value="en">EN</option>
              <option value="tr">TR</option>
            </select>
          </label>

          <label className="block">
            <div className="text-xs font-semibold text-gray-700 mb-1">Tone</div>
            <select
              value={briefTone}
              onChange={(e) => setBriefTone(e.target.value as any)}
              disabled={loading}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white disabled:bg-gray-100 disabled:text-gray-700 disabled:border-gray-200 disabled:cursor-not-allowed"
            >
              <option value="short">Short</option>
              <option value="detailed">Detailed</option>
            </select>
            <div className="mt-1 text-xs text-gray-500">
              Maps to backend <span className="font-mono">brief_style</span>.
            </div>
          </label>

          <label className="block">
            <div className="text-xs font-semibold text-gray-700 mb-2">Show price breakdown</div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={showPriceBreakdown}
                onChange={(e) => setShowPriceBreakdown(e.target.checked)}
                disabled={loading}
                className="h-4 w-4"
              />
              <div className="text-sm text-gray-700">
                {showPriceBreakdown ? "Enabled" : "Disabled"}
              </div>
            </div>
          </label>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 disabled:bg-gray-100 disabled:text-gray-700 disabled:border disabled:border-gray-200 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving…" : "Save Preferences"}
          </button>
        </div>
      </div>
    </div>
  );
}
