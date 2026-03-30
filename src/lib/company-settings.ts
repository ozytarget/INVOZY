export const LEGACY_COMPANY_SETTINGS_STORAGE_KEY = 'companySettings';

export type CompanySettings = {
  companyName?: string;
  taxRate?: number;
  contractorName?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyWebsite?: string;
  schedulingUrl?: string;
  companyLogo?: string;
};

export const getCompanySettingsStorageKey = (userId?: string | null) =>
  userId ? `companySettings:${userId}` : LEGACY_COMPANY_SETTINGS_STORAGE_KEY;

export const readCompanySettings = (userId?: string | null): CompanySettings => {
  if (typeof window === 'undefined') return {};

  const scopedKey = getCompanySettingsStorageKey(userId);
  const scopedRaw = localStorage.getItem(scopedKey);
  if (scopedRaw) {
    try {
      return JSON.parse(scopedRaw) as CompanySettings;
    } catch {
      return {};
    }
  }

  const legacyRaw = localStorage.getItem(LEGACY_COMPANY_SETTINGS_STORAGE_KEY);
  if (!legacyRaw) return {};

  try {
    const parsed = JSON.parse(legacyRaw) as CompanySettings;
    // Migrate legacy data to user-scoped key when user context is available.
    if (userId) {
      localStorage.setItem(scopedKey, legacyRaw);
    }
    return parsed;
  } catch {
    return {};
  }
};

export const writeCompanySettings = (userId: string | null | undefined, settings: CompanySettings) => {
  if (typeof window === 'undefined') return;
  const scopedKey = getCompanySettingsStorageKey(userId);
  localStorage.setItem(scopedKey, JSON.stringify(settings));
};