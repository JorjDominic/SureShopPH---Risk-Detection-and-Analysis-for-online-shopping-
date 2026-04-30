import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

// Flag the misconfig but DO NOT throw — a throw at module-import time crashes
// the whole bundle before React mounts, leaving the user with a white screen.
// Instead, log loudly and let the app render so the ErrorBoundary (or any UI
// surface that needs supabase) can show a real message.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
	// eslint-disable-next-line no-console
	console.error(
		'[Supabase] Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY. ' +
		'The app will load but auth and data calls will fail until env vars are set.'
	)
}

const withSupabaseHeaders = (headers = {}) => {
	const normalized = new Headers(headers)
	if (supabaseAnonKey && !normalized.has('apikey')) normalized.set('apikey', supabaseAnonKey)
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

// Use safe fallbacks so createClient doesn't throw — every call will simply
// fail at the network layer when env vars are missing, which the UI handles.
export const supabase = createClient(
	supabaseUrl || 'https://placeholder.supabase.co',
	supabaseAnonKey || 'placeholder-anon-key',
	{
		auth: {
			persistSession: true,
			autoRefreshToken: true,
			detectSessionInUrl: true,
		},
		global: {
			headers: supabaseAnonKey ? { apikey: supabaseAnonKey } : {},
			fetch: supabaseFetch,
		},
	}
)