export interface Treatment {
  id: string;
  name: string;
  shortDescription: string;
  icon: string;
  priceRange: { from: number; to: number };
  description: string;
  whoItsFor: string[];
  whatsIncluded: string[];
  timeline: {
    phase: string;
    duration: string;
    description: string;
  }[];
  pricingFactors: string[];
}

export const treatments: Treatment[] = [
  {
    id: 'smile-makeover',
    name: 'Smile Makeover',
    shortDescription: 'Complete smile transformation with comprehensive care',
    icon: 'Sparkles',
    priceRange: { from: 3500, to: 8500 },
    description: 'A comprehensive approach to transforming your smile through a combination of cosmetic and restorative procedures tailored to your unique needs.',
    whoItsFor: [
      'Those seeking a complete smile transformation',
      'Patients with multiple cosmetic concerns',
      'Anyone wanting to boost confidence through their smile',
      'Those looking for a coordinated treatment approach'
    ],
    whatsIncluded: [
      'Comprehensive consultation and smile design',
      'Digital treatment planning and preview',
      'Coordinated multi-treatment approach',
      'Post-treatment care and follow-up',
      'Dedicated care coordinator throughout'
    ],
    timeline: [
      {
        phase: 'Consultation & Planning',
        duration: '1-2 weeks',
        description: 'Initial assessment, digital smile design, and personalized treatment planning'
      },
      {
        phase: 'Travel & Arrival',
        duration: '1 day',
        description: 'Arrival support, clinic orientation, and final consultation'
      },
      {
        phase: 'Treatment Phase',
        duration: '5-10 days',
        description: 'Coordinated procedures based on your personalized plan'
      },
      {
        phase: 'Recovery & Follow-up',
        duration: '2-4 weeks',
        description: 'Virtual check-ins and ongoing support from your team'
      }
    ],
    pricingFactors: [
      'Number and type of procedures included',
      'Material choices (standard vs. premium)',
      'Treatment complexity and customization',
      'Additional services like sedation'
    ]
  },
  {
    id: 'dental-implants',
    name: 'Dental Implants',
    shortDescription: 'Permanent, natural-looking tooth replacement',
    icon: 'Anchor',
    priceRange: { from: 800, to: 2500 },
    description: 'Advanced tooth replacement solution using titanium posts for a permanent, natural-looking result.',
    whoItsFor: [
      'Those with missing teeth seeking permanent solutions',
      'Patients wanting natural-looking replacements',
      'Anyone seeking to restore full dental function',
      'Those looking for long-lasting results'
    ],
    whatsIncluded: [
      'Initial assessment and bone evaluation',
      'Implant placement surgery',
      'Custom crown or prosthetic',
      'All necessary imaging and diagnostics',
      'Post-operative care instructions'
    ],
    timeline: [
      {
        phase: 'Assessment',
        duration: '1 week',
        description: 'Digital scans, X-rays, and treatment planning'
      },
      {
        phase: 'Implant Placement',
        duration: '1-2 days',
        description: 'Surgical placement of titanium implant posts'
      },
      {
        phase: 'Healing Period',
        duration: '3-6 months',
        description: 'Osseointegration at home with virtual monitoring'
      },
      {
        phase: 'Crown Placement',
        duration: '1-2 days',
        description: 'Return visit for custom crown fitting'
      }
    ],
    pricingFactors: [
      'Number of implants needed',
      'Bone grafting requirements',
      'Implant brand and quality',
      'Type of prosthetic (crown, bridge, denture)'
    ]
  },
  {
    id: 'veneers',
    name: 'Porcelain Veneers',
    shortDescription: 'Ultra-thin shells for a perfect smile',
    icon: 'Layers',
    priceRange: { from: 250, to: 600 },
    description: 'Custom-crafted porcelain shells that cover the front surface of teeth for a flawless, natural appearance.',
    whoItsFor: [
      'Those with chipped, stained, or misaligned teeth',
      'Patients seeking cosmetic enhancement',
      'Anyone wanting a Hollywood smile',
      'Those looking for minimally invasive solutions'
    ],
    whatsIncluded: [
      'Comprehensive smile evaluation',
      'Digital smile design preview',
      'Custom veneer fabrication',
      'Precision bonding procedure',
      'Post-placement care guidance'
    ],
    timeline: [
      {
        phase: 'Consultation & Design',
        duration: '3-5 days',
        description: 'Smile analysis and digital design preview'
      },
      {
        phase: 'Preparation',
        duration: '1 day',
        description: 'Tooth preparation and temporary veneers'
      },
      {
        phase: 'Fabrication',
        duration: '5-7 days',
        description: 'Custom veneer creation in our lab'
      },
      {
        phase: 'Placement',
        duration: '1 day',
        description: 'Final fitting and bonding'
      }
    ],
    pricingFactors: [
      'Number of veneers',
      'Porcelain quality and type',
      'Preparation complexity',
      'Lab craftsmanship level'
    ]
  },
  {
    id: 'crowns',
    name: 'Dental Crowns',
    shortDescription: 'Restore strength and appearance',
    icon: 'Crown',
    priceRange: { from: 200, to: 500 },
    description: 'Custom-made caps that restore damaged teeth to their natural strength and appearance.',
    whoItsFor: [
      'Those with cracked or damaged teeth',
      'Patients needing post-root canal restoration',
      'Anyone with severely decayed teeth',
      'Those seeking to strengthen weak teeth'
    ],
    whatsIncluded: [
      'Tooth assessment and preparation',
      'Custom crown fabrication',
      'Temporary crown during fabrication',
      'Permanent crown placement',
      'Bite adjustment and polishing'
    ],
    timeline: [
      {
        phase: 'Assessment',
        duration: '1-2 days',
        description: 'Examination, X-rays, and treatment planning'
      },
      {
        phase: 'Preparation',
        duration: '1 day',
        description: 'Tooth preparation and impression taking'
      },
      {
        phase: 'Fabrication',
        duration: '3-5 days',
        description: 'Custom crown creation'
      },
      {
        phase: 'Placement',
        duration: '1 day',
        description: 'Final crown fitting and adjustment'
      }
    ],
    pricingFactors: [
      'Crown material (porcelain, zirconia, metal)',
      'Number of crowns needed',
      'Tooth preparation complexity',
      'Additional procedures required'
    ]
  },
  {
    id: 'whitening',
    name: 'Professional Whitening',
    shortDescription: 'Brighter smile in just one visit',
    icon: 'Sun',
    priceRange: { from: 150, to: 400 },
    description: 'Professional-grade teeth whitening for safe, effective, and long-lasting results.',
    whoItsFor: [
      'Those seeking brighter, whiter teeth',
      'Patients with surface stains',
      'Anyone preparing for special occasions',
      'Those wanting quick results'
    ],
    whatsIncluded: [
      'Initial shade assessment',
      'Professional cleaning',
      'In-office whitening treatment',
      'Take-home maintenance kit',
      'Post-treatment care instructions'
    ],
    timeline: [
      {
        phase: 'Consultation',
        duration: '1 day',
        description: 'Shade assessment and expectation setting'
      },
      {
        phase: 'Treatment',
        duration: '1-2 hours',
        description: 'Professional in-office whitening'
      },
      {
        phase: 'Follow-up',
        duration: 'Ongoing',
        description: 'At-home maintenance with provided kit'
      }
    ],
    pricingFactors: [
      'Whitening system used',
      'Number of sessions needed',
      'Initial tooth shade',
      'Take-home maintenance products'
    ]
  },
  {
    id: 'second-opinion',
    name: 'Second Opinion',
    shortDescription: 'Expert review of your treatment plan',
    icon: 'FileCheck',
    priceRange: { from: 0, to: 150 },
    description: 'Comprehensive review of your current dental situation and proposed treatment by our experienced specialists.',
    whoItsFor: [
      'Those seeking confirmation of a diagnosis',
      'Patients exploring treatment alternatives',
      'Anyone wanting peace of mind',
      'Those comparing options abroad'
    ],
    whatsIncluded: [
      'Review of existing records and X-rays',
      'Comprehensive specialist evaluation',
      'Alternative treatment options',
      'Detailed written assessment',
      'Follow-up consultation call'
    ],
    timeline: [
      {
        phase: 'Document Upload',
        duration: '1 day',
        description: 'Secure upload of existing records and images'
      },
      {
        phase: 'Review',
        duration: '2-3 days',
        description: 'Specialist analysis of your case'
      },
      {
        phase: 'Consultation',
        duration: '30-60 min',
        description: 'Video call to discuss findings'
      }
    ],
    pricingFactors: [
      'Complexity of case review',
      'Number of specialists consulted',
      'Additional imaging needed',
      'Follow-up consultation requests'
    ]
  }
];
