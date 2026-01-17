// src/lib/siteContentDefaults.ts
// Default safe values for siteContent/copy to prevent null crashes

export const DEFAULT_SITE_CONTENT = {
  whatsapp: {
    ctaText: "Ask on WhatsApp",
    defaultMessage: "Hello, I'm interested in learning more.",
  },
  seo: {
    home: { title: "Smile Design Turkey", description: "Dental tourism in Turkey" },
    treatments: { title: "Treatments", description: "Dental treatments" },
    process: { title: "Process", description: "Treatment process" },
    pricing: { title: "Pricing", description: "Treatment pricing" },
    reviews: { title: "Reviews", description: "Patient reviews" },
    faq: { title: "FAQ", description: "Frequently asked questions" },
    contact: { title: "Contact", description: "Contact us" },
    onboarding: { title: "Get Started", description: "Start your journey" },
    planDashboard: { title: "Your Plan", description: "Your treatment plan" },
  },
  cta: {
    primary: "Get Free Consultation",
    secondary: "Contact Us",
    final: {
      title: "Ready to Start?",
      subtitle: "Get started today",
      button: "Start Now",
    },
  },
} as const;

export const DEFAULT_COPY = {
  whatsapp: {
    ctaText: "Ask on WhatsApp",
    templates: {
      consultation: "Hello, I'm interested in a free consultation.",
      question: "Hello, I have a question.",
      pricing: "Hello, I'd like to learn about pricing.",
    },
  },
  hero: {
    headline: "Premium Dental Care in Turkey",
    subheadline: "World-class treatments at up to 70% savings. Licensed specialists, accredited clinics, and comprehensive aftercare.",
    ctaPrimary: "Get Free Consultation",
    ctaSecondary: "Ask on WhatsApp",
  },
  seo: {
    home: { title: "Smile Design Turkey", description: "Dental tourism in Turkey" },
    treatments: { title: "Treatments", description: "Dental treatments" },
    process: { title: "Process", description: "Treatment process" },
    pricing: { title: "Pricing", description: "Treatment pricing" },
    reviews: { title: "Reviews", description: "Patient reviews" },
    faq: { title: "FAQ", description: "Frequently asked questions" },
    contact: { title: "Contact", description: "Contact us" },
    onboarding: { title: "Get Started", description: "Start your journey" },
    planDashboard: { title: "Your Plan", description: "Your treatment plan" },
  },
  cta: {
    primary: "Get Free Consultation",
    final: {
      title: "Ready to Start?",
      subtitle: "Get started today",
    },
  },
  disclaimer: {
    medical: "This website provides information only. Consult with a qualified dentist for medical advice. Individual results may vary.",
    ethics: "",
    warranty: "",
  },
  process: {
    title: "Your Treatment Journey",
    subtitle: "From initial consultation to lifetime aftercare, we guide you every step",
    steps: [],
  },
} as const;

