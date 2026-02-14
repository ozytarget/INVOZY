import { supabase } from '@/supabase/client';

export type Client = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  total_billed: number;
  document_count: number;
  created_at: string;
  updated_at: string;
};

export async function getClients(userId: string) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getClient(id: string) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createClient(userId: string, client: Partial<Client>) {
  const { data, error } = await supabase
    .from('clients')
    .insert({
      user_id: userId,
      ...client,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateClient(id: string, client: Partial<Client>) {
  const { data, error } = await supabase
    .from('clients')
    .update({
      ...client,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteClient(id: string) {
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw error;
}

export async function exportClientsToCSV(userId: string): Promise<string> {
  const clients = await getClients(userId);
  
  const headers = ['Name', 'Email', 'Phone', 'Address', 'Total Billed'];
  const rows = clients.map(c => [
    c.name,
    c.email,
    c.phone || '',
    c.address || '',
    c.total_billed,
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csv;
}

export function importClientsFromCSV(userId: string, csvContent: string): Partial<Client>[] {
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  return lines.slice(1)
    .filter(line => line.trim())
    .map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      return {
        user_id: userId,
        name: values[headers.indexOf('name')] || '',
        email: values[headers.indexOf('email')] || '',
        phone: values[headers.indexOf('phone')] || undefined,
        address: values[headers.indexOf('address')] || undefined,
      };
    });
}
