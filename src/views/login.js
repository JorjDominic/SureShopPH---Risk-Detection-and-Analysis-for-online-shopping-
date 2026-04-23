import { useEffect, useState } from "react"
import SkeletonLoader from "../components/SkeletonLoader"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { getRateLimitStatus, loginUser, signInWithGoogle, validateEmailFormat } from "../services/authService"
import GoogleLogo from "../components/GoogleLogo"
import "../styles/login.css"
import "../styles/fadeout.css"
import LandingHeader from "../components/LandingHeader"
import LandingFooter from "../components/LandingFooter"

const MAX_EMAIL_LENGTH = 255
const MAX_PASSWORD_LENGTH = 255

function Login() {

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState("error")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)
  const [lockSeconds, setLockSeconds] = useState(0)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const navigate = useNavigate()
  const location = useLocation()

  const redirectPath = location.state?.from || null

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get("verified") === "1") {
      setMessage("Email verified successfully. You can now sign in.")
      setMessageType("success")
    }
  }, [location.search])

  useEffect(() => {
    const { waitSeconds } = getRateLimitStatus("login", email)
    setLockSeconds(waitSeconds)
  }, [email])

  useEffect(() => {
    if (lockSeconds <= 0) return undefined

    const timer = setInterval(() => {
      setLockSeconds((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [lockSeconds])

  const formatLockTimer = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }

  const validateField = (field, value) => {
    if (field === "email") {
      const nextValue = (value || "").trim()
      if (!nextValue) return "Email is required."
      if (nextValue.length > MAX_EMAIL_LENGTH) return `Email must not exceed ${MAX_EMAIL_LENGTH} characters.`
      if (!validateEmailFormat(nextValue)) return "Please enter a valid email address."
      return ""
    }

    if (field === "password") {
      if (!value) return "Password is required."
      if (value.length > MAX_PASSWORD_LENGTH) return `Password must not exceed ${MAX_PASSWORD_LENGTH} characters.`
      return ""
    }

    return ""
  }

  const validateForm = () => {
    const nextErrors = {
      email: validateField("email", email),
      password: validateField("password", password),
    }

    setErrors(nextErrors)
    return !nextErrors.email && !nextErrors.password
  }

  const handleBlur = (field, value) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }))
  }

  const handleLogin = async (event) => {
    event.preventDefault()

    const isValid = validateForm()
    if (!isValid) {
      setMessage("Please correct the highlighted fields and try again.")
      setMessageType("error")
      return
    }

    if (lockSeconds > 0) {
      setMessage(`Too many login attempts. Try again in ${formatLockTimer(lockSeconds)}.`)
      setMessageType("error")
      return
    }

    setMessage("")
    setMessageType("error")
    setLoading(true)

    try {
      const { error } = await loginUser(email, password)
      if (error) {
        setMessage(error.message)
        setMessageType("error")

        if (typeof error.waitSeconds === "number" && error.waitSeconds > 0) {
          setLockSeconds(error.waitSeconds)
        }

        const status = getRateLimitStatus("login", email)
        if (status.isLocked) setLockSeconds(status.waitSeconds)
        return
      }

      setTimeout(() => {
        setFadeOut(true)
        setTimeout(() => {
          const role =
            data?.user?.app_metadata?.role ||
            data?.user?.user_metadata?.role
          const destination = redirectPath || (role === 'admin' ? '/admin' : '/userdashboard')
          navigate(destination, { replace: true })
          setFadeOut(false)
        }, 350)
      }, 350)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setMessage("")
    setMessageType("error")
    setGoogleLoading(true)
    try {
      const { error } = await signInWithGoogle()
      if (error) {
        setMessage(error.message)
        setMessageType("error")
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <>
      <LandingHeader />
      <main className="login-page">
        <section className="auth-card">
          <div className="auth-kicker">Secure Access</div>
          <h1>Welcome back</h1>
          <p className="login-subtitle">
            Continue to your SureShop protection dashboard and real-time scam alerts.
          </p>

          {message ? (
            <div className={messageType === "success" ? "alert alert-success" : "alert alert-error"}>
              {message}
            </div>
          ) : null}

          {lockSeconds > 0 ? (
            <div className="auth-lock-timer" role="status" aria-live="polite">
              Login locked for {formatLockTimer(lockSeconds)}
            </div>
          ) : null}

          {loading || fadeOut ? (
            <div className={fadeOut ? "fade-out" : ""}>
              <SkeletonLoader />
            </div>
          ) : (
            <>
              <button
                type="button"
                className="auth-google-btn"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
              >
                <span className="auth-google-icon" aria-hidden="true"><GoogleLogo /></span>
                <span>{googleLoading ? "Redirecting to Google..." : "Continue with Google"}</span>
              </button>

              <div className="auth-divider"><span>or use email</span></div>

              <form onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="Email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    if (message) setMessage("")
                    if (errors.email) {
                      setErrors((prev) => ({ ...prev, email: validateField("email", event.target.value) }))
                    }
                  }}
                  onBlur={(event) => handleBlur("email", event.target.value)}
                  aria-invalid={Boolean(touched.email && errors.email)}
                  aria-describedby={touched.email && errors.email ? "login-email-error" : undefined}
                  required
                />
                {touched.email && errors.email ? <p className="auth-field-error" id="login-email-error">{errors.email}</p> : null}
              </div>

              <div className="form-group">
                <label htmlFor="login-password">Password</label>
                <div className="password-input-wrap">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      if (message) setMessage("")
                      if (errors.password) {
                        setErrors((prev) => ({ ...prev, password: validateField("password", event.target.value) }))
                      }
                    }}
                    onBlur={(event) => handleBlur("password", event.target.value)}
                    aria-invalid={Boolean(touched.password && errors.password)}
                    aria-describedby={touched.password && errors.password ? "login-password-error" : undefined}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {touched.password && errors.password ? <p className="auth-field-error" id="login-password-error">{errors.password}</p> : null}
              </div>

              <div className="auth-inline-links">
                <Link to="/forgot-password">Forgot password?</Link>
              </div>

              <button className="btn btn-primary btn-block" type="submit" disabled={loading || lockSeconds > 0}>
                {loading ? "Signing in..." : lockSeconds > 0 ? `Try again in ${formatLockTimer(lockSeconds)}` : "Login"}
              </button>
              </form>
            </>
          )}

          <div className="auth-links">
            <div className="auth-trust-row">
              <span>Encrypted sign-in</span>
              <span>Fraud shield active</span>
            </div>
            <p>
              New here? <Link to="/register">Create an account</Link>
            </p>
            <p>
              <Link to="/">Back to home</Link>
            </p>
          </div>
        </section>
      </main>
      <LandingFooter />
    </>
  )

}

export default Login