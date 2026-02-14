import { supabase } from '@/supabase/client';

export type Invoice = {
  id: string;
  user_id: string;
  invoice_number: string;
  estimate_id?: string;
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
  status: 'Draft' | 'Sent' | 'Viewed' | 'Partially Paid' | 'Paid' | 'Overdue';
  notes?: string;
  terms?: string;
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

export async function getInvoices(userId: string) {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getInvoice(id: string) {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createInvoice(userId: string, invoice: Partial<Invoice>) {
  const { data, error } = await supabase
    .from('invoices')
    .insert({
      user_id: userId,
      invoice_number: `INV-${Date.now()}`,
      ...invoice,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateInvoice(id: string, invoice: Partial<Invoice>) {
  const { data, error } = await supabase
    .from('invoices')
    .update({
      ...invoice,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteInvoice(id: string) {
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) throw error;
}

export async function getInvoiceByShareToken(token: string) {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('share_token', token)
    .single();

  if (error) throw error;
  return data;
}
