import { supabase } from '@/supabase/client';

export type UserSettings = {
  id: string;
  user_id: string;
  company_name: string | null;
  company_email: string | null;
  company_phone: string | null;
  company_address: string | null;
  company_website: string | null;
  company_logo: string | null;
  tax_rate: number;
  tax_id: string | null;
  default_terms: string | null;
  state_tax_rates: Record<string, number>;
  payment_methods: string[];
  currency: string;
  created_at: string;
  updated_at: string;
};

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function upsertUserSettings(userId: string, settings: Partial<UserSettings>) {
  const { data, error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      ...settings,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function uploadLogo(userId: string, file: File): Promise<string> {
  const fileName = `${userId}-${Date.now()}.${file.name.split('.').pop()}`;
  const { error: uploadError } = await supabase.storage
    .from('company-logos')
    .upload(fileName, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('company-logos').getPublicUrl(fileName);
  return data.publicUrl;
}
