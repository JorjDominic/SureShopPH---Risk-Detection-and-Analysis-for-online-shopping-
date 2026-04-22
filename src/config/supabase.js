import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://lmjuqnvzakiznpfvkkqk.supabase.co'
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'sb_publishable_B7vSdKIkoVRzHvAArtoWTQ_7gJrBMwk'

const withSupabaseHeaders = (headers = {}) => {
	const normalized = new Headers(headers)
	if (!normalized.has('apikey')) normalized.set('apikey', supabaseAnonKey)
	if (!normalized.has('Authorization')) normalized.set('Authorization', `Bearer ${supabaseAnonKey}`)
	return normalized
}

const supabaseFetch = async (input, init = {}) => {
	const url = typeof input === 'string' ? input : input?.url || ''
	const nextInit = { ...init, headers: withSupabaseHeaders(init.headers) }

	if (url.includes('/auth/v1/signup') && !nextInit.headers.get('apikey')) {
		console.warn('[Supabase] Missing apikey on signup request. Header was auto-injected.')
	}

	return fetch(input, nextInit)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	auth: {
		persistSession: true,
		autoRefreshToken: true,
		detectSessionInUrl: true,
	},
	global: {
		headers: {
			apikey: supabaseAnonKey,
			Authorization: `Bearer ${supabaseAnonKey}`,
		},
		fetch: supabaseFetch,
	},
})