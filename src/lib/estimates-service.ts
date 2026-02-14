import { supabase } from '@/supabase/client';

export type Estimate = {
  id: string;
  user_id: string;
  estimate_number: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  client_address?: string;
  project_title: string;
  project_description?: string;
  amount: number;
  tax_rate: number;
  issued_date: string;
  due_date: string;
  status: 'Draft' | 'Sent' | 'Viewed' | 'Signed' | 'Declined';
  notes?: string;
  terms?: string;
  signature?: string;
  is_signed: boolean;
  line_items: any[];
  project_photos?: string[];
  company_name?: string;
  company_address?: string;
  company_email?: string;
  company_phone?: string;
  company_logo?: string;
  share_token: string;
  created_at: string;
  updated_at: string;
};

export async function getEstimates(userId: string) {
  const { data, error } = await supabase
    .from('estimates')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getEstimate(id: string) {
  const { data, error } = await supabase
    .from('estimates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createEstimate(userId: string, estimate: Partial<Estimate>) {
  const { data, error } = await supabase
    .from('estimates')
    .insert({
      user_id: userId,
      estimate_number: `EST-${Date.now()}`,
      ...estimate,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateEstimate(id: string, estimate: Partial<Estimate>) {
  const { data, error } = await supabase
    .from('estimates')
    .update({
      ...estimate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteEstimate(id: string) {
  const { error } = await supabase.from('estimates').delete().eq('id', id);
  if (error) throw error;
}

export async function getEstimateByShareToken(token: string) {
  const { data, error } = await supabase
    .from('estimates')
    .select('*')
    .eq('share_token', token)
    .single();

  if (error) throw error;
  return data;
}
