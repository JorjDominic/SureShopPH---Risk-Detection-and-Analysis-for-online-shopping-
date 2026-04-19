import { supabase } from "../config/supabase"

const RATE_LIMITS = {
login: {
keyPrefix: "ss_rate_login_",
windowMs: 10 * 60 * 1000,
maxAttempts: 8,
lockMs: 2 * 60 * 1000,
},
register: {
keyPrefix: "ss_rate_register_",
windowMs: 15 * 60 * 1000,
maxAttempts: 6,
lockMs: 2 * 60 * 1000,
},
reset: {
keyPrefix: "ss_rate_reset_",
windowMs: 15 * 60 * 1000,
maxAttempts: 6,
lockMs: 2 * 60 * 1000,
},
resend: {
keyPrefix: "ss_rate_resend_",
windowMs: 15 * 60 * 1000,
maxAttempts: 6,
lockMs: 2 * 60 * 1000,
},
}

const createClientError = (message) => ({ message, __client: true })

export const normalizeEmail = (email = "") => email.trim().toLowerCase()

export const validateEmailFormat = (email = "") => {
const value = normalizeEmail(email)
return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export const validatePasswordRules = (password = "") => {
if (password.length < 8) return "Password must be at least 8 characters long."
if (!/[A-Z]/.test(password) || !/[a-z]/.test(password))
return "Password must include both uppercase and lowercase letters."
if (!/\d/.test(password)) return "Password must include at least one number."
return ""
}

// ================= RATE LIMIT =================

const getRateLimitState = (action, email) => {
const config = RATE_LIMITS[action]
const key = `${config.keyPrefix}${normalizeEmail(email)}`
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

const checkRateLimit = (action, email) => {
const config = RATE_LIMITS[action]
const now = Date.now()
const { key, attempts, lockUntil } = getRateLimitState(action, email)

if (lockUntil > now) {
return {
allowed: false,
waitSeconds: Math.ceil((lockUntil - now) / 1000),
}
}

const recentAttempts = attempts.filter((ts) => now - ts <= config.windowMs)
saveRateLimitState(key, recentAttempts, 0)

return { allowed: true, recentAttempts }
}

const markFailedAttempt = (action, email) => {
const config = RATE_LIMITS[action]
const now = Date.now()
const { key, attempts } = getRateLimitState(action, email)

const recentAttempts = attempts.filter((ts) => now - ts <= config.windowMs)
recentAttempts.push(now)

if (recentAttempts.length >= config.maxAttempts) {
saveRateLimitState(key, recentAttempts, now + config.lockMs)
} else {
saveRateLimitState(key, recentAttempts, 0)
}
}

const clearAttempts = (action, email) => {
const { key } = getRateLimitState(action, email)
localStorage.removeItem(key)
}

export const getRateLimitStatus = (action, email) => {
if (!email || !RATE_LIMITS[action]) return { isLocked: false, waitSeconds: 0 }

const now = Date.now()
const { lockUntil } = getRateLimitState(action, email)
if (lockUntil > now) {
return {
isLocked: true,
waitSeconds: Math.ceil((lockUntil - now) / 1000),
}
}

return { isLocked: false, waitSeconds: 0 }
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

const rate = checkRateLimit("register", normalizedEmail)
if (!rate.allowed)
return {
data: null,
error: createClientError(`Too many registration attempts. Try again in ${rate.waitSeconds}s.`),
}

const { data, error } = await supabase.auth.signUp({
email: normalizedEmail,
password,
options: {
emailRedirectTo: `${window.location.origin}/login?verified=1`,
},
})

if (error) markFailedAttempt("register", normalizedEmail)
else clearAttempts("register", normalizedEmail)

return { data, error: mapAuthError(error, "Unable to register right now.") }
}

// ================= RESEND VERIFICATION =================

export const resendVerificationEmail = async (email) => {
const normalizedEmail = normalizeEmail(email)

if (!validateEmailFormat(normalizedEmail))
return { error: createClientError("Please enter a valid email address.") }

const rate = checkRateLimit("resend", normalizedEmail)
if (!rate.allowed)
return {
error: createClientError(`Too many resend attempts. Try again in ${rate.waitSeconds}s.`),
}

const { error } = await supabase.auth.resend({
type: "signup",
email: normalizedEmail,
options: {
emailRedirectTo: `${window.location.origin}/login?verified=1`,
},
})

if (error) markFailedAttempt("resend", normalizedEmail)
else clearAttempts("resend", normalizedEmail)

return { error: mapAuthError(error, "Unable to resend verification email.") }
}

// ================= LOGIN =================

export const loginUser = async (email, password) => {
const normalizedEmail = normalizeEmail(email)

if (!validateEmailFormat(normalizedEmail))
return { data: null, error: createClientError("Please enter a valid email address.") }

if (!password)
return { data: null, error: createClientError("Please enter your password.") }

const rate = checkRateLimit("login", normalizedEmail)
if (!rate.allowed)
return {
data: null,
error: createClientError(`Too many login attempts. Try again in ${rate.waitSeconds}s.`),
}

const { data, error } = await supabase.auth.signInWithPassword({
email: normalizedEmail,
password,
})

if (error) {
markFailedAttempt("login", normalizedEmail)
return { data: null, error: mapAuthError(error, "Unable to sign in right now.") }
}

clearAttempts("login", normalizedEmail)

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

const rate = checkRateLimit("reset", normalizedEmail)
if (!rate.allowed)
return {
error: createClientError(`Too many reset attempts. Try again in ${rate.waitSeconds}s.`),
}

const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
redirectTo: `${window.location.origin}/reset-password`,
})

if (error) markFailedAttempt("reset", normalizedEmail)
else clearAttempts("reset", normalizedEmail)

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
