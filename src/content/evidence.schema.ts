export type EvidenceType = 'image' | 'video' | 'pdf' | 'link';

export type EvidenceLang = 'en' | 'tr';

export interface EvidenceItem {
  id: string;
  type: EvidenceType;
  title: string;
  description?: string;
  url: string;
  tags?: string[];
  lang?: EvidenceLang;
}

export interface EvidenceSection {
  key: string;
  title: string;
  items: EvidenceItem[];
}

export interface EvidenceConfig {
  version: string;
  sections: EvidenceSection[];
  required: {
    home: string[];
    pricing: string[];
    process: string[];
  };
}

