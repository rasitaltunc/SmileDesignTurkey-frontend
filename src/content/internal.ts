/**
 * Minimal translations for internal routes (admin/doctor/employee)
 * These are lightweight - no marketing content, just UI labels
 */

export type Language = 'en' | 'tr';

export interface InternalContent {
  lang: Language;
  // Minimal UI labels only
  ui: {
    loading: string;
    error: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    close: string;
    search: string;
    filter: string;
    refresh: string;
    logout: string;
    settings: string;
  };
}

const internalEn: InternalContent = {
  lang: 'en',
  ui: {
    loading: 'Loading...',
    error: 'Error',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    search: 'Search',
    filter: 'Filter',
    refresh: 'Refresh',
    logout: 'Logout',
    settings: 'Settings',
  },
};

const internalTr: InternalContent = {
  lang: 'tr',
  ui: {
    loading: 'Yükleniyor...',
    error: 'Hata',
    save: 'Kaydet',
    cancel: 'İptal',
    delete: 'Sil',
    edit: 'Düzenle',
    close: 'Kapat',
    search: 'Ara',
    filter: 'Filtrele',
    refresh: 'Yenile',
    logout: 'Çıkış',
    settings: 'Ayarlar',
  },
};

export function getInternalContent(lang: Language): InternalContent {
  return lang === 'tr' ? internalTr : internalEn;
}



