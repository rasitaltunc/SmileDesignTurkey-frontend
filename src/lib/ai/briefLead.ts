// Helper to call /api/ai/brief endpoint
import { getSupabaseClient } from "../supabaseClient";

export interface BriefSnapshot {
  oneLiner: string;
  goal: string;
  keyFacts: string[];
  nextBestAction: string;
}

export interface BriefCallBrief {
  openingLine: string;
  mustAsk: string[];
  avoid: string[];
  tone: string;
}

export interface BriefRisk {
  priority: "hot" | "warm" | "cool";
  reasons: string[];
  confidence: number;
}

export interface BriefResponse {
  ok: boolean;
  hasOpenAI: boolean;
  requestId?: string;
  brief: {
    snapshot: BriefSnapshot | null;
    callBrief: BriefCallBrief | null;
    risk: BriefRisk | null;
  };
  error?: string;
  details?: string;
}

export async function briefLead(leadId: string): Promise<BriefResponse> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase client not configured");
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  if (!token) {
    throw new Error("Not authenticated");
  }

  const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;

  const response = await fetch(`${apiUrl}/api/ai/brief`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ lead_id: leadId }), // ✅ Use lead_id (TEXT) for consistency with FIX PACK 6
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return await response.json();
}

