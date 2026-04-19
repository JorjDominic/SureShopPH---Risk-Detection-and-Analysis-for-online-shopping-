import { supabase } from "../config/supabase"

const LOGIN_WINDOW_MS = 10 * 60 * 1000
const LOGIN_MAX_ATTEMPTS = 5
const LOGIN_LOCK_MS = 5 * 60 * 1000
const RATE_KEY_PREFIX = "ss_login_rate_"

const createClientError = (message) => ({ message, __client: true })

export const normalizeEmail = (email = "") => email.trim().toLowerCase()

export const validateEmailFormat = (email = "") => {
  const value = normalizeEmail(email)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export const validatePasswordRules = (password = "") => {
  if (password.length < 8) {
    return "Password must be at least 8 characters long."
  }

  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
    return "Password must include both uppercase and lowercase letters."
  }

  if (!/\d/.test(password)) {
    return "Password must include at least one number."
  }

  return ""
}

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

const checkLoginRateLimit = (email) => {
  const now = Date.now()
  const { key, attempts, lockUntil } = getRateLimitState(email)

  if (lockUntil > now) {
    const wait = Math.ceil((lockUntil - now) / 1000)
    return { allowed: false, waitSeconds: wait }
  }

  const recentAttempts = attempts.filter((ts) => now - ts <= LOGIN_WINDOW_MS)
  saveRateLimitState(key, recentAttempts, 0)

  return { allowed: true, recentAttempts }
}

const markFailedLogin = (email) => {
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

const clearFailedLogins = (email) => {
  const { key } = getRateLimitState(email)
  localStorage.removeItem(key)
}

const mapAuthError = (error, fallback = "Something went wrong. Please try again.") => {
  if (!error) return null
  const message = (error.message || "").toLowerCase()

  if (message.includes("invalid login credentials")) {
    return createClientError("Invalid email or password.")
  }

  if (message.includes("email rate limit exceeded") || message.includes("too many requests")) {
    return createClientError("Too many attempts. Please wait a few minutes and try again.")
  }

  if (message.includes("user already registered")) {
    return createClientError("This email is already registered. Please sign in instead.")
  }

  if (message.includes("email not confirmed") || message.includes("email not verified")) {
    return createClientError("Your email is not verified yet. Please check your inbox and verify before signing in.")
  }

  if (
    message.includes("unsupported provider") ||
    message.includes("provider is not enabled") ||
    message.includes("validation_failed")
  ) {
    return createClientError("Google sign-in is not enabled yet. Please enable the Google provider in Supabase Auth settings.")
  }

  return createClientError(error.message || fallback)
}

export const registerUser = async (email, password, confirmPassword) => {
  const normalizedEmail = normalizeEmail(email)

  if (!validateEmailFormat(normalizedEmail)) {
    return { data: null, error: createClientError("Please enter a valid email address.") }
  }

  const passwordRuleError = validatePasswordRules(password)
  if (passwordRuleError) {
    return { data: null, error: createClientError(passwordRuleError) }
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    return { data: null, error: createClientError("Passwords do not match.") }
  }

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/login?verified=1`,
    },
  })

  return { data, error: mapAuthError(error, "Unable to register at the moment.") }
}

export const resendVerificationEmail = async (email) => {
  const normalizedEmail = normalizeEmail(email)

  if (!validateEmailFormat(normalizedEmail)) {
    return { error: createClientError("Please enter a valid email address.") }
  }

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: normalizedEmail,
    options: {
      emailRedirectTo: `${window.location.origin}/login?verified=1`,
    },
  })

  return { error: mapAuthError(error, "Unable to resend verification email right now.") }
}

export const loginUser = async (email, password) => {
  const normalizedEmail = normalizeEmail(email)

  if (!validateEmailFormat(normalizedEmail)) {
    return { data: null, error: createClientError("Please enter a valid email address.") }
  }

  if (!password) {
    return { data: null, error: createClientError("Please enter your password.") }
  }

  const rateState = checkLoginRateLimit(normalizedEmail)
  if (!rateState.allowed) {
    return {
      data: null,
      error: createClientError(`Too many failed attempts. Try again in ${rateState.waitSeconds} seconds.`),
    }
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  })

  if (error) {
    markFailedLogin(normalizedEmail)
    return { data: null, error: mapAuthError(error, "Unable to sign in right now.") }
  }

  clearFailedLogins(normalizedEmail)

  const user = data.user
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle()

  return {
    data: {
      user,
      profile,
    },
    error: null,
  }
}

export const signInWithGoogle = async () => {
  const redirectTo = `${window.location.origin}/userdashboard`
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
  })

  return { data, error: mapAuthError(error, "Unable to start Google sign-in right now.") }
}

export const requestPasswordReset = async (email) => {
  const normalizedEmail = normalizeEmail(email)

  if (!validateEmailFormat(normalizedEmail)) {
    return { error: createClientError("Please enter a valid email address.") }
  }

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: `${window.location.origin}/reset-password`,
  })

  if (error) {
    return { error: mapAuthError(error, "Unable to process request right now.") }
  }

  return { error: null }
}

export const updateUserPassword = async (password, confirmPassword) => {
  const passwordRuleError = validatePasswordRules(password)
  if (passwordRuleError) {
    return { error: createClientError(passwordRuleError) }
  }

  if (password !== confirmPassword) {
    return { error: createClientError("Passwords do not match.") }
  }

  const { error } = await supabase.auth.updateUser({ password })
  return { error: mapAuthError(error, "Unable to reset password right now.") }
}

export const getCurrentSession = async () => supabase.auth.getSession()

export const onAuthStateChange = (callback) => supabase.auth.onAuthStateChange(callback)

export const logoutUser = async () => {
  const { error } = await supabase.auth.signOut()
  return { error: mapAuthError(error, "Unable to sign out right now.") }
}