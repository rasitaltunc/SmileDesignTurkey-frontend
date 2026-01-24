/**
 * Onboarding Card Schema
 * Defines card structure, questions, and conditional display logic
 */

export type CardQuestion =
  | { id: string; type: "select"; label: string; options: string[]; required?: boolean }
  | { id: string; type: "text"; label: string; required?: boolean; placeholder?: string }
  | { id: string; type: "yesno"; label: string; required?: boolean }
  | { id: string; type: "multiselect"; label: string; options: string[]; required?: boolean };

export type CardDef = {
  id: string;
  title: string;
  description?: string;
  rewardText?: string;
  questions: CardQuestion[];
  // conditional display (simple v1)
  showIf?: { questionId: string; equals: any };
};

export const ONBOARDING_CARDS: CardDef[] = [
  {
    id: "c0_prefs",
    title: "Preferences",
    rewardText: "Nice — we'll tailor your portal experience.",
    questions: [
      { id: "q_language", type: "select", label: "Preferred language", options: ["English", "Deutsch", "Français", "Español", "Italiano", "العربية", "Русский"], required: true },
      { id: "q_contact", type: "select", label: "Preferred contact method", options: ["WhatsApp", "Email", "In-portal chat"], required: true },
    ],
  },
  {
    id: "c1_goal",
    title: "Your Smile Goal",
    rewardText: "Great — your plan accuracy increased.",
    questions: [
      { id: "q_goal", type: "multiselect", label: "What do you want to improve?", options: ["Shape", "Color", "Gaps", "Alignment", "Missing teeth", "Pain"], required: true },
      { id: "q_style", type: "select", label: "Preferred style", options: ["Natural", "Hollywood white", "In-between"], required: true },
      { id: "q_ref", type: "text", label: "Any reference link/photo notes?", placeholder: "Optional" },
    ],
  },
  {
    id: "c2_urgency",
    title: "Current Situation",
    rewardText: "Thanks — we can prioritize correctly.",
    questions: [
      { id: "q_pain", type: "select", label: "Do you have pain now?", options: ["None", "Mild", "Moderate", "Severe"], required: true },
      { id: "q_urgent", type: "multiselect", label: "Urgent issues?", options: ["Broken tooth", "Infection", "Swelling", "Bleeding gums", "None"] },
    ],
  },
  // TODO: Add c3_treatment, c4_medical, c5_logistics, c6_drivers
];

