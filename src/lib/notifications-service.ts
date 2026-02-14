import { supabase } from '@/supabase/client';

export type Notification = {
  id: string;
  user_id: string;
  document_type: 'estimate' | 'invoice';
  document_id: string;
  client_name: string;
  action: 'viewed' | 'signed' | 'paid' | 'opened';
  message: string;
  read: boolean;
  created_at: string;
};

export async function getNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createNotification(notification: Partial<Notification>) {
  const { data, error } = await supabase
    .from('notifications')
    .insert(notification)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function markNotificationAsRead(id: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteNotification(id: string) {
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) throw error;
}
