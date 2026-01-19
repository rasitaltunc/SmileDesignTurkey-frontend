import { useEffect, useMemo, useState } from "react";
import { ONBOARDING_CARDS, CardDef } from "@/lib/onboarding/cards";
import { fetchOnboardingStateWithSession, submitOnboardingCardWithSession } from "@/lib/onboarding/onboardingApi";

type FormState = Record<string, any>;

function isCardVisible(card: CardDef, form: Record<string, any>) {
  if (!card.showIf) return true;
  return form?.[card.showIf.questionId] === card.showIf.equals;
}

export default function OnboardingFlow() {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [latestAnswers, setLatestAnswers] = useState<Record<string, any>>({});
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cards = useMemo(() => ONBOARDING_CARDS, []);

  // Load initial state
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await fetchOnboardingStateWithSession();
        setProgress(data.state.progress_percent);
        setCompleted(data.state.completed_card_ids);
        setLatestAnswers(data.latest_answers || {});
      } catch (e: any) {
        setError(e?.message || "Failed to load onboarding");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // A) State gelince activeCard'ı seç: ilk incomplete kartı aç
  useEffect(() => {
    if (completed.length === 0 && cards.length > 0) {
      // Still loading or no completed cards, wait
      return;
    }
    const completedSet = new Set(completed);
    const next = cards.find(c => !completedSet.has(c.id));
    setActiveCardId(next?.id ?? cards[0]?.id ?? null);
  }, [completed, cards]);

  // B) activeCard değişince önceki cevabı form'a bas (refresh sonrası çok kritik)
  useEffect(() => {
    if (!activeCardId) return;
    const saved = latestAnswers[activeCardId] || {};
    setForm(saved);
  }, [activeCardId, latestAnswers]);

  const activeCard = cards.find(c => c.id === activeCardId) || null;

  function setValue(qid: string, value: any) {
    setForm(prev => ({ ...prev, [qid]: value }));
  }

  function validateCard(card: CardDef) {
    for (const q of card.questions) {
      if (!q.required) continue;
      const v = form[q.id];
      const empty =
        v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
      if (empty) return `Please fill: ${q.label}`;
    }
    return null;
  }

  async function submit() {
    if (!activeCard) return;
    const vErr = validateCard(activeCard);
    if (vErr) return setError(vErr);

    try {
      setSaving(true);
      setError(null);
      // C) Continue sonrası: response'dan state + latest_answers al
      const result = await submitOnboardingCardWithSession(activeCard.id, form);

      // Update state with fresh data from server
      setProgress(result.state.progress_percent);
      setCompleted(result.state.completed_card_ids);
      setLatestAnswers(result.latest_answers);

      // Find next incomplete card
      const completedSet = new Set(result.state.completed_card_ids || []);
      const next = cards.find(c => !completedSet.has(c.id));
      if (next) {
        setActiveCardId(next.id);
        // Form will be auto-filled by useEffect when activeCardId changes
      }
    } catch (e: any) {
      setError(e?.message || "Submit failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6">Loading onboarding...</div>;
  if (error && !activeCard) return <div className="p-6 text-red-600">{error}</div>;
  if (!activeCard) return <div className="p-6">No onboarding cards.</div>;

  // showIf support (v1)
  if (!isCardVisible(activeCard, form)) {
    return <div className="p-6">This step is skipped.</div>;
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm text-gray-500">Onboarding</div>
          <div className="text-lg font-semibold">{activeCard.title}</div>
          {activeCard.description && <div className="text-sm text-gray-600">{activeCard.description}</div>}
        </div>
        <div className="text-sm text-gray-600">{progress}%</div>
      </div>

      <div className="w-full h-2 bg-gray-100 rounded-full mb-5">
        <div className="h-2 rounded-full bg-black" style={{ width: `${progress}%` }} />
      </div>

      <div className="space-y-4">
        {activeCard.questions.map(q => {
          const value = form[q.id];

          if (q.type === "text") {
            return (
              <div key={q.id}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{q.label}{q.required ? " *" : ""}</label>
                <input
                  value={value || ""}
                  onChange={(e) => setValue(q.id, e.target.value)}
                  placeholder={q.placeholder || ""}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
            );
          }

          if (q.type === "select") {
            return (
              <div key={q.id}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{q.label}{q.required ? " *" : ""}</label>
                <select
                  value={value || ""}
                  onChange={(e) => setValue(q.id, e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="">Select…</option>
                  {q.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            );
          }

          if (q.type === "yesno") {
            const base = "px-3 py-2 rounded-lg border transition-colors";
            const selected = "bg-emerald-600 text-white border-emerald-600";
            const unselected = "bg-white text-slate-900 border-slate-200 hover:bg-slate-50";
            return (
              <div key={q.id}>
                <label className="block text-sm font-medium text-gray-700 mb-2">{q.label}{q.required ? " *" : ""}</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setValue(q.id, true)}
                    className={`${base} ${value === true ? selected : unselected}`}
                  >Yes</button>
                  <button
                    type="button"
                    onClick={() => setValue(q.id, false)}
                    className={`${base} ${value === false ? selected : unselected}`}
                  >No</button>
                </div>
              </div>
            );
          }

          // multiselect
          if (q.type === "multiselect") {
            const arr: string[] = Array.isArray(value) ? value : [];
            const base = "px-3 py-2 rounded-lg border transition-colors";
            const selected = "bg-emerald-600 text-white border-emerald-600";
            const unselected = "bg-white text-slate-900 border-slate-200 hover:bg-slate-50";
            return (
              <div key={q.id}>
                <label className="block text-sm font-medium text-gray-700 mb-2">{q.label}{q.required ? " *" : ""}</label>
                <div className="flex flex-wrap gap-2">
                  {q.options.map(opt => {
                    const on = arr.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setValue(q.id, on ? arr.filter(x => x !== opt) : [...arr, opt])}
                        className={`${base} ${on ? selected : unselected}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>

      {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {activeCard.rewardText ? `Reward: ${activeCard.rewardText}` : ""}
        </div>
        <button
          onClick={submit}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Continue"}
        </button>
      </div>
    </div>
  );
}

