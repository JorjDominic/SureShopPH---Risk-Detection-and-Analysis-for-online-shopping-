import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  getCurrentSession,
  updateUserPassword,
  validatePasswordRules,
} from "../services/authService"
import "../styles/login.css"
import LandingHeader from "../components/LandingHeader"
import LandingFooter from "../components/LandingFooter"

function ResetPassword() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [tokenValidating, setTokenValidating] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const validateToken = async () => {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""))
      const hashToken = hashParams.get("access_token")
      const hashType = hashParams.get("type")

      let { data } = await getCurrentSession()
      let hasSession = !!data?.session
      const hasRecoveryHash = Boolean(hashToken && hashType === "recovery")

      if (!hasSession && hasRecoveryHash) {
        await new Promise((resolve) => setTimeout(resolve, 300))
        const secondCheck = await getCurrentSession()
        hasSession = !!secondCheck.data?.session
      }

      setTokenValid(hasSession)
      setTokenValidating(false)
    }

    validateToken()
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setMessage("")

    const passwordError = validatePasswordRules(password)
    if (passwordError) {
      setMessage(passwordError)
      return
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.")
      return
    }

    setLoading(true)
    try {
      const { error } = await updateUserPassword(password, confirmPassword)
      if (error) {
        setMessage(error.message)
        return
      }

      setMessage("Password updated successfully. Redirecting to sign in...")
      setTimeout(() => {
        navigate("/login", { replace: true })
      }, 1200)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <LandingHeader />
      <main className="login-page">
        <section className="auth-card">
          <h1>Reset Password</h1>
          <p className="login-subtitle">
            Set a new password for your account.
          </p>

          {tokenValidating ? (
            <div className="alert alert-success">Validating reset link...</div>
          ) : null}

          {!tokenValidating && !tokenValid ? (
            <>
              <div className="alert alert-error">
                This reset link is invalid or expired. Request a new password reset email.
              </div>
              <div className="auth-links">
                <p>
                  <Link to="/forgot-password">Request new reset link</Link>
                </p>
                <p>
                  <Link to="/login">Back to sign in</Link>
                </p>
              </div>
            </>
          ) : null}

          {!tokenValidating && tokenValid ? (
            <>
              {message ? (
                <div className={message.startsWith("Password updated") ? "alert alert-success" : "alert alert-error"}>
                  {message}
                </div>
              ) : null}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="reset-password">New Password</label>
                  <div className="password-input-wrap">
                    <input
                      id="reset-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="New password"
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value)
                        if (message) setMessage("")
                      }}
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
                </div>

                <div className="form-group">
                  <label htmlFor="reset-confirm-password">Confirm New Password</label>
                  <div className="password-input-wrap">
                    <input
                      id="reset-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(event) => {
                        setConfirmPassword(event.target.value)
                        if (message) setMessage("")
                      }}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                    >
                      {showConfirmPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
                  {loading ? "Updating..." : "Update password"}
                </button>
              </form>

              <div className="auth-links">
                <p>
                  <Link to="/login">Back to sign in</Link>
                </p>
              </div>
            </>
          ) : null}
        </section>
      </main>
      <LandingFooter />
    </>
  )
}

export default ResetPassword
