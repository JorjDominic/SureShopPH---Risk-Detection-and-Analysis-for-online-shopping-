import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error(
		'Supabase environment variables are missing. ' +
		'Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY before building.'
	)
}

const withSupabaseHeaders = (headers = {}) => {
	const normalized = new Headers(headers)
	if (!normalized.has('apikey')) normalized.set('apikey', supabaseAnonKey)
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
		},
		fetch: supabaseFetch,
	},
})