export type Language = 'en' | 'tr';

export interface SiteContent {
  lang: Language;
  hero: {
    headline: string;
    subheadline: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  trustBadges: {
    title: string;
    items: Array<{ icon: string; text: string }>;
  };
  treatments: Array<{
    id: string;
    name: string;
    description: string;
    benefits: string[];
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
  pricing: {
    title: string;
    subtitle: string;
    note: string;
    packages: Array<{
      name: string;
      priceRange: string;
      includes: string[];
      popular?: boolean;
    }>;
  };
  testimonials: Array<{
    name: string;
    location: string;
    treatment: string;
    rating: number;
    text: string;
    image?: string;
  }>;
  faq: Array<{
    question: string;
    answer: string;
    category: string;
  }>;
  clinics: Array<{
    name: string;
    location: string;
    description: string;
    image?: string;
    accreditation: string[];
  }>;
  doctors: Array<{
    name: string;
    title: string;
    specialization: string;
    experience: string;
    image?: string;
  }>;
  whatsapp: {
    ctaText: string;
    defaultMessage: string;
  };
  cta: {
    primary: string;
    secondary: string;
    final: {
      title: string;
      subtitle: string;
      button: string;
    };
  };
  disclaimers: {
    pricing: string;
    results: string;
    medical: string;
  };
  seo: {
    home: { title: string; description: string };
    treatments: { title: string; description: string };
    process: { title: string; description: string };
    pricing: { title: string; description: string };
    reviews: { title: string; description: string };
    faq: { title: string; description: string };
  };
}

const contentEn: SiteContent = {
  lang: 'en',
  hero: {
    headline: 'Premium Dental Care Abroad',
    subheadline: 'World-class treatments at up to 70% savings. Personalized care, transparent pricing, and lifetime support.',
    ctaPrimary: 'Get Your Free Consultation',
    ctaSecondary: 'Ask on WhatsApp',
  },
  trustBadges: {
    title: 'Why Choose GuideHealth',
    items: [
      { icon: 'Shield', text: 'JCI Accredited Clinics' },
      { icon: 'Users', text: '10,000+ Happy Patients' },
      { icon: 'Award', text: '5-Star Rated' },
      { icon: 'Clock', text: '24/7 Support' },
    ],
  },
  treatments: [
    {
      id: 'implants',
      name: 'Dental Implants',
      description: 'Permanent solution for missing teeth with 98% success rate',
      benefits: ['Lifetime warranty', 'Natural look & feel', 'No bone loss', 'Single visit possible'],
      duration: '3-6 months',
      priceRange: '€800 - €1,500 per implant',
    },
    {
      id: 'veneers',
      name: 'Porcelain Veneers',
      description: 'Transform your smile in just 2 visits',
      benefits: ['Stain resistant', '10-15 year lifespan', 'Minimal preparation', 'Instant results'],
      duration: '2 visits (1 week)',
      priceRange: '€300 - €600 per tooth',
    },
    {
      id: 'crowns',
      name: 'Dental Crowns',
      description: 'Restore damaged teeth with premium materials',
      benefits: ['Zirconia & E-max options', 'Natural appearance', 'Long-lasting', 'Same-day available'],
      duration: '2-3 visits',
      priceRange: '€250 - €500 per crown',
    },
    {
      id: 'all-on-4',
      name: 'All-on-4 Implants',
      description: 'Full arch restoration with just 4 implants',
      benefits: ['Fixed teeth in 24 hours', 'No dentures needed', 'Eat normally', 'Lifetime solution'],
      duration: '2-3 days',
      priceRange: '€8,000 - €12,000 per arch',
    },
    {
      id: 'whitening',
      name: 'Teeth Whitening',
      description: 'Professional whitening for a brighter smile',
      benefits: ['In-office treatment', 'Immediate results', 'Safe & effective', 'Maintenance kit included'],
      duration: '1 visit',
      priceRange: '€200 - €400',
    },
  ],
  process: {
    title: 'Your Journey to a Perfect Smile',
    subtitle: 'From consultation to aftercare, we guide you every step',
    steps: [
      {
        number: 1,
        title: 'Free Consultation',
        description: 'Video call with our coordinator. Share your goals and get a personalized treatment plan.',
        icon: 'Video',
      },
      {
        number: 2,
        title: 'Airport Pickup',
        description: 'We meet you at the airport, handle your transfer, and ensure a comfortable stay.',
        icon: 'Plane',
      },
      {
        number: 3,
        title: 'Clinic Visit',
        description: 'Meet your dentist, final consultation, and begin treatment at our accredited clinic.',
        icon: 'Building',
      },
      {
        number: 4,
        title: 'Treatment',
        description: 'Expert care using latest technology. Regular updates and transparent communication.',
        icon: 'Heart',
      },
      {
        number: 5,
        title: 'Aftercare Support',
        description: 'Lifetime follow-up, remote consultations, and 24/7 support for any questions.',
        icon: 'Headphones',
      },
    ],
  },
  pricing: {
    title: 'Transparent Pricing',
    subtitle: 'No hidden fees. Final price depends on your specific case.',
    note: 'All prices include consultation, treatment, and 1 year of follow-up care.',
    packages: [
      {
        name: 'Single Implant',
        priceRange: '€800 - €1,500',
        includes: ['Implant placement', 'Abutment', 'Crown', '1 year warranty'],
      },
      {
        name: 'Smile Makeover',
        priceRange: '€3,000 - €6,000',
        includes: ['8-10 Veneers', 'Whitening', 'Design consultation', 'Lifetime maintenance'],
        popular: true,
      },
      {
        name: 'Full Mouth Restoration',
        priceRange: '€15,000 - €25,000',
        includes: ['All-on-4 or All-on-6', 'Full arch implants', 'Temporary & final prosthetics', 'Lifetime support'],
      },
    ],
  },
  testimonials: [
    {
      name: 'Sarah Johnson',
      location: 'London, UK',
      treatment: 'All-on-4 Implants',
      rating: 5,
      text: 'I was nervous about traveling for dental work, but GuideHealth made everything seamless. The clinic was modern, the staff spoke perfect English, and my new smile is incredible!',
    },
    {
      name: 'Michael Chen',
      location: 'New York, USA',
      treatment: 'Veneers',
      rating: 5,
      text: 'Saved over $15,000 compared to US prices. The quality is outstanding and the aftercare support is amazing. Highly recommend!',
    },
    {
      name: 'Emma Schmidt',
      location: 'Berlin, Germany',
      treatment: 'Dental Implants',
      rating: 5,
      text: 'Professional service from start to finish. The coordinator was always available, and the treatment exceeded my expectations.',
    },
  ],
  faq: [
    {
      category: 'General',
      question: 'Is it safe to travel for dental treatment?',
      answer: 'Yes, our clinics are JCI accredited and follow international safety standards. We provide airport pickup, accommodation assistance, and 24/7 support throughout your stay.',
    },
    {
      category: 'General',
      question: 'How much can I save compared to my home country?',
      answer: 'Typically 50-70% savings while maintaining the same quality. For example, a single implant costs €800-€1,500 here vs €2,500-€4,000 in the UK/US.',
    },
    {
      category: 'Treatment',
      question: 'How long does the treatment take?',
      answer: 'It depends on the procedure. Simple treatments like whitening take 1 visit. Implants typically require 2-3 visits over 3-6 months. All-on-4 can be completed in 2-3 days.',
    },
    {
      category: 'Treatment',
      question: 'Will I need to return for follow-ups?',
      answer: 'Most follow-ups can be done remotely via video consultation. We provide lifetime support and can coordinate with local dentists if needed.',
    },
    {
      category: 'Treatment',
      question: 'What materials do you use?',
      answer: 'We use premium materials: Zirconia crowns, E-max veneers, and top-tier implant systems (Straumann, Nobel Biocare). All materials come with warranties.',
    },
    {
      category: 'Process',
      question: 'How do I get started?',
      answer: 'Start with a free video consultation. Share your X-rays (if available) and treatment goals. We\'ll provide a personalized plan and transparent pricing within 24-48 hours.',
    },
    {
      category: 'Process',
      question: 'Do you help with travel arrangements?',
      answer: 'Yes! We provide airport pickup, hotel recommendations, and can assist with visa applications if needed. Our coordinators speak multiple languages.',
    },
    {
      category: 'Pricing',
      question: 'What is included in the price?',
      answer: 'All prices include consultation, treatment, materials, and 1 year of follow-up care. Accommodation and flights are separate, but we provide recommendations.',
    },
    {
      category: 'Pricing',
      question: 'Do you offer payment plans?',
      answer: 'Yes, we offer flexible payment plans. You can pay a deposit to secure your appointment and pay the remainder before or during treatment.',
    },
    {
      category: 'Safety',
      question: 'What if something goes wrong?',
      answer: 'All treatments include warranties. We provide lifetime support and can coordinate with local dentists for any issues. Our clinics are fully insured.',
    },
    {
      category: 'Safety',
      question: 'Are the dentists qualified?',
      answer: 'All our dentists are licensed, speak English, and have international training. Many have 15+ years of experience and specialize in cosmetic dentistry.',
    },
    {
      category: 'Aftercare',
      question: 'What happens after I return home?',
      answer: 'We provide remote consultations, maintenance guides, and 24/7 support. If you need local care, we can coordinate with dentists in your area.',
    },
    {
      category: 'Aftercare',
      question: 'How do I maintain my new smile?',
      answer: 'We provide detailed care instructions and maintenance kits. Regular check-ups can be done remotely, and we offer lifetime support for any questions.',
    },
  ],
  clinics: [
    {
      name: 'Istanbul Premium Dental Clinic',
      location: 'Istanbul, Turkey',
      description: 'State-of-the-art facility with digital dentistry and 3D imaging',
      accreditation: ['JCI Accredited', 'ISO 9001', 'CE Certified'],
    },
    {
      name: 'Ankara Advanced Dental Center',
      location: 'Ankara, Turkey',
      description: 'Specializing in implantology and full mouth restorations',
      accreditation: ['JCI Accredited', 'ISO 9001'],
    },
  ],
  doctors: [
    {
      name: 'Dr. Mehmet Yılmaz',
      title: 'Chief Dental Surgeon',
      specialization: 'Implantology & Oral Surgery',
      experience: '20+ years',
    },
    {
      name: 'Dr. Ayşe Demir',
      title: 'Cosmetic Dentistry Specialist',
      specialization: 'Veneers & Smile Design',
      experience: '15+ years',
    },
  ],
  whatsapp: {
    ctaText: 'Ask on WhatsApp',
    defaultMessage: 'Hi, I\'m interested in dental treatment. Can you help me?',
  },
  cta: {
    primary: 'Get Your Free Consultation',
    secondary: 'Ask on WhatsApp',
    final: {
      title: 'Ready to Transform Your Smile?',
      subtitle: 'Get your personalized treatment plan in 24-48 hours. No obligation, no spam.',
      button: 'Start Free Consultation',
    },
  },
  disclaimers: {
    pricing: 'Final prices depend on individual case complexity. All prices in EUR. Payment plans available.',
    results: 'Results may vary. Before/after photos are examples. Individual results depend on case.',
    medical: 'This website provides information only. Consult with a qualified dentist for medical advice.',
  },
  seo: {
    home: {
      title: 'Premium Dental Tourism | GuideHealth - Save 70% on Quality Dental Care',
      description: 'World-class dental treatments abroad at up to 70% savings. Implants, veneers, crowns, and All-on-4. JCI accredited clinics, lifetime support.',
    },
    treatments: {
      title: 'Dental Treatments Abroad | Implants, Veneers, Crowns | GuideHealth',
      description: 'Comprehensive dental treatments: implants, veneers, crowns, All-on-4, and whitening. Premium quality at affordable prices.',
    },
    process: {
      title: 'Dental Tourism Process | How It Works | GuideHealth',
      description: 'Step-by-step guide to dental tourism: consultation, travel, treatment, and aftercare. We handle everything for a seamless experience.',
    },
    pricing: {
      title: 'Dental Treatment Prices | Transparent Pricing | GuideHealth',
      description: 'Transparent pricing for dental treatments abroad. Save 50-70% compared to UK/US prices. Payment plans available.',
    },
    reviews: {
      title: 'Patient Reviews & Testimonials | GuideHealth Dental Tourism',
      description: 'Read real patient reviews and testimonials from our dental tourism patients. 5-star rated service with 10,000+ happy patients.',
    },
    faq: {
      title: 'Dental Tourism FAQ | Common Questions | GuideHealth',
      description: 'Frequently asked questions about dental tourism, treatment safety, pricing, and aftercare. Get answers to all your questions.',
    },
  },
};

const contentTr: SiteContent = {
  lang: 'tr',
  hero: {
    headline: 'Yurtdışında Premium Diş Tedavisi',
    subheadline: 'Dünya standartlarında tedaviler, %70\'e varan tasarruf. Kişiselleştirilmiş bakım, şeffaf fiyatlandırma ve ömür boyu destek.',
    ctaPrimary: 'Ücretsiz Konsültasyon Alın',
    ctaSecondary: 'WhatsApp\'tan Sorun',
  },
  trustBadges: {
    title: 'Neden GuideHealth',
    items: [
      { icon: 'Shield', text: 'JCI Akrediteli Klinikler' },
      { icon: 'Users', text: '10.000+ Mutlu Hasta' },
      { icon: 'Award', text: '5 Yıldızlı Hizmet' },
      { icon: 'Clock', text: '7/24 Destek' },
    ],
  },
  treatments: [
    {
      id: 'implants',
      name: 'Diş İmplantı',
      description: 'Eksik dişler için %98 başarı oranıyla kalıcı çözüm',
      benefits: ['Ömür boyu garanti', 'Doğal görünüm', 'Kemik kaybı yok', 'Tek seans mümkün'],
      duration: '3-6 ay',
      priceRange: 'İmplant başına €800 - €1.500',
    },
    {
      id: 'veneers',
      name: 'Porselen Lamina',
      description: 'Sadece 2 ziyarette gülüşünüzü dönüştürün',
      benefits: ['Leke tutmaz', '10-15 yıl ömür', 'Minimal hazırlık', 'Anında sonuç'],
      duration: '2 ziyaret (1 hafta)',
      priceRange: 'Diş başına €300 - €600',
    },
    {
      id: 'crowns',
      name: 'Diş Kronu',
      description: 'Premium malzemelerle hasarlı dişleri restore edin',
      benefits: ['Zirkonya ve E-max seçenekleri', 'Doğal görünüm', 'Uzun ömürlü', 'Aynı gün mümkün'],
      duration: '2-3 ziyaret',
      priceRange: 'Kron başına €250 - €500',
    },
    {
      id: 'all-on-4',
      name: 'All-on-4 İmplant',
      description: 'Sadece 4 implant ile tam çene restorasyonu',
      benefits: ['24 saatte sabit dişler', 'Protez gerekmez', 'Normal yemek yiyin', 'Ömür boyu çözüm'],
      duration: '2-3 gün',
      priceRange: 'Çene başına €8.000 - €12.000',
    },
    {
      id: 'whitening',
      name: 'Diş Beyazlatma',
      description: 'Daha parlak bir gülüş için profesyonel beyazlatma',
      benefits: ['Klinik tedavi', 'Anında sonuç', 'Güvenli ve etkili', 'Bakım kiti dahil'],
      duration: '1 ziyaret',
      priceRange: '€200 - €400',
    },
  ],
  process: {
    title: 'Mükemmel Gülüşe Yolculuğunuz',
    subtitle: 'Konsültasyondan sonrası bakıma kadar, her adımda yanınızdayız',
    steps: [
      {
        number: 1,
        title: 'Ücretsiz Konsültasyon',
        description: 'Koordinatörümüzle video görüşme. Hedeflerinizi paylaşın ve kişiselleştirilmiş tedavi planı alın.',
        icon: 'Video',
      },
      {
        number: 2,
        title: 'Havalimanı Karşılama',
        description: 'Havalimanında sizi karşılıyoruz, transferinizi organize ediyoruz ve konforlu bir konaklama sağlıyoruz.',
        icon: 'Plane',
      },
      {
        number: 3,
        title: 'Klinik Ziyareti',
        description: 'Diş hekiminizle tanışın, son konsültasyonu yapın ve akredite kliniklerimizde tedaviye başlayın.',
        icon: 'Building',
      },
      {
        number: 4,
        title: 'Tedavi',
        description: 'En son teknoloji kullanarak uzman bakım. Düzenli güncellemeler ve şeffaf iletişim.',
        icon: 'Heart',
      },
      {
        number: 5,
        title: 'Sonrası Destek',
        description: 'Ömür boyu takip, uzaktan konsültasyonlar ve herhangi bir soru için 7/24 destek.',
        icon: 'Headphones',
      },
    ],
  },
  pricing: {
    title: 'Şeffaf Fiyatlandırma',
    subtitle: 'Gizli ücret yok. Nihai fiyat özel durumunuza bağlıdır.',
    note: 'Tüm fiyatlar konsültasyon, tedavi ve 1 yıllık takip bakımını içerir.',
    packages: [
      {
        name: 'Tek İmplant',
        priceRange: '€800 - €1.500',
        includes: ['İmplant yerleştirme', 'Abutment', 'Kron', '1 yıl garanti'],
      },
      {
        name: 'Gülüş Tasarımı',
        priceRange: '€3.000 - €6.000',
        includes: ['8-10 Lamina', 'Beyazlatma', 'Tasarım konsültasyonu', 'Ömür boyu bakım'],
        popular: true,
      },
      {
        name: 'Tam Ağız Restorasyonu',
        priceRange: '€15.000 - €25.000',
        includes: ['All-on-4 veya All-on-6', 'Tam çene implantları', 'Geçici ve kalıcı protezler', 'Ömür boyu destek'],
      },
    ],
  },
  testimonials: [
    {
      name: 'Sarah Johnson',
      location: 'Londra, İngiltere',
      treatment: 'All-on-4 İmplant',
      rating: 5,
      text: 'Diş tedavisi için seyahat konusunda endişeliydim, ancak GuideHealth her şeyi sorunsuz hale getirdi. Klinik modern, personel mükemmel İngilizce konuşuyor ve yeni gülüşüm inanılmaz!',
    },
    {
      name: 'Michael Chen',
      location: 'New York, ABD',
      treatment: 'Lamina',
      rating: 5,
      text: 'ABD fiyatlarına kıyasla 15.000$ üzerinde tasarruf ettim. Kalite mükemmel ve sonrası bakım desteği harika. Kesinlikle tavsiye ederim!',
    },
    {
      name: 'Emma Schmidt',
      location: 'Berlin, Almanya',
      treatment: 'Diş İmplantı',
      rating: 5,
      text: 'Baştan sona profesyonel hizmet. Koordinatör her zaman ulaşılabilirdi ve tedavi beklentilerimi aştı.',
    },
  ],
  faq: [
    {
      category: 'Genel',
      question: 'Diş tedavisi için seyahat etmek güvenli mi?',
      answer: 'Evet, kliniklerimiz JCI akrediteli ve uluslararası güvenlik standartlarını takip ediyor. Havalimanı karşılama, konaklama yardımı ve konaklamanız boyunca 7/24 destek sağlıyoruz.',
    },
    {
      category: 'Genel',
      question: 'Kendi ülkemle karşılaştırıldığında ne kadar tasarruf edebilirim?',
      answer: 'Genellikle aynı kaliteyi korurken %50-70 tasarruf. Örneğin, tek bir implant burada €800-€1.500 iken İngiltere/ABD\'de €2.500-€4.000.',
    },
    {
      category: 'Tedavi',
      question: 'Tedavi ne kadar sürer?',
      answer: 'Prosedüre bağlıdır. Beyazlatma gibi basit tedaviler 1 ziyaret alır. İmplantlar genellikle 3-6 ay içinde 2-3 ziyaret gerektirir. All-on-4, 2-3 günde tamamlanabilir.',
    },
    {
      category: 'Tedavi',
      question: 'Takip için geri dönmem gerekecek mi?',
      answer: 'Çoğu takip video konsültasyon ile uzaktan yapılabilir. Ömür boyu destek sağlıyoruz ve gerekirse yerel diş hekimleriyle koordine edebiliriz.',
    },
    {
      category: 'Tedavi',
      question: 'Hangi malzemeleri kullanıyorsunuz?',
      answer: 'Premium malzemeler kullanıyoruz: Zirkonya kronlar, E-max laminalar ve üst düzey implant sistemleri (Straumann, Nobel Biocare). Tüm malzemeler garanti ile gelir.',
    },
    {
      category: 'Süreç',
      question: 'Nasıl başlayabilirim?',
      answer: 'Ücretsiz video konsültasyon ile başlayın. Röntgenlerinizi (varsa) ve tedavi hedeflerinizi paylaşın. 24-48 saat içinde kişiselleştirilmiş plan ve şeffaf fiyatlandırma sağlayacağız.',
    },
    {
      category: 'Süreç',
      question: 'Seyahat düzenlemelerinde yardımcı oluyor musunuz?',
      answer: 'Evet! Havalimanı karşılama, otel önerileri sağlıyoruz ve gerekirse vize başvurularında yardımcı olabiliriz. Koordinatörlerimiz birçok dil konuşuyor.',
    },
    {
      category: 'Fiyatlandırma',
      question: 'Fiyata ne dahil?',
      answer: 'Tüm fiyatlar konsültasyon, tedavi, malzemeler ve 1 yıllık takip bakımını içerir. Konaklama ve uçuşlar ayrıdır, ancak öneriler sağlıyoruz.',
    },
    {
      category: 'Fiyatlandırma',
      question: 'Ödeme planı sunuyor musunuz?',
      answer: 'Evet, esnek ödeme planları sunuyoruz. Randevunuzu güvence altına almak için depozito ödeyebilir ve kalanını tedaviden önce veya sırasında ödeyebilirsiniz.',
    },
    {
      category: 'Güvenlik',
      question: 'Bir şeyler ters giderse ne olur?',
      answer: 'Tüm tedaviler garanti içerir. Ömür boyu destek sağlıyoruz ve herhangi bir sorun için yerel diş hekimleriyle koordine edebiliriz. Kliniklerimiz tam sigortalı.',
    },
    {
      category: 'Güvenlik',
      question: 'Diş hekimleri nitelikli mi?',
      answer: 'Tüm diş hekimlerimiz lisanslı, İngilizce konuşuyor ve uluslararası eğitime sahip. Birçoğu 15+ yıl deneyime sahip ve estetik diş hekimliğinde uzmanlaşmış.',
    },
    {
      category: 'Sonrası Bakım',
      question: 'Eve döndükten sonra ne olur?',
      answer: 'Uzaktan konsültasyonlar, bakım kılavuzları ve 7/24 destek sağlıyoruz. Yerel bakıma ihtiyacınız varsa, bölgenizdeki diş hekimleriyle koordine edebiliriz.',
    },
    {
      category: 'Sonrası Bakım',
      question: 'Yeni gülüşümü nasıl koruyabilirim?',
      answer: 'Detaylı bakım talimatları ve bakım kitleri sağlıyoruz. Düzenli kontroller uzaktan yapılabilir ve herhangi bir soru için ömür boyu destek sunuyoruz.',
    },
  ],
  clinics: [
    {
      name: 'İstanbul Premium Diş Kliniği',
      location: 'İstanbul, Türkiye',
      description: 'Dijital diş hekimliği ve 3D görüntüleme ile son teknoloji tesis',
      accreditation: ['JCI Akrediteli', 'ISO 9001', 'CE Sertifikalı'],
    },
    {
      name: 'Ankara İleri Diş Merkezi',
      location: 'Ankara, Türkiye',
      description: 'İmplantoloji ve tam ağız restorasyonlarında uzman',
      accreditation: ['JCI Akrediteli', 'ISO 9001'],
    },
  ],
  doctors: [
    {
      name: 'Dr. Mehmet Yılmaz',
      title: 'Baş Diş Cerrahı',
      specialization: 'İmplantoloji ve Ağız Cerrahisi',
      experience: '20+ yıl',
    },
    {
      name: 'Dr. Ayşe Demir',
      title: 'Estetik Diş Hekimliği Uzmanı',
      specialization: 'Lamina ve Gülüş Tasarımı',
      experience: '15+ yıl',
    },
  ],
  whatsapp: {
    ctaText: 'WhatsApp\'tan Sorun',
    defaultMessage: 'Merhaba, diş tedavisi ile ilgileniyorum. Yardımcı olabilir misiniz?',
  },
  cta: {
    primary: 'Ücretsiz Konsültasyon Alın',
    secondary: 'WhatsApp\'tan Sorun',
    final: {
      title: 'Gülüşünüzü Dönüştürmeye Hazır mısınız?',
      subtitle: '24-48 saat içinde kişiselleştirilmiş tedavi planınızı alın. Yükümlülük yok, spam yok.',
      button: 'Ücretsiz Konsültasyona Başla',
    },
  },
  disclaimers: {
    pricing: 'Nihai fiyatlar bireysel vaka karmaşıklığına bağlıdır. Tüm fiyatlar EUR cinsindendir. Ödeme planları mevcuttur.',
    results: 'Sonuçlar değişebilir. Önce/sonra fotoğraflar örnektir. Bireysel sonuçlar vaka bağlıdır.',
    medical: 'Bu web sitesi yalnızca bilgi sağlar. Tıbbi tavsiye için nitelikli bir diş hekimine danışın.',
  },
  seo: {
    home: {
      title: 'Premium Diş Turizmi | GuideHealth - Kaliteli Diş Bakımında %70 Tasarruf',
      description: 'Yurtdışında dünya standartlarında diş tedavileri, %70\'e varan tasarruf. İmplantlar, laminalar, kronlar ve All-on-4. JCI akrediteli klinikler, ömür boyu destek.',
    },
    treatments: {
      title: 'Yurtdışında Diş Tedavileri | İmplantlar, Laminalar, Kronlar | GuideHealth',
      description: 'Kapsamlı diş tedavileri: implantlar, laminalar, kronlar, All-on-4 ve beyazlatma. Uygun fiyatlarla premium kalite.',
    },
    process: {
      title: 'Diş Turizmi Süreci | Nasıl Çalışır | GuideHealth',
      description: 'Diş turizmine adım adım rehber: konsültasyon, seyahat, tedavi ve sonrası bakım. Sorunsuz bir deneyim için her şeyi hallediyoruz.',
    },
    pricing: {
      title: 'Diş Tedavi Fiyatları | Şeffaf Fiyatlandırma | GuideHealth',
      description: 'Yurtdışında diş tedavileri için şeffaf fiyatlandırma. İngiltere/ABD fiyatlarına kıyasla %50-70 tasarruf. Ödeme planları mevcuttur.',
    },
    reviews: {
      title: 'Hasta Yorumları ve Referanslar | GuideHealth Diş Turizmi',
      description: 'Diş turizmi hastalarımızdan gerçek hasta yorumları ve referansları okuyun. 10.000+ mutlu hasta ile 5 yıldızlı hizmet.',
    },
    faq: {
      title: 'Diş Turizmi SSS | Sık Sorulan Sorular | GuideHealth',
      description: 'Diş turizmi, tedavi güvenliği, fiyatlandırma ve sonrası bakım hakkında sık sorulan sorular. Tüm sorularınızın cevaplarını alın.',
    },
  },
};

export function getContent(lang: Language): SiteContent {
  return lang === 'tr' ? contentTr : contentEn;
}

export const availableLanguages: Language[] = ['en', 'tr'];

