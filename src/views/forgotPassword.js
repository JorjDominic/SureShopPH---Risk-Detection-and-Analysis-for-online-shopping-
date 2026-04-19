import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getRateLimitStatus, requestPasswordReset } from "../services/authService"
import "../styles/login.css"
import LandingHeader from "../components/LandingHeader"
import LandingFooter from "../components/LandingFooter"

const NEUTRAL_MESSAGE = "If the email is registered, a reset link will be sent shortly."

function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [lockSeconds, setLockSeconds] = useState(0)

  useEffect(() => {
    const { waitSeconds } = getRateLimitStatus("reset", email)
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

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (lockSeconds > 0) {
      setMessage(`Too many reset attempts. Try again in ${formatLockTimer(lockSeconds)}.`)
      return
    }

    setMessage("")
    setLoading(true)

    try {
      const { error } = await requestPasswordReset(email)
      if (error) {
        if (typeof error.waitSeconds === "number" && error.waitSeconds > 0) {
          setMessage(error.message)
          setLockSeconds(error.waitSeconds)
          return
        }

        if (error.__client) {
          setMessage(error.message)
          return
        }

        setMessage(NEUTRAL_MESSAGE)
        if (typeof error.waitSeconds === "number" && error.waitSeconds > 0) {
          setLockSeconds(error.waitSeconds)
        }
        const status = getRateLimitStatus("reset", email)
        if (status.isLocked) setLockSeconds(status.waitSeconds)
        return
      }

      setMessage(NEUTRAL_MESSAGE)
      setEmail("")
    } finally {
      setLoading(false)
    }
  }

  const isSuccess = message === NEUTRAL_MESSAGE

  return (
    <>
      <LandingHeader />
      <main className="login-page">
        <section className="auth-card">
          <div className="auth-kicker">Account Recovery</div>
          <h1>Forgot Password</h1>
          <p className="login-subtitle">
            No worries. Enter your email and we will send a secure reset link.
          </p>

          <div className="auth-info-panel">
            <p>For security, we always show a neutral response whether the account exists or not.</p>
          </div>

          {message ? (
            <div className={isSuccess ? "alert alert-success" : "alert alert-error"}>
              {message}
            </div>
          ) : null}

          {lockSeconds > 0 ? (
            <div className="auth-lock-timer" role="status" aria-live="polite">
              Reset locked for {formatLockTimer(lockSeconds)}
            </div>
          ) : null}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="forgot-email">Email</label>
              <input
                id="forgot-email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  if (message) setMessage("")
                }}
                required
              />
            </div>

            <button className="btn btn-primary btn-block" type="submit" disabled={loading || lockSeconds > 0}>
              {loading ? "Sending..." : lockSeconds > 0 ? `Try again in ${formatLockTimer(lockSeconds)}` : "Send reset link"}
            </button>
          </form>

          <div className="auth-links">
            <div className="auth-trust-row">
              <span>One-time reset token</span>
              <span>Link expires automatically</span>
            </div>
            <p>
              Remembered your password? <Link to="/login">Back to sign in</Link>
            </p>
            <p>
              Need an account? <Link to="/register">Create one</Link>
            </p>
          </div>
        </section>
      </main>
      <LandingFooter />
    </>
  )
}

export default ForgotPassword
