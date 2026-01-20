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
  const [state, setState] = useState<{
    completed_card_ids: string[];
    progress_percent: number;
    latest_answers: Record<string, any>;
  } | null>(null);
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
        // State is already normalized from API
        const newState = {
          completed_card_ids: data.state.completed_card_ids || [],
          progress_percent: data.state.progress_percent || 0,
          latest_answers: data.state.latest_answers || {},
        };
        setState(newState);
        setProgress(newState.progress_percent);
      } catch (e: any) {
        setError(e?.message || "Failed to load onboarding");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // A) State gelince activeCard'ı seç: ilk incomplete kartı aç
  // This ensures refresh → %43 shows the correct incomplete card
  useEffect(() => {
    // Wait for loading to finish and state to be available
    if (loading || !state || ONBOARDING_CARDS.length === 0) return;

    const completed = new Set(state.completed_card_ids || []);
    const nextCard = ONBOARDING_CARDS.find((c) => !completed.has(c.id)) || ONBOARDING_CARDS[0];

    if (nextCard && nextCard.id !== activeCardId) {
      if (import.meta.env.DEV) {
        console.log("[OnboardingFlow] Selecting card:", {
          cardId: nextCard.id,
          completed: Array.from(completed),
          progress: state.progress_percent,
        });
      }

      setActiveCardId(nextCard.id);

      // Prefill answers (kaldığın kartın cevapları) - state.latest_answers is normalized
      const saved = state.latest_answers?.[nextCard.id] || {};
      setForm(saved);
    }
  }, [state, loading, activeCardId]);

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
      
      // Submit card - response is already normalized
      const result = await submitOnboardingCardWithSession(activeCard.id, form);

      // Update state with fresh normalized data from server
      const newState = {
        completed_card_ids: result.state.completed_card_ids || [],
        progress_percent: result.state.progress_percent || 0,
        latest_answers: result.state.latest_answers || {},
      };
      
      setState(newState);
      setProgress(newState.progress_percent);
      
      // Next card selection happens automatically via useEffect when state updates
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
            const optionClass = (selected: boolean) =>
              [
                "border rounded-lg px-4 py-3 transition-colors",
                selected
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-900 border-slate-200 hover:bg-slate-50",
              ].join(" ");
            
            return (
              <div key={q.id}>
                <label className="block text-sm font-medium text-gray-700 mb-2">{q.label}{q.required ? " *" : ""}</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setValue(q.id, true)}
                    className={optionClass(value === true)}
                  >Yes</button>
                  <button
                    type="button"
                    onClick={() => setValue(q.id, false)}
                    className={optionClass(value === false)}
                  >No</button>
                </div>
              </div>
            );
          }

          // multiselect
          if (q.type === "multiselect") {
            const arr: string[] = Array.isArray(value) ? value : [];
            const optionClass = (selected: boolean) =>
              [
                "border rounded-lg px-4 py-3 transition-colors",
                selected
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-900 border-slate-200 hover:bg-slate-50",
              ].join(" ");
            
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
                        className={optionClass(on)}
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
          className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving..." : "Continue"}
        </button>
      </div>
    </div>
  );
}

