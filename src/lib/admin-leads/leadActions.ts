import type { SupabaseClient } from '@supabase/supabase-js';
import type { LeadRowVM } from '@/components/admin-leads/LeadsTable';

// WhatsApp helper functions
function normalizePhoneToWhatsApp(phone?: string): string | null {
  if (!phone) return null;
  let p = String(phone).trim().replace(/[^\d+]/g, "");

  // if starts with 0 and looks TR, convert to +90
  if (p.startsWith("0")) p = "+90" + p.slice(1);

  // if starts without + and length seems like TR mobile, assume +90
  if (!p.startsWith("+") && p.length === 10) p = "+90" + p;

  // if still no +, add +
  if (!p.startsWith("+")) p = "+" + p;

  const digits = p.replace(/\+/g, ""); // wa.me wants digits only (remove all + signs)

  // ✅ minimum uzunluk kontrolü (wa.me digits only)
  if (p.replace(/\D/g, "").length < 11) return null;

  return digits;
}

function waMessageEN(lead: LeadRowVM): string {
  return (
    `Hi ${lead?.name || ""}! 👋\n` +
    `This is Smile Design Turkey.\n\n` +
    `I'm reaching out about your request:\n` +
    `• Treatment: ${lead?.treatment || "-"}\n` +
    `• Timeline: ${lead?.timeline || "-"}\n\n` +
    `To prepare your plan, could you send:\n` +
    `1) A clear smile photo\n` +
    `2) A short video (front + side)\n` +
    `3) Any x-ray if available 😊`
  );
}

export interface HandleNextActionParams {
  row: LeadRowVM;
  action: string;
  supabase: SupabaseClient;
  apiUrl: string;
  openNotes: (leadId: string) => void;
  runAIAnalysis: (leadId: string) => void;
  copyText: (text: string) => void;
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
  };
}

/**
 * Handles next action button clicks for leads.
 * Logs contact events and performs the action (call, whatsapp, email, brief, note).
 * 
 * This function is pure side-effect: it makes API calls and opens URLs/windows.
 */
export async function handleNextAction(params: HandleNextActionParams): Promise<void> {
  const { row, action, supabase, apiUrl, openNotes, runAIAnalysis } = params;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) return;

    if (action === 'call' && row.phone) {
      // Log contact event
      await fetch(`${apiUrl}/api/leads-contact-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          lead_id: row.id,
          channel: 'phone',
          note: 'Phone call initiated',
          update_status: true,
        }),
      }).catch(() => {}); // Non-blocking: continue even if logging fails

      // Open phone dialer
      window.location.href = `tel:${row.phone}`;
    } else if (action === 'whatsapp' && row.phone) {
      const wa = normalizePhoneToWhatsApp(row.phone);
      if (wa) {
        // Log contact event
        await fetch(`${apiUrl}/api/leads-contact-events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            lead_id: row.id,
            channel: 'whatsapp',
            note: 'WhatsApp message sent',
            update_status: true,
          }),
        }).catch(() => {}); // Non-blocking

        // Open WhatsApp with pre-filled message
        const url = `https://wa.me/${wa}?text=${encodeURIComponent(waMessageEN(row))}`;
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } else if (action === 'email' && row.email) {
      // Log contact event
      await fetch(`${apiUrl}/api/leads-contact-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          lead_id: row.id,
          channel: 'email',
          note: 'Email opened',
          update_status: true,
        }),
      }).catch(() => {}); // Non-blocking

      // Open email client
      window.location.href = `mailto:${row.email}`;
    } else if (action === 'brief') {
      // Open notes modal and trigger AI analysis
      openNotes(row.id);
      setTimeout(() => {
        if (row.id) runAIAnalysis(row.id);
      }, 500);
    } else if (action === 'note') {
      // Open notes modal
      openNotes(row.id);
    }
  } catch (err) {
    console.warn('[leadActions] Error logging contact event:', err);
    
    // Fallback: still perform the action even if logging fails
    if (action === 'call' && row.phone) {
      window.location.href = `tel:${row.phone}`;
    } else if (action === 'whatsapp' && row.phone) {
      const wa = normalizePhoneToWhatsApp(row.phone);
      if (wa) {
        const url = `https://wa.me/${wa}?text=${encodeURIComponent(waMessageEN(row))}`;
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } else if (action === 'email' && row.email) {
      window.location.href = `mailto:${row.email}`;
    }
  }
}



