import { supabase } from "../config/supabase"

const LOGIN_WINDOW_MS = 10 * 60 * 1000
const LOGIN_MAX_ATTEMPTS = 5
const LOGIN_LOCK_MS = 5 * 60 * 1000
const RATE_KEY_PREFIX = "ss_rate_"

const createClientError = (message) => ({ message, __client: true })

export const normalizeEmail = (email = "") => email.trim().toLowerCase()

export const validateEmailFormat = (email = "") => {
const value = normalizeEmail(email)
return /^[^\s@]+@[^\s@]+.[^\s@]+$/.test(value)
}

export const validatePasswordRules = (password = "") => {
if (password.length < 8) return "Password must be at least 8 characters long."
if (!/[A-Z]/.test(password) || !/[a-z]/.test(password))
return "Password must include both uppercase and lowercase letters."
if (!/\d/.test(password)) return "Password must include at least one number."
return ""
}

// ================= RATE LIMIT =================

const getRateLimitState = (email) => {
const key = `${RATE_KEY_PREFIX}${normalizeEmail(email)}`
try {
const parsed = JSON.parse(localStorage.getItem(key) || "{}")
const attempts = Array.isArray(parsed.attempts) ? parsed.attempts : []
const lockUntil = Number(parsed.lockUntil || 0)
return { key, attempts, lockUntil }
} catch {
return { key, attempts: [], lockUntil: 0 }
}
}

const saveRateLimitState = (key, attempts, lockUntil) => {
localStorage.setItem(key, JSON.stringify({ attempts, lockUntil }))
}

const checkRateLimit = (email) => {
const now = Date.now()
const { key, attempts, lockUntil } = getRateLimitState(email)

if (lockUntil > now) {
return {
allowed: false,
waitSeconds: Math.ceil((lockUntil - now) / 1000),
}
}

const recentAttempts = attempts.filter((ts) => now - ts <= LOGIN_WINDOW_MS)
saveRateLimitState(key, recentAttempts, 0)

return { allowed: true, recentAttempts }
}

const markFailedAttempt = (email) => {
const now = Date.now()
const { key, attempts } = getRateLimitState(email)

const recentAttempts = attempts.filter((ts) => now - ts <= LOGIN_WINDOW_MS)
recentAttempts.push(now)

if (recentAttempts.length >= LOGIN_MAX_ATTEMPTS) {
saveRateLimitState(key, recentAttempts, now + LOGIN_LOCK_MS)
} else {
saveRateLimitState(key, recentAttempts, 0)
}
}

const clearAttempts = (email) => {
const { key } = getRateLimitState(email)
localStorage.removeItem(key)
}

// ================= ERROR HANDLING =================

const mapAuthError = (error, fallback = "Something went wrong.") => {
if (!error) return null
const msg = (error.message || "").toLowerCase()

if (msg.includes("invalid login credentials"))
return createClientError("Invalid email or password.")

if (msg.includes("too many requests") || msg.includes("rate limit"))
return createClientError("Too many attempts. Please wait a few minutes.")

if (msg.includes("user already registered"))
return createClientError("This email is already registered.")

if (msg.includes("email not confirmed"))
return createClientError("Please verify your email first.")

if (msg.includes("email rate limit exceeded"))
return createClientError("Too many emails sent. Please wait before trying again.")

return createClientError(error.message || fallback)
}

// ================= REGISTER =================

export const registerUser = async (email, password, confirmPassword) => {
const normalizedEmail = normalizeEmail(email)

if (!validateEmailFormat(normalizedEmail))
return { data: null, error: createClientError("Please enter a valid email address.") }

const passError = validatePasswordRules(password)
if (passError)
return { data: null, error: createClientError(passError) }

if (password !== confirmPassword)
return { data: null, error: createClientError("Passwords do not match.") }

const rate = checkRateLimit(normalizedEmail)
if (!rate.allowed)
return {
data: null,
error: createClientError(`Too many attempts. Try again in ${rate.waitSeconds}s.`),
}

const { data, error } = await supabase.auth.signUp({
email: normalizedEmail,
password,
options: {
emailRedirectTo: `${window.location.origin}/login?verified=1`,
},
})

if (error) markFailedAttempt(normalizedEmail)
else clearAttempts(normalizedEmail)

return { data, error: mapAuthError(error, "Unable to register right now.") }
}

// ================= RESEND VERIFICATION =================

export const resendVerificationEmail = async (email) => {
const normalizedEmail = normalizeEmail(email)

if (!validateEmailFormat(normalizedEmail))
return { error: createClientError("Please enter a valid email address.") }

const rate = checkRateLimit(normalizedEmail)
if (!rate.allowed)
return {
error: createClientError(`Too many attempts. Try again in ${rate.waitSeconds}s.`),
}

const { error } = await supabase.auth.resend({
type: "signup",
email: normalizedEmail,
options: {
emailRedirectTo: `${window.location.origin}/login?verified=1`,
},
})

if (error) markFailedAttempt(normalizedEmail)
else clearAttempts(normalizedEmail)

return { error: mapAuthError(error, "Unable to resend verification email.") }
}

// ================= LOGIN =================

export const loginUser = async (email, password) => {
const normalizedEmail = normalizeEmail(email)

if (!validateEmailFormat(normalizedEmail))
return { data: null, error: createClientError("Please enter a valid email address.") }

if (!password)
return { data: null, error: createClientError("Please enter your password.") }

const rate = checkRateLimit(normalizedEmail)
if (!rate.allowed)
return {
data: null,
error: createClientError(`Too many attempts. Try again in ${rate.waitSeconds}s.`),
}

const { data, error } = await supabase.auth.signInWithPassword({
email: normalizedEmail,
password,
})

if (error) {
markFailedAttempt(normalizedEmail)
return { data: null, error: mapAuthError(error, "Unable to sign in right now.") }
}

clearAttempts(normalizedEmail)

return { data, error: null }
}

// ================= GOOGLE =================

export const signInWithGoogle = async () => {
const { data, error } = await supabase.auth.signInWithOAuth({
provider: "google",
options: {
redirectTo: `${window.location.origin}/userdashboard`,
},
})

return { data, error: mapAuthError(error, "Unable to start Google sign-in.") }
}

// ================= RESET PASSWORD =================

export const requestPasswordReset = async (email) => {
const normalizedEmail = normalizeEmail(email)

if (!validateEmailFormat(normalizedEmail))
return { error: createClientError("Please enter a valid email address.") }

const rate = checkRateLimit(normalizedEmail)
if (!rate.allowed)
return {
error: createClientError(`Too many attempts. Try again in ${rate.waitSeconds}s.`),
}

const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
redirectTo: `${window.location.origin}/reset-password`,
})

if (error) markFailedAttempt(normalizedEmail)
else clearAttempts(normalizedEmail)

return { error: mapAuthError(error, "Unable to process request right now.") }
}

// ================= UPDATE PASSWORD =================

export const updateUserPassword = async (password, confirmPassword) => {
const passError = validatePasswordRules(password)
if (passError) return { error: createClientError(passError) }

if (password !== confirmPassword)
return { error: createClientError("Passwords do not match.") }

const { error } = await supabase.auth.updateUser({ password })
return { error: mapAuthError(error, "Unable to reset password right now.") }
}

// ================= SESSION =================

export const getCurrentSession = () => supabase.auth.getSession()
export const onAuthStateChange = (cb) => supabase.auth.onAuthStateChange(cb)

export const logoutUser = async () => {
const { error } = await supabase.auth.signOut()
return { error: mapAuthError(error, "Unable to sign out.") }
}
