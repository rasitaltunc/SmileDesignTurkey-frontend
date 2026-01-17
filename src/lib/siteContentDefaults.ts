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
  whyUs: {
    title: "Why Choose GuideHealth?",
    subtitle: "We combine world-class dental care with personalized service, transparent pricing, and comprehensive support.",
    points: [
      {
        title: "Up to 70% Cost Savings",
        description: "Same quality treatments at a fraction of Western prices, without compromising on materials or expertise.",
        icon: "Award",
      },
      {
        title: "JCI Accredited Clinics",
        description: "All partner clinics meet international healthcare standards with state-of-the-art equipment and sterile environments.",
        icon: "Shield",
      },
      {
        title: "Licensed Specialists",
        description: "Board-certified dentists with 15+ years of experience, many trained internationally and fluent in multiple languages.",
        icon: "Users",
      },
    ],
  },
  packages: {
    title: "Treatment Packages",
    subtitle: "Comprehensive packages with transparent pricing. Final cost depends on clinical examination.",
    disclaimer: "All prices are starting ranges. Final quote provided after clinical examination and treatment planning.",
    items: [
      {
        name: "Single Implant Package",
        priceRange: "€800 - €1,500",
        includes: ["Implant placement", "Abutment", "Porcelain crown"],
        popular: false,
      },
    ],
  },
  testimonials: [],
  faq: [],
} as const;

