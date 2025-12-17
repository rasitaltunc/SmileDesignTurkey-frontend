export type Language = 'en' | 'tr';

export interface CopyContent {
  lang: Language;
  
  hero: {
    headline: string;
    subheadline: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  
  aria?: {
    heroPrimary?: string;
    whatsapp?: string;
    pricingCta?: string;
    contactSubmit?: string;
  };
  
  micro?: {
    noSpam?: string;
    responseTime?: string;
  };
  
  trust: {
    title: string;
    badges: Array<{
      icon: string;
      title: string;
      description: string;
    }>;
  };
  
  proofStrip: {
    items: Array<{
      icon: string;
      text: string;
      hint?: string;
    }>;
  };
  
  trustPack: {
    title: string;
    subtitle?: string;
    badges: Array<{
      icon: string;
      title: string;
      description: string;
      note?: string;
    }>;
  };
  
  aftercareBlock: {
    aftercare: {
      title: string;
      description: string;
      items: string[];
    };
    safety: {
      title: string;
      description: string;
      items: string[];
    };
    cta?: {
      headline: string;
      promise: string;
    };
  };
  
  trustAftercare?: {
    title: string;
    subtitle: string;
    bullets: string[];
    cta: {
      primary: string;
      secondary: string;
    };
    disclaimer: string;
  };
  
  inclusionsList: {
    title: string;
    subtitle: string;
    note: string;
    categories: Array<{
      title: string;
      items: string[];
    }>;
  };
  
  clinicalStandards: {
    title: string;
    subtitle: string;
    sections: Array<{
      title: string;
      icon: string;
      items: string[];
    }>;
  };
  
  treatments: Array<{
    id: string;
    name: string;
    shortDescription: string;
    idealCandidate: string[];
    duration: string;
    priceRange: string;
  }>;
  
  process: {
    title: string;
    subtitle: string;
    steps: Array<{
      number: number;
      title: string;
      description: string;
      icon: string;
    }>;
  };
  
  whyUs: {
    title: string;
    subtitle: string;
    points: Array<{
      title: string;
      description: string;
      icon: string;
    }>;
  };
  
  packages: {
    title: string;
    subtitle: string;
    disclaimer: string;
    items: Array<{
      name: string;
      priceRange: string;
      includes: string[];
      popular?: boolean;
    }>;
    transparency?: {
      title: string;
      note: string;
      bullets: string[];
      microDisclaimer: string;
    };
    valueBadges?: string[];
  };
  
  testimonials: Array<{
    name: string;
    location: string;
    treatment: string;
    rating: number;
    text: string;
    date: string;
  }>;
  
  faq: Array<{
    category: string;
    question: string;
    answer: string;
  }>;
  
  whatsapp: {
    ctaText: string;
    templates: {
      consultation: string;
      question: string;
      pricing: string;
    };
  };
  
  cta: {
    final: {
      title: string;
      subtitle: string;
    };
    learnMore: string;
    contactUs: string;
    hero?: {
      primary: string;
      primaryHint: string;
      secondary: string;
      secondaryHint: string;
    };
    pricing?: {
      packageCta: string;
      packageHint: string;
    };
    contact?: {
      submit: string;
      submitHint: string;
    };
    onboarding?: {
      start: string;
      startHint: string;
      finish: string;
      finishHint: string;
    };
    trust?: {
      proof: string;
      proofHint: string;
    };
  };
  
  disclaimer: {
    medical: string;
    ethics: string;
    warranty: string;
  };
  
  seo: {
    home: { title: string; description: string };
    treatments: { title: string; description: string };
    process: { title: string; description: string };
    pricing: { title: string; description: string };
    reviews: { title: string; description: string };
    faq: { title: string; description: string };
    contact: { title: string; description: string };
    onboarding: { title: string; description: string };
    planDashboard: { title: string; description: string };
  };
}

const copyEn: CopyContent = {
  lang: 'en',
  hero: {
    headline: 'Premium Dental Care Abroad',
    subheadline: 'World-class treatments at up to 70% savings. Licensed specialists, accredited clinics, and comprehensive aftercare.',
    ctaPrimary: 'Get Free Consultation',
    ctaSecondary: 'Ask on WhatsApp',
  },
  trust: {
    title: 'Why Patients Trust GuideHealth',
    badges: [
      {
        icon: 'Shield',
        title: 'JCI Accredited Clinics',
        description: 'International healthcare standards and sterile environments',
      },
      {
        icon: 'Award',
        title: 'Licensed Dentists',
        description: 'Board-certified specialists with 15+ years experience',
      },
      {
        icon: 'Heart',
        title: 'Lifetime Warranty',
        description: 'Comprehensive aftercare and ongoing support included',
      },
      {
        icon: 'CheckCircle',
        title: 'Transparent Pricing',
        description: 'No hidden fees. Final quote after clinical examination',
      },
    ],
  },
  
  proofStrip: {
    items: [
      { icon: 'Shield', text: 'Medical-grade sterilization', hint: 'Strict hygiene protocols across every step.' },
      { icon: 'Award', text: 'Digital smile planning', hint: 'A clearer plan before treatment begins.' },
      { icon: 'CheckCircle', text: 'Transparent package pricing', hint: 'Know what\'s included — no surprises.' },
      { icon: 'Users', text: 'Coordinator support', hint: 'A dedicated point of contact from start to finish.' },
      { icon: 'Heart', text: 'Aftercare guidance', hint: 'Support after you return home.' },
      { icon: 'CheckCircle', text: 'Fast WhatsApp support', hint: 'Quick answers when you need them.' },
    ],
  },
  
  trustPack: {
    title: 'Trust, built into every step',
    subtitle: 'A premium process designed for clarity, comfort, and clinical quality — with placeholders ready for real clinic proof (certificates, team, photos).',
    badges: [
      {
        icon: 'Shield',
        title: 'Clinical standards',
        description: 'Hygiene-first workflow, quality materials, and careful checks — aligned with modern clinical practices.',
        note: 'Clinic proof (certificates, team credentials, before/after cases) will be added here.',
      },
      {
        icon: 'Award',
        title: 'Planning & predictability',
        description: 'Digital planning and a step-by-step timeline so you know what happens, when, and why.',
      },
      {
        icon: 'Heart',
        title: 'Support & logistics',
        description: 'A coordinator who helps with scheduling, messaging, and smooth arrival-to-return flow.',
      },
    ],
  },
  
  aftercareBlock: {
    aftercare: {
      title: 'Comprehensive Aftercare',
      description: 'Every treatment includes lifetime warranty, remote consultations, and 24/7 support. Your dedicated coordinator remains available for follow-up care, maintenance guidance, and any questions long after your treatment is complete.',
      items: [
        'Lifetime warranty on implants and major procedures',
        'Remote video consultations included',
        '24/7 patient support hotline',
        'Maintenance guides and follow-up care',
      ],
    },
    safety: {
      title: 'Safety & Quality Standards',
      description: 'All partner clinics meet international standards. Strict sterilization protocols, disposable instruments, and regular facility inspections ensure your safety throughout treatment.',
      items: [
        'Accredited facilities only (documentation available)',
        'Sterile environments with disposable instruments',
        'Regular safety inspections and certifications',
        'Quality assurance protocols in place',
      ],
    },
    cta: {
      headline: 'Your smile, supported for the long term.',
      promise: 'Get comprehensive aftercare and lifetime support with every treatment. Post-treatment check-ins, care instructions, and fast support via WhatsApp included.',
    },
  },
  
  inclusionsList: {
    title: "What's Included in Every Package",
    subtitle: 'Transparent pricing with no hidden fees. Here\'s exactly what\'s included in your treatment plan.',
    note: 'Note: Accommodation and flights are separate, but we provide recommendations and assistance with booking. Final pricing is confirmed after clinical examination.',
    categories: [
      {
        title: 'Initial Consultation',
        items: [
          'Video consultation',
          'Clinical examination',
          'X-rays & 3D imaging',
          'Treatment planning',
        ],
      },
      {
        title: 'Treatment & Materials',
        items: [
          'All procedures',
          'Premium materials',
          'Anesthesia',
          'Follow-up visits',
        ],
      },
      {
        title: 'Support Services',
        items: [
          'Dedicated coordinator',
          'Airport transfer',
          'Accommodation assistance',
          'Translation services',
        ],
      },
      {
        title: 'Aftercare',
        items: [
          'Lifetime warranty',
          'Remote consultations',
          '24/7 support',
          'Maintenance guides',
        ],
      },
    ],
  },
  
  clinicalStandards: {
    title: 'Clinical Standards & Quality Assurance',
    subtitle: 'Our commitment to safety, sterilization, and clinical excellence ensures your peace of mind.',
    sections: [
      {
        title: 'Sterilization Protocols',
        icon: 'Shield',
        items: [
          'Autoclave sterilization for all instruments',
          'Disposable instruments where appropriate',
          'Sterile environment maintenance',
          'Regular facility inspections',
        ],
      },
      {
        title: 'Premium Materials',
        icon: 'Package',
        items: [
          'Zirconia crowns & E-max veneers',
          'Top-tier implant systems (Straumann, Nobel)',
          'Manufacturer warranties included',
          'International quality standards',
        ],
      },
      {
        title: 'Treatment Planning',
        icon: 'FileText',
        items: [
          'Comprehensive clinical examination',
          '3D imaging & digital planning',
          'Transparent pricing breakdown',
          'Patient consent & documentation',
        ],
      },
    ],
  },
  treatments: [
    {
      id: 'implants',
      name: 'Dental Implants',
      shortDescription: 'Permanent tooth replacement with 98% success rate and lifetime warranty',
      idealCandidate: [
        'Missing one or more teeth',
        'Adequate bone density',
        'Good oral hygiene',
        'Non-smoker preferred',
      ],
      duration: '3-6 months',
      priceRange: 'Starting from €800 per implant',
    },
    {
      id: 'veneers',
      name: 'Porcelain Veneers',
      shortDescription: 'Transform your smile with custom-crafted porcelain veneers',
      idealCandidate: [
        'Discolored or stained teeth',
        'Minor misalignment',
        'Gaps between teeth',
        'Worn or chipped teeth',
      ],
      duration: '2 visits (1 week)',
      priceRange: 'Starting from €300 per tooth',
    },
    {
      id: 'crowns',
      name: 'Dental Crowns',
      shortDescription: 'Restore damaged teeth with premium zirconia or E-max crowns',
      idealCandidate: [
        'Cracked or broken teeth',
        'Large fillings',
        'Root canal treated teeth',
        'Cosmetic enhancement',
      ],
      duration: '2-3 visits',
      priceRange: 'Starting from €250 per crown',
    },
    {
      id: 'all-on-4',
      name: 'All-on-4 Implants',
      shortDescription: 'Full arch restoration with just 4 implants. Fixed teeth in 24-48 hours',
      idealCandidate: [
        'Multiple missing teeth',
        'Full arch restoration needed',
        'Bone loss concerns',
        'Denture replacement',
      ],
      duration: '2-3 days',
      priceRange: 'Starting from €8,000 per arch',
    },
    {
      id: 'whitening',
      name: 'Professional Whitening',
      shortDescription: 'In-office whitening for immediate, dramatic results',
      idealCandidate: [
        'Healthy teeth and gums',
        'Stained or discolored teeth',
        'Maintenance after other treatments',
        'Special events preparation',
      ],
      duration: '1 visit',
      priceRange: 'Starting from €200',
    },
  ],
  process: {
    title: 'Your Treatment Journey',
    subtitle: 'From initial consultation to lifetime aftercare, we guide you every step',
    steps: [
      {
        number: 1,
        title: 'Free Consultation',
        description: 'Video consultation with our coordinator. Share your goals, medical history, and receive a preliminary treatment plan.',
        icon: 'Video',
      },
      {
        number: 2,
        title: 'Arrival & Examination',
        description: 'Airport pickup, clinic visit, and comprehensive clinical examination with X-rays and 3D imaging.',
        icon: 'Plane',
      },
      {
        number: 3,
        title: 'Treatment Planning',
        description: 'Detailed treatment plan with transparent pricing, timeline, and material options. Final quote after examination.',
        icon: 'FileText',
      },
      {
        number: 4,
        title: 'Treatment',
        description: 'Expert care in sterile, modern facilities. Regular updates and transparent communication throughout.',
        icon: 'Heart',
      },
      {
        number: 5,
        title: 'Aftercare & Support',
        description: 'Lifetime warranty, remote consultations, and 24/7 support. Maintenance guides and follow-up care included.',
        icon: 'Headphones',
      },
    ],
  },
  whyUs: {
    title: 'Why Choose GuideHealth?',
    subtitle: 'We combine world-class dental care with personalized service, transparent pricing, and comprehensive support.',
    points: [
      {
        title: 'Up to 70% Cost Savings',
        description: 'Same quality treatments at a fraction of Western prices, without compromising on materials or expertise.',
        icon: 'Award',
      },
      {
        title: 'JCI Accredited Clinics',
        description: 'All partner clinics meet international healthcare standards with state-of-the-art equipment and sterile environments.',
        icon: 'Shield',
      },
      {
        title: 'Licensed Specialists',
        description: 'Board-certified dentists with 15+ years of experience, many trained internationally and fluent in multiple languages.',
        icon: 'Users',
      },
      {
        title: 'Lifetime Warranty & Support',
        description: 'Comprehensive warranties on all major treatments, plus 24/7 aftercare support and remote consultations.',
        icon: 'Heart',
      },
      {
        title: 'Transparent Pricing',
        description: 'No hidden fees. Detailed quotes after clinical examination. All costs explained upfront.',
        icon: 'CheckCircle',
      },
      {
        title: 'Dedicated Care Coordinator',
        description: 'Personal coordinator guides you from consultation to aftercare, handling travel, appointments, and all logistics.',
        icon: 'Headphones',
      },
    ],
  },
  packages: {
    title: 'Treatment Packages',
    subtitle: 'Comprehensive packages with transparent pricing. Final cost depends on clinical examination.',
    disclaimer: 'All prices are starting ranges. Final quote provided after clinical examination and treatment planning.',
    transparency: {
      title: 'Transparent packages. No surprises.',
      note: 'Your final plan is confirmed after a clinical evaluation. We share what\'s included upfront and explain any optional add-ons before anything starts.',
      bullets: [
        'Upfront package scope (what\'s included / not included)',
        'Optional procedures explained before approval',
        'Case-based plan — every smile is different',
      ],
      microDisclaimer: 'Medical information is general and does not replace professional diagnosis.',
    },
    valueBadges: [
      'Clear package scope',
      'Case-based planning',
      'Coordinator support',
      'Aftercare guidance',
    ],
    items: [
      {
        name: 'Single Implant Package',
        priceRange: '€800 - €1,500',
        includes: [
          'Implant placement',
          'Abutment',
          'Porcelain crown',
          '1 year warranty',
          'Follow-up consultations',
        ],
      },
      {
        name: 'Smile Makeover Package',
        priceRange: '€3,000 - €6,000',
        includes: [
          '8-10 Porcelain veneers',
          'Professional whitening',
          'Design consultation',
          'Lifetime maintenance',
          'Aftercare support',
        ],
        popular: true,
      },
      {
        name: 'Full Mouth Restoration',
        priceRange: '€15,000 - €25,000',
        includes: [
          'All-on-4 or All-on-6 implants',
          'Full arch restoration',
          'Temporary & final prosthetics',
          'Lifetime warranty',
          '24/7 support',
        ],
      },
    ],
  },
  testimonials: [
    {
      name: 'Sarah Johnson',
      location: 'London, UK',
      treatment: 'All-on-4 Implants',
      rating: 5,
      text: 'After years of avoiding dental work due to cost, GuideHealth made it possible. The clinic was immaculate, the dentists were highly skilled, and the aftercare has been exceptional. I couldn\'t be happier with my results.',
      date: 'December 2024',
    },
    {
      name: 'Michael Chen',
      location: 'New York, USA',
      treatment: 'Porcelain Veneers',
      rating: 5,
      text: 'The entire process was professional from start to finish. Saved over $15,000 compared to US prices, and the quality is outstanding. The coordinator was always available, and the treatment exceeded my expectations.',
      date: 'November 2024',
    },
    {
      name: 'Emma Schmidt',
      location: 'Berlin, Germany',
      treatment: 'Dental Implants',
      rating: 5,
      text: 'I was nervous about traveling for treatment, but the team made everything seamless. The clinic met international standards, the dentists spoke perfect English, and my new smile is incredible. Highly recommend.',
      date: 'October 2024',
    },
  ],
  faq: [
    {
      category: 'Safety & Quality',
      question: 'Are the clinics and dentists licensed and accredited?',
      answer: 'Yes. All our partner clinics are JCI (Joint Commission International) accredited and meet international healthcare standards. All dentists are licensed, board-certified, and many have 15+ years of experience with international training.',
    },
    {
      category: 'Safety & Quality',
      question: 'What safety measures are in place?',
      answer: 'Our clinics follow strict sterilization protocols, use disposable instruments where appropriate, and maintain sterile environments. All facilities are regularly inspected and meet international safety standards.',
    },
    {
      category: 'Treatment',
      question: 'How long does treatment take?',
      answer: 'Treatment duration varies by procedure. Simple treatments like whitening take 1 visit. Implants typically require 2-3 visits over 3-6 months. All-on-4 can be completed in 2-3 days. Your personalized plan will include a detailed timeline.',
    },
    {
      category: 'Treatment',
      question: 'Will I experience pain during treatment?',
      answer: 'Modern dental techniques and local anesthesia ensure minimal discomfort. For more complex procedures, sedation options are available. Most patients report minimal to no pain during treatment.',
    },
    {
      category: 'Treatment',
      question: 'What materials do you use?',
      answer: 'We use premium, internationally recognized materials: Zirconia crowns, E-max veneers, and top-tier implant systems (Straumann, Nobel Biocare). All materials come with manufacturer warranties and meet international standards.',
    },
    {
      category: 'Pricing',
      question: 'What is included in the price?',
      answer: 'All prices include consultation, treatment, materials, and initial aftercare. Accommodation and flights are separate, but we provide recommendations. Final pricing is confirmed after clinical examination.',
    },
    {
      category: 'Pricing',
      question: 'Are there any hidden fees?',
      answer: 'No. We believe in complete transparency. Your personalized quote includes all treatment costs. Any additional services (sedation, translation) are clearly outlined and optional.',
    },
    {
      category: 'Warranty & Aftercare',
      question: 'What warranty do you offer?',
      answer: 'Most treatments include warranties: implants typically have 5-10 year warranties, veneers 5-7 years. We also provide lifetime support and can coordinate with local dentists for follow-up care if needed.',
    },
    {
      category: 'Warranty & Aftercare',
      question: 'What happens if something goes wrong after treatment?',
      answer: 'All treatments include warranties. If issues arise, contact your coordinator immediately. We provide virtual consultations, coordinate with local dentists, or arrange return visits if necessary. Our clinics are fully insured.',
    },
    {
      category: 'Travel',
      question: 'Do you help with travel arrangements?',
      answer: 'Yes. We provide airport pickup, hotel recommendations near the clinic, and can assist with visa applications if needed. Our coordinators speak multiple languages and are available 24/7 during your stay.',
    },
    {
      category: 'Travel',
      question: 'How long do I need to stay?',
      answer: 'Stay duration depends on your treatment. Simple procedures may require 2-3 days, while complex treatments could need 7-10 days. Your personalized plan will include recommended stay duration.',
    },
    {
      category: 'Timeline',
      question: 'How quickly can I get started?',
      answer: 'After your free consultation, you\'ll receive a preliminary treatment plan within 24-48 hours. Once you approve, we can schedule your visit. Typical lead time is 2-4 weeks, depending on availability.',
    },
    {
      category: 'Timeline',
      question: 'How long will results last?',
      answer: 'With proper care, implants can last a lifetime. Veneers typically last 10-15 years, crowns 10-20 years. We provide detailed maintenance instructions and lifetime support to ensure long-lasting results.',
    },
  ],
  whatsapp: {
    ctaText: 'Ask on WhatsApp',
    templates: {
      consultation: 'Hello, I\'m interested in a free consultation. Could you provide more information about treatment options?',
      question: 'Hello, I have a question about dental treatment. Could you help me?',
      pricing: 'Hello, I\'d like to learn more about pricing and treatment packages. Could you provide details?',
    },
  },
  cta: {
    final: {
      title: 'Ready to Start Your Journey?',
      subtitle: 'Get your personalized treatment plan from licensed specialists. Transparent pricing, comprehensive aftercare, and lifetime support.',
    },
    learnMore: 'Learn More',
    contactUs: 'Contact Us',
    hero: {
      primary: 'Get a free consultation',
      primaryHint: 'Share your goals — we\'ll suggest a preliminary plan.',
      secondary: 'WhatsApp',
      secondaryHint: 'Fast answers. No spam.',
    },
    pricing: {
      packageCta: 'Request a package quote',
      packageHint: 'We\'ll confirm after a clinical check — no surprises.',
    },
    contact: {
      submit: 'Send my request',
      submitHint: 'We reply within 24 hours (often faster).',
    },
    onboarding: {
      start: 'Start in 2 minutes',
      startHint: 'Answer a few questions to match your needs.',
      finish: 'Get my plan',
      finishHint: 'We\'ll follow up with next steps.',
    },
    trust: {
      proof: 'Built for safety, clarity, and comfort',
      proofHint: 'Evidence (certificates/cases) can be plugged in here later.',
    },
  },
  
  aria: {
    heroPrimary: 'Open free consultation flow',
    whatsapp: 'Open WhatsApp chat',
    pricingCta: 'Request package quote',
    contactSubmit: 'Submit contact form',
  },
  
  micro: {
    noSpam: 'No spam. Your data stays private.',
    responseTime: 'Typical response: within 24 hours.',
  },
  disclaimer: {
    medical: 'This website provides information only. Consult with a qualified dentist for medical advice. Individual results may vary.',
    ethics: 'We are committed to ethical practices and patient safety. All treatments are performed by licensed professionals in accredited facilities.',
    warranty: 'Warranty terms vary by treatment type and are outlined in your treatment agreement. Regular maintenance and follow-up care are required.',
  },
  seo: {
    home: {
      title: 'Premium Dental Tourism | GuideHealth - Licensed Specialists, Accredited Clinics',
      description: 'World-class dental treatments abroad at up to 70% savings. JCI accredited clinics, licensed dentists, lifetime warranty. Get your free consultation.',
    },
    treatments: {
      title: 'Dental Treatments | Implants, Veneers, Crowns | GuideHealth',
      description: 'Comprehensive dental treatments: implants, veneers, crowns, All-on-4, and whitening. Licensed specialists, premium materials, lifetime warranty.',
    },
    process: {
      title: 'Treatment Process | Step-by-Step Guide | GuideHealth',
      description: 'From free consultation to lifetime aftercare. Learn about our treatment process, safety measures, and patient support.',
    },
    pricing: {
      title: 'Transparent Pricing | Treatment Packages | GuideHealth',
      description: 'Transparent pricing for dental treatments abroad. Starting from €200. Final quote after clinical examination. No hidden fees.',
    },
    reviews: {
      title: 'Patient Reviews & Testimonials | GuideHealth',
      description: 'Read verified patient reviews and testimonials. 5-star rated service with comprehensive aftercare and lifetime support.',
    },
    faq: {
      title: 'Frequently Asked Questions | Dental Tourism FAQ | GuideHealth',
      description: 'Common questions about dental tourism, safety, pricing, warranties, and aftercare. Get answers from licensed specialists.',
    },
    contact: {
      title: 'Contact Us | GuideHealth',
      description: 'Get in touch with GuideHealth for inquiries, support, or to start your free dental consultation. Multilingual support available.',
    },
    onboarding: {
      title: 'Start Your Dental Plan | GuideHealth',
      description: 'Begin your personalized dental treatment journey with a free online consultation from GuideHealth.',
    },
    planDashboard: {
      title: 'Your Personalized Plan | GuideHealth',
      description: 'View your personalized dental treatment plan and next steps with GuideHealth.',
    },
  },
};

const copyTr: CopyContent = {
  lang: 'tr',
  hero: {
    headline: 'Yurtdışında Premium Diş Tedavisi',
    subheadline: 'Dünya standartlarında tedaviler, %70\'e varan tasarruf. Lisanslı uzmanlar, akredite klinikler ve kapsamlı sonrası bakım.',
    ctaPrimary: 'Ücretsiz Konsültasyon Alın',
    ctaSecondary: 'WhatsApp\'tan Sorun',
  },
  trust: {
    title: 'Hastalar Neden GuideHealth\'e Güveniyor',
    badges: [
      {
        icon: 'Shield',
        title: 'JCI Akrediteli Klinikler',
        description: 'Uluslararası sağlık standartları ve steril ortamlar',
      },
      {
        icon: 'Award',
        title: 'Lisanslı Diş Hekimleri',
        description: '15+ yıl deneyime sahip sertifikalı uzmanlar',
      },
      {
        icon: 'Heart',
        title: 'Ömür Boyu Garanti',
        description: 'Kapsamlı sonrası bakım ve sürekli destek dahil',
      },
      {
        icon: 'CheckCircle',
        title: 'Şeffaf Fiyatlandırma',
        description: 'Gizli ücret yok. Klinik muayene sonrası nihai fiyat',
      },
    ],
  },
  
  proofStrip: {
    items: [
      { icon: 'Shield', text: 'Medikal sterilizasyon', hint: 'Her adımda hijyen odaklı protokol.' },
      { icon: 'Award', text: 'Dijital gülüş planlama', hint: 'Tedavi öncesi daha net bir plan.' },
      { icon: 'CheckCircle', text: 'Şeffaf paket fiyatları', hint: 'Dahil olanlar net — sürpriz yok.' },
      { icon: 'Users', text: 'Koordinatör desteği', hint: 'Süreç boyunca tek bir muhatap.' },
      { icon: 'Heart', text: 'Tedavi sonrası rehberlik', hint: 'Ülkenize döndükten sonra da destek.' },
      { icon: 'CheckCircle', text: 'Hızlı WhatsApp desteği', hint: 'İhtiyacınız olduğunda hızlı yanıt.' },
    ],
  },
  
  trustPack: {
    title: 'Güven, her adımın içinde',
    subtitle: 'Netlik, konfor ve klinik kalite için tasarlanmış premium bir süreç — gerçek kanıtlar (sertifika/ekip/fotoğraf) sonradan kolayca eklenebilir.',
    badges: [
      {
        icon: 'Shield',
        title: 'Klinik standartlar',
        description: 'Hijyen odaklı iş akışı, kaliteli materyaller ve dikkatli kontroller — modern klinik uygulamalarla uyumlu.',
        note: 'Klinik kanıtlar (sertifikalar, ekip yetkinlikleri, vaka örnekleri) buraya eklenecek.',
      },
      {
        icon: 'Award',
        title: 'Planlama ve öngörülebilirlik',
        description: 'Dijital planlama ve adım adım zaman çizelgesi: ne, ne zaman, neden — hepsi net.',
      },
      {
        icon: 'Heart',
        title: 'Destek ve lojistik',
        description: 'Randevu, iletişim ve süreç akışında size eşlik eden koordinatör desteği.',
      },
    ],
  },
  
  aftercareBlock: {
    aftercare: {
      title: 'Kapsamlı Sonrası Bakım',
      description: 'Her tedavi ömür boyu garanti, uzaktan konsültasyonlar ve 7/24 destek içerir. Özel koordinatörünüz, tedavi tamamlandıktan çok sonra bile takip bakımı, bakım rehberliği ve herhangi bir soru için mevcut kalır.',
      items: [
        'İmplantlar ve ana prosedürlerde ömür boyu garanti',
        'Uzaktan video konsültasyonlar dahil',
        '7/24 hasta destek hattı',
        'Bakım kılavuzları ve takip bakımı',
      ],
    },
    safety: {
      title: 'Güvenlik ve Kalite Standartları',
      description: 'Tüm ortak kliniklerimiz uluslararası standartları karşılar. Katı sterilizasyon protokolleri, tek kullanımlık aletler ve düzenli tesis denetimleri, tedaviniz boyunca güvenliğinizi sağlar.',
      items: [
        'Yalnızca akrediteli tesisler (dokümantasyon mevcut)',
        'Tek kullanımlık aletlerle steril ortamlar',
        'Düzenli güvenlik denetimleri ve sertifikalar',
        'Kalite güvence protokolleri mevcut',
      ],
    },
    cta: {
      headline: 'Gülüşünüz, uzun vadede desteklenir.',
      promise: 'Her tedavi ile kapsamlı sonrası bakım ve ömür boyu destek alın. Tedavi sonrası kontroller, bakım talimatları ve WhatsApp üzerinden hızlı destek dahil.',
    },
  },
  
  trustAftercare: {
    title: 'Gülüşünüz, uzun vadede de desteklenir',
    subtitle: 'Tedavi bitince ortadan kaybolmuyoruz. Ülkenize döndükten sonra da net rehberlik ve hızlı destek sunuyoruz.',
    bullets: [
      'Tedavi sonrası kontrol ve bakım rehberi',
      'İyileşme ve kullanım için net talimatlar',
      'Sorular için hızlı WhatsApp desteği',
    ],
    cta: {
      primary: 'Ücretsiz konsültasyon alın',
      secondary: 'WhatsApp\'tan yazın',
    },
    disclaimer: 'Bu sitedeki bilgiler genel bilgilendirme amaçlıdır ve tıbbi tanı yerine geçmez. Tedavi planı ve sonuçlar kişiye göre değişir.',
  },
  
  inclusionsList: {
    title: 'Her Pakette Neler Dahil',
    subtitle: 'Gizli ücret olmayan şeffaf fiyatlandırma. Tedavi planınızda tam olarak nelerin dahil olduğu.',
    note: 'Not: Konaklama ve uçuşlar ayrıdır, ancak öneriler ve rezervasyon yardımı sağlıyoruz. Nihai fiyatlandırma klinik muayene sonrası onaylanır.',
    categories: [
      {
        title: 'İlk Konsültasyon',
        items: [
          'Video konsültasyon',
          'Klinik muayene',
          'Röntgen ve 3D görüntüleme',
          'Tedavi planlaması',
        ],
      },
      {
        title: 'Tedavi ve Malzemeler',
        items: [
          'Tüm prosedürler',
          'Premium malzemeler',
          'Anestezi',
          'Takip ziyaretleri',
        ],
      },
      {
        title: 'Destek Hizmetleri',
        items: [
          'Özel koordinatör',
          'Havalimanı transferi',
          'Konaklama yardımı',
          'Çeviri hizmetleri',
        ],
      },
      {
        title: 'Sonrası Bakım',
        items: [
          'Ömür boyu garanti',
          'Uzaktan konsültasyonlar',
          '7/24 destek',
          'Bakım kılavuzları',
        ],
      },
    ],
  },
  
  clinicalStandards: {
    title: 'Klinik Standartlar ve Kalite Güvencesi',
    subtitle: 'Güvenlik, sterilizasyon ve klinik mükemmelliğe olan bağlılığımız, içinizin rahat olmasını sağlar.',
    sections: [
      {
        title: 'Sterilizasyon Protokolleri',
        icon: 'Shield',
        items: [
          'Tüm aletler için otoklav sterilizasyonu',
          'Uygun yerlerde tek kullanımlık aletler',
          'Steril ortam bakımı',
          'Düzenli tesis denetimleri',
        ],
      },
      {
        title: 'Premium Malzemeler',
        icon: 'Package',
        items: [
          'Zirkonya kronlar ve E-max laminalar',
          'Üst düzey implant sistemleri (Straumann, Nobel)',
          'Üretici garantileri dahil',
          'Uluslararası kalite standartları',
        ],
      },
      {
        title: 'Tedavi Planlaması',
        icon: 'FileText',
        items: [
          'Kapsamlı klinik muayene',
          '3D görüntüleme ve dijital planlama',
          'Şeffaf fiyatlandırma dökümü',
          'Hasta onayı ve dokümantasyon',
        ],
      },
    ],
  },
  
  treatments: [
    {
      id: 'implants',
      name: 'Diş İmplantı',
      shortDescription: '%98 başarı oranı ve ömür boyu garanti ile kalıcı diş replasmanı',
      idealCandidate: [
        'Bir veya daha fazla diş eksikliği',
        'Yeterli kemik yoğunluğu',
        'İyi ağız hijyeni',
        'Sigara içmeyen tercih edilir',
      ],
      duration: '3-6 ay',
      priceRange: 'İmplant başına €800\'den başlayan fiyatlar',
    },
    {
      id: 'veneers',
      name: 'Porselen Lamina',
      shortDescription: 'Özel tasarlanmış porselen laminalarla gülüşünüzü dönüştürün',
      idealCandidate: [
        'Renk değişikliği veya lekeli dişler',
        'Hafif çarpıklık',
        'Dişler arası boşluklar',
        'Aşınmış veya kırık dişler',
      ],
      duration: '2 ziyaret (1 hafta)',
      priceRange: 'Diş başına €300\'den başlayan fiyatlar',
    },
    {
      id: 'crowns',
      name: 'Diş Kronu',
      shortDescription: 'Premium zirkonya veya E-max kronlarla hasarlı dişleri restore edin',
      idealCandidate: [
        'Çatlak veya kırık dişler',
        'Büyük dolgular',
        'Kanal tedavisi görmüş dişler',
        'Kozmetik iyileştirme',
      ],
      duration: '2-3 ziyaret',
      priceRange: 'Kron başına €250\'den başlayan fiyatlar',
    },
    {
      id: 'all-on-4',
      name: 'All-on-4 İmplant',
      shortDescription: 'Sadece 4 implant ile tam çene restorasyonu. 24-48 saatte sabit dişler',
      idealCandidate: [
        'Çoklu diş eksikliği',
        'Tam çene restorasyonu gerekli',
        'Kemik kaybı endişeleri',
        'Protez değişimi',
      ],
      duration: '2-3 gün',
      priceRange: 'Çene başına €8.000\'den başlayan fiyatlar',
    },
    {
      id: 'whitening',
      name: 'Profesyonel Beyazlatma',
      shortDescription: 'Anında, dramatik sonuçlar için klinik beyazlatma',
      idealCandidate: [
        'Sağlıklı dişler ve diş etleri',
        'Lekeli veya renk değişikliği olan dişler',
        'Diğer tedavilerden sonra bakım',
        'Özel etkinlik hazırlığı',
      ],
      duration: '1 ziyaret',
      priceRange: '€200\'den başlayan fiyatlar',
    },
  ],
  process: {
    title: 'Tedavi Yolculuğunuz',
    subtitle: 'İlk konsültasyondan ömür boyu sonrası bakıma kadar, her adımda yanınızdayız',
    steps: [
      {
        number: 1,
        title: 'Ücretsiz Konsültasyon',
        description: 'Koordinatörümüzle video konsültasyon. Hedeflerinizi, tıbbi geçmişinizi paylaşın ve ön tedavi planı alın.',
        icon: 'Video',
      },
      {
        number: 2,
        title: 'Varış ve Muayene',
        description: 'Havalimanı karşılama, klinik ziyareti ve röntgen ve 3D görüntüleme ile kapsamlı klinik muayene.',
        icon: 'Plane',
      },
      {
        number: 3,
        title: 'Tedavi Planlama',
        description: 'Şeffaf fiyatlandırma, zaman çizelgesi ve malzeme seçenekleri ile detaylı tedavi planı. Muayene sonrası nihai fiyat teklifi.',
        icon: 'FileText',
      },
      {
        number: 4,
        title: 'Tedavi',
        description: 'Steril, modern tesislerde uzman bakım. Düzenli güncellemeler ve şeffaf iletişim.',
        icon: 'Heart',
      },
      {
        number: 5,
        title: 'Sonrası Bakım ve Destek',
        description: 'Ömür boyu garanti, uzaktan konsültasyonlar ve 7/24 destek. Bakım kılavuzları ve takip bakımı dahil.',
        icon: 'Headphones',
      },
    ],
  },
  whyUs: {
    title: 'Neden GuideHealth\'i Seçmelisiniz?',
    subtitle: 'Dünya standartlarında diş bakımını kişiselleştirilmiş hizmet, şeffaf fiyatlandırma ve kapsamlı destekle birleştiriyoruz.',
    points: [
      {
        title: '%70\'e Varan Maliyet Tasarrufu',
        description: 'Malzeme veya uzmanlıktan ödün vermeden, Batı fiyatlarının bir kısmına aynı kalitede tedaviler.',
        icon: 'Award',
      },
      {
        title: 'JCI Akrediteli Klinikler',
        description: 'Tüm ortak kliniklerimiz, son teknoloji ekipman ve steril ortamlarla uluslararası sağlık standartlarını karşılar.',
        icon: 'Shield',
      },
      {
        title: 'Lisanslı Uzmanlar',
        description: '15+ yıl deneyime sahip sertifikalı diş hekimleri, birçoğu uluslararası eğitimli ve çok dilli.',
        icon: 'Users',
      },
      {
        title: 'Ömür Boyu Garanti ve Destek',
        description: 'Tüm ana tedavilerde kapsamlı garantiler, artı 7/24 sonrası bakım desteği ve uzaktan konsültasyonlar.',
        icon: 'Heart',
      },
      {
        title: 'Şeffaf Fiyatlandırma',
        description: 'Gizli ücret yok. Klinik muayene sonrası detaylı fiyat teklifleri. Tüm maliyetler önceden açıklanır.',
        icon: 'CheckCircle',
      },
      {
        title: 'Özel Bakım Koordinatörü',
        description: 'Kişisel koordinatör, konsültasyondan sonrası bakıma kadar size rehberlik eder, seyahat, randevular ve tüm lojistiği halleder.',
        icon: 'Headphones',
      },
    ],
  },
  packages: {
    title: 'Tedavi Paketleri',
    subtitle: 'Şeffaf fiyatlandırma ile kapsamlı paketler. Nihai maliyet klinik muayeneye bağlıdır.',
    disclaimer: 'Tüm fiyatlar başlangıç aralıklarıdır. Klinik muayene ve tedavi planlaması sonrası nihai fiyat teklifi sağlanır.',
    transparency: {
      title: 'Şeffaf paketler. Sürpriz yok.',
      note: 'Nihai plan klinik değerlendirme sonrası netleşir. Nelerin dahil olduğunu en baştan açıkça paylaşır, olası ek işlemleri başlamadan önce onayınıza sunarız.',
      bullets: [
        'Paket kapsamı net (dahil / hariç)',
        'Opsiyonel işlemler başlamadan önce açıklanır',
        'Vaka bazlı plan — her gülüş farklıdır',
      ],
      microDisclaimer: 'Bu bilgiler genel bilgilendirme amaçlıdır ve tıbbi tanı yerine geçmez.',
    },
    valueBadges: [
      'Net paket kapsamı',
      'Vaka bazlı planlama',
      'Koordinatör desteği',
      'Tedavi sonrası rehberlik',
    ],
    items: [
      {
        name: 'Tek İmplant Paketi',
        priceRange: '€800 - €1.500',
        includes: [
          'İmplant yerleştirme',
          'Abutment',
          'Porselen kron',
          '1 yıl garanti',
          'Takip konsültasyonları',
        ],
      },
      {
        name: 'Gülüş Tasarımı Paketi',
        priceRange: '€3.000 - €6.000',
        includes: [
          '8-10 Porselen lamina',
          'Profesyonel beyazlatma',
          'Tasarım konsültasyonu',
          'Ömür boyu bakım',
          'Sonrası bakım desteği',
        ],
        popular: true,
      },
      {
        name: 'Tam Ağız Restorasyonu',
        priceRange: '€15.000 - €25.000',
        includes: [
          'All-on-4 veya All-on-6 implantlar',
          'Tam çene restorasyonu',
          'Geçici ve kalıcı protezler',
          'Ömür boyu garanti',
          '7/24 destek',
        ],
      },
    ],
  },
  testimonials: [
    {
      name: 'Sarah Johnson',
      location: 'Londra, İngiltere',
      treatment: 'All-on-4 İmplant',
      rating: 5,
      text: 'Maliyet nedeniyle yıllardır diş tedavisinden kaçındıktan sonra, GuideHealth bunu mümkün kıldı. Klinik tertemizdi, diş hekimleri oldukça yetenekliydi ve sonrası bakım olağanüstüydü. Sonuçlardan daha mutlu olamazdım.',
      date: 'Aralık 2024',
    },
    {
      name: 'Michael Chen',
      location: 'New York, ABD',
      treatment: 'Porselen Lamina',
      rating: 5,
      text: 'Tüm süreç baştan sona profesyoneldi. ABD fiyatlarına kıyasla 15.000$ üzerinde tasarruf ettim ve kalite mükemmel. Koordinatör her zaman ulaşılabilirdi ve tedavi beklentilerimi aştı.',
      date: 'Kasım 2024',
    },
    {
      name: 'Emma Schmidt',
      location: 'Berlin, Almanya',
      treatment: 'Diş İmplantı',
      rating: 5,
      text: 'Tedavi için seyahat konusunda endişeliydim, ancak ekip her şeyi sorunsuz hale getirdi. Klinik uluslararası standartları karşılıyordu, diş hekimleri mükemmel İngilizce konuşuyordu ve yeni gülüşüm inanılmaz. Kesinlikle tavsiye ederim.',
      date: 'Ekim 2024',
    },
  ],
  faq: [
    {
      category: 'Güvenlik ve Kalite',
      question: 'Klinikler ve diş hekimleri lisanslı ve akredite mi?',
      answer: 'Evet. Tüm ortak kliniklerimiz JCI (Joint Commission International) akreditelidir ve uluslararası sağlık standartlarını karşılar. Tüm diş hekimleri lisanslı, sertifikalı ve birçoğu uluslararası eğitime sahip 15+ yıl deneyime sahiptir.',
    },
    {
      category: 'Güvenlik ve Kalite',
      question: 'Hangi güvenlik önlemleri alınıyor?',
      answer: 'Kliniklerimiz katı sterilizasyon protokollerini takip eder, uygun yerlerde tek kullanımlık aletler kullanır ve steril ortamları korur. Tüm tesisler düzenli olarak denetlenir ve uluslararası güvenlik standartlarını karşılar.',
    },
    {
      category: 'Tedavi',
      question: 'Tedavi ne kadar sürer?',
      answer: 'Tedavi süresi prosedüre göre değişir. Beyazlatma gibi basit tedaviler 1 ziyaret alır. İmplantlar genellikle 3-6 ay içinde 2-3 ziyaret gerektirir. All-on-4, 2-3 günde tamamlanabilir. Kişiselleştirilmiş planınız detaylı bir zaman çizelgesi içerir.',
    },
    {
      category: 'Tedavi',
      question: 'Tedavi sırasında ağrı yaşayacak mıyım?',
      answer: 'Modern diş hekimliği teknikleri ve lokal anestezi minimal rahatsızlık sağlar. Daha karmaşık prosedürler için sedasyon seçenekleri mevcuttur. Çoğu hasta tedavi sırasında minimal veya hiç ağrı bildirmez.',
    },
    {
      category: 'Tedavi',
      question: 'Hangi malzemeleri kullanıyorsunuz?',
      answer: 'Premium, uluslararası olarak tanınan malzemeler kullanıyoruz: Zirkonya kronlar, E-max laminalar ve üst düzey implant sistemleri (Straumann, Nobel Biocare). Tüm malzemeler üretici garantileri ile gelir ve uluslararası standartları karşılar.',
    },
    {
      category: 'Fiyatlandırma',
      question: 'Fiyata ne dahil?',
      answer: 'Tüm fiyatlar konsültasyon, tedavi, malzemeler ve ilk sonrası bakımı içerir. Konaklama ve uçuşlar ayrıdır, ancak öneriler sağlıyoruz. Nihai fiyatlandırma klinik muayene sonrası onaylanır.',
    },
    {
      category: 'Fiyatlandırma',
      question: 'Gizli ücret var mı?',
      answer: 'Hayır. Tam şeffaflığa inanıyoruz. Kişiselleştirilmiş fiyat teklifiniz tüm tedavi maliyetlerini içerir. Ek hizmetler (sedasyon, çeviri) açıkça belirtilir ve isteğe bağlıdır.',
    },
    {
      category: 'Garanti ve Sonrası Bakım',
      question: 'Hangi garantiyi sunuyorsunuz?',
      answer: 'Çoğu tedavi garanti içerir: implantlar tipik olarak 5-10 yıl garanti, laminalar 5-7 yıl. Ayrıca ömür boyu destek sağlıyoruz ve gerekirse takip bakımı için yerel diş hekimleriyle koordine edebiliriz.',
    },
    {
      category: 'Garanti ve Sonrası Bakım',
      question: 'Tedavi sonrası bir sorun çıkarsa ne olur?',
      answer: 'Tüm tedaviler garanti içerir. Sorunlar ortaya çıkarsa, derhal koordinatörünüzle iletişime geçin. Sanal konsültasyonlar sağlıyoruz, yerel diş hekimleriyle koordine ediyoruz veya gerekirse geri dönüş ziyaretleri düzenliyoruz. Kliniklerimiz tam sigortalıdır.',
    },
    {
      category: 'Seyahat',
      question: 'Seyahat düzenlemelerinde yardımcı oluyor musunuz?',
      answer: 'Evet. Havalimanı karşılama, klinik yakınında otel önerileri sağlıyoruz ve gerekirse vize başvurularında yardımcı olabiliriz. Koordinatörlerimiz birçok dil konuşuyor ve konaklamanız boyunca 7/24 ulaşılabilir.',
    },
    {
      category: 'Seyahat',
      question: 'Ne kadar kalmalıyım?',
      answer: 'Kalış süresi tedavinize bağlıdır. Basit prosedürler 2-3 gün gerektirebilirken, karmaşık tedaviler 7-10 gün gerektirebilir. Kişiselleştirilmiş planınız önerilen kalış süresini içerir.',
    },
    {
      category: 'Zaman Çizelgesi',
      question: 'Ne kadar hızlı başlayabilirim?',
      answer: 'Ücretsiz konsültasyonunuzdan sonra, 24-48 saat içinde ön tedavi planı alırsınız. Onayladıktan sonra, ziyaretinizi planlayabiliriz. Tipik bekleme süresi 2-4 haftadır, müsaitliğe bağlı olarak.',
    },
    {
      category: 'Zaman Çizelgesi',
      question: 'Sonuçlar ne kadar sürecek?',
      answer: 'Uygun bakımla, implantlar ömür boyu sürebilir. Laminalar tipik olarak 10-15 yıl, kronlar 10-20 yıl sürer. Uzun süreli sonuçlar sağlamak için detaylı bakım talimatları ve ömür boyu destek sağlıyoruz.',
    },
  ],
  whatsapp: {
    ctaText: 'WhatsApp\'tan Sorun',
    templates: {
      consultation: 'Merhaba, ücretsiz konsültasyon ile ilgileniyorum. Tedavi seçenekleri hakkında daha fazla bilgi verebilir misiniz?',
      question: 'Merhaba, diş tedavisi hakkında bir sorum var. Yardımcı olabilir misiniz?',
      pricing: 'Merhaba, fiyatlandırma ve tedavi paketleri hakkında daha fazla bilgi edinmek istiyorum. Detay verebilir misiniz?',
    },
  },
  cta: {
    final: {
      title: 'Yolculuğunuza Başlamaya Hazır mısınız?',
      subtitle: 'Lisanslı uzmanlardan kişiselleştirilmiş tedavi planınızı alın. Şeffaf fiyatlandırma, kapsamlı sonrası bakım ve ömür boyu destek.',
    },
    learnMore: 'Daha Fazla Bilgi',
    contactUs: 'İletişime Geçin',
    hero: {
      primary: 'Ücretsiz konsültasyon alın',
      primaryHint: 'Hedefinizi paylaşın — ön planı birlikte çıkaralım.',
      secondary: 'WhatsApp',
      secondaryHint: 'Hızlı yanıt. Spam yok.',
    },
    pricing: {
      packageCta: 'Paket teklifi isteyin',
      packageHint: 'Klinik değerlendirme sonrası netleşir — sürpriz yok.',
    },
    contact: {
      submit: 'Talebimi gönder',
      submitHint: '24 saat içinde dönüş (çoğu zaman daha hızlı).',
    },
    onboarding: {
      start: '2 dakikada başla',
      startHint: 'Size uygun plan için birkaç soru.',
      finish: 'Planımı al',
      finishHint: 'Sonraki adımları sizinle paylaşacağız.',
    },
    trust: {
      proof: 'Güven, netlik ve konfor için tasarlandı',
      proofHint: 'Kanıtlar (sertifika/vaka) en sonda buraya eklenecek.',
    },
  },
  
  aria: {
    heroPrimary: 'Ücretsiz konsültasyon akışını başlat',
    whatsapp: 'WhatsApp sohbetini aç',
    pricingCta: 'Paket teklifi iste',
    contactSubmit: 'İletişim formunu gönder',
  },
  
  micro: {
    noSpam: 'Spam yok. Verileriniz gizli kalır.',
    responseTime: 'Ortalama dönüş: 24 saat içinde.',
  },
  disclaimer: {
    medical: 'Bu web sitesi yalnızca bilgi sağlar. Tıbbi tavsiye için nitelikli bir diş hekimine danışın. Bireysel sonuçlar değişebilir.',
    ethics: 'Etik uygulamalara ve hasta güvenliğine bağlıyız. Tüm tedaviler akredite tesislerde lisanslı profesyoneller tarafından gerçekleştirilir.',
    warranty: 'Garanti şartları tedavi tipine göre değişir ve tedavi sözleşmenizde belirtilir. Düzenli bakım ve takip bakımı gereklidir.',
  },
  seo: {
    home: {
      title: 'Premium Diş Turizmi | GuideHealth - Lisanslı Uzmanlar, Akredite Klinikler',
      description: 'Yurtdışında dünya standartlarında diş tedavileri, %70\'e varan tasarruf. JCI akrediteli klinikler, lisanslı diş hekimleri, ömür boyu garanti. Ücretsiz konsültasyon alın.',
    },
    treatments: {
      title: 'Diş Tedavileri | İmplantlar, Laminalar, Kronlar | GuideHealth',
      description: 'Kapsamlı diş tedavileri: implantlar, laminalar, kronlar, All-on-4 ve beyazlatma. Lisanslı uzmanlar, premium malzemeler, ömür boyu garanti.',
    },
    process: {
      title: 'Tedavi Süreci | Adım Adım Rehber | GuideHealth',
      description: 'Ücretsiz konsültasyondan ömür boyu sonrası bakıma. Tedavi sürecimiz, güvenlik önlemlerimiz ve hasta desteğimiz hakkında bilgi edinin.',
    },
    pricing: {
      title: 'Şeffaf Fiyatlandırma | Tedavi Paketleri | GuideHealth',
      description: 'Yurtdışında diş tedavileri için şeffaf fiyatlandırma. €200\'den başlayan fiyatlar. Klinik muayene sonrası nihai fiyat teklifi. Gizli ücret yok.',
    },
    reviews: {
      title: 'Hasta Yorumları ve Referanslar | GuideHealth',
      description: 'Doğrulanmış hasta yorumları ve referanslarını okuyun. Kapsamlı sonrası bakım ve ömür boyu destek ile 5 yıldızlı hizmet.',
    },
    faq: {
      title: 'Sık Sorulan Sorular | Diş Turizmi SSS | GuideHealth',
      description: 'Diş turizmi, güvenlik, fiyatlandırma, garantiler ve sonrası bakım hakkında yaygın sorular. Lisanslı uzmanlardan cevaplar alın.',
    },
    contact: {
      title: 'Bize Ulaşın | GuideHealth',
      description: 'Sorularınız, desteğiniz veya ücretsiz diş danışmanlığınıza başlamak için GuideHealth ile iletişime geçin. Çok dilli destek mevcuttur.',
    },
    onboarding: {
      title: 'Diş Planınıza Başlayın | GuideHealth',
      description: 'GuideHealth\'ten ücretsiz online danışmanlık ile kişiselleştirilmiş diş tedavi yolculuğunuza başlayın.',
    },
    planDashboard: {
      title: 'Kişiselleştirilmiş Planınız | GuideHealth',
      description: 'GuideHealth ile kişiselleştirilmiş diş tedavi planınızı ve sonraki adımları görüntüleyin.',
    },
  },
};

export function getCopy(lang: Language): CopyContent {
  return lang === 'tr' ? copyTr : copyEn;
}

export const availableLanguages: Language[] = ['en', 'tr'];

