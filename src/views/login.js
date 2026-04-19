import { useEffect, useState } from "react"
import SkeletonLoader from "../components/SkeletonLoader"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { loginUser, signInWithGoogle } from "../services/authService"
import GoogleLogo from "../components/GoogleLogo"
import "../styles/login.css"
import "../styles/fadeout.css"
import LandingHeader from "../components/LandingHeader"
import LandingFooter from "../components/LandingFooter"

function Login() {

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState("error")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const redirectPath = location.state?.from || "/userdashboard"

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get("verified") === "1") {
      setMessage("Email verified successfully. You can now sign in.")
      setMessageType("success")
    }
  }, [location.search])

  const handleLogin = async (event) => {
    event.preventDefault()
    setMessage("")
    setMessageType("error")
    setLoading(true)

    try {
      const { error } = await loginUser(email, password)
      if (error) {
        setMessage(error.message)
        setMessageType("error")
        return
      }

      setTimeout(() => {
        setFadeOut(true)
        setTimeout(() => {
          navigate(redirectPath, { replace: true })
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
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    if (message) setMessage("")
                  }}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="login-password">Password</label>
                <div className="password-input-wrap">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
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

              <div className="auth-inline-links">
                <Link to="/forgot-password">Forgot password?</Link>
              </div>

              <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
                {loading ? "Signing in..." : "Login"}
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