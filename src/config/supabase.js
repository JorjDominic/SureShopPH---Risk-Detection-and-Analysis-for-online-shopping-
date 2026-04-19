import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lmjuqnvzakiznpfvkkqk.supabase.co'
const supabaseAnonKey = 'sb_publishable_B7vSdKIkoVRzHvAArtoWTQ_7gJrBMwk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	auth: {
		persistSession: true,
		autoRefreshToken: true,
		detectSessionInUrl: true,
	},
})