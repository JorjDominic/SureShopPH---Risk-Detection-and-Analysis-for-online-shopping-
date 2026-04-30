import { supabase } from '../config/supabase';

/**
 * Best-effort insert into public.admin_logs.
 * Never throws — failures are swallowed so calling pages don't break.
 *
 * @param {{ userId?: string, action: string, details?: object|string }} entry
 */
export const logAdminAction = async ({ userId, action, details }) => {
  if (!action) return;
  try {
    await supabase.from('admin_logs').insert({
      user_id: userId ?? null,
      action,
      details: details ?? null,
    });
  } catch {
    /* ignore */
  }
};
