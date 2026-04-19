import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getRateLimitStatus, normalizeEmail, registerUser, resendVerificationEmail, signInWithGoogle, validateEmailFormat, validatePasswordRules } from "../services/authService"
import GoogleLogo from "../components/GoogleLogo"
import "../styles/register.css"
import LandingHeader from "../components/LandingHeader"
import LandingFooter from "../components/LandingFooter"

function Register() {
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [confirmPassword, setConfirmPassword] = useState("")
	const [showPassword, setShowPassword] = useState(false)
	const [showConfirmPassword, setShowConfirmPassword] = useState(false)
	const [message, setMessage] = useState("")
	const [messageType, setMessageType] = useState("error")
	const [loading, setLoading] = useState(false)
	const [googleLoading, setGoogleLoading] = useState(false)
	const [resendLoading, setResendLoading] = useState(false)
	const [pendingVerificationEmail, setPendingVerificationEmail] = useState("")
	const [lockSeconds, setLockSeconds] = useState(0)

	useEffect(() => {
		const { waitSeconds } = getRateLimitStatus("register", email)
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

	const handleRegister = async (event) => {
		event.preventDefault()
		if (lockSeconds > 0) {
			setMessage(`Too many registration attempts. Try again in ${formatLockTimer(lockSeconds)}.`)
			setMessageType("error")
			return
		}

		setMessage("")
		setMessageType("error")

		if (!validateEmailFormat(email)) {
			setMessage("Please enter a valid email address")
			setMessageType("error")
			return
		}

		const passwordValidationError = validatePasswordRules(password)
		if (passwordValidationError) {
			setMessage(passwordValidationError)
			setMessageType("error")
			return
		}

		if (password !== confirmPassword) {
			setMessage("Passwords do not match.")
			setMessageType("error")
			return
		}

		setLoading(true)

		try {
			const { error } = await registerUser(email, password, confirmPassword)

			if (error) {
				setMessage(error.message)
				setMessageType("error")
				if (typeof error.waitSeconds === "number" && error.waitSeconds > 0) {
					setLockSeconds(error.waitSeconds)
				}
				const status = getRateLimitStatus("register", email)
				if (status.isLocked) setLockSeconds(status.waitSeconds)
				return
			}

			setPendingVerificationEmail(normalizeEmail(email))
			setMessage("Registration successful. We sent a verification link to your inbox.")
			setMessageType("success")
			setPassword("")
			setConfirmPassword("")
		} finally {
			setLoading(false)
		}
	}

	const handleResendVerification = async () => {
		if (!pendingVerificationEmail) return
		setResendLoading(true)
		try {
			const { error } = await resendVerificationEmail(pendingVerificationEmail)
			if (error) {
				setMessage(error.message)
				setMessageType("error")
				return
			}

			setMessage("Verification email sent again. Please check your inbox and spam folder.")
			setMessageType("success")
		} finally {
			setResendLoading(false)
		}
	}

	const handleGoogleSignUp = async () => {
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
			<main className="register-page">
				<section className="auth-card">
					<div className="auth-kicker">Smart Protection Starts Here</div>
					<h1>Create Account</h1>
					<p className="register-subtitle">
						Join SureShop and get safer shopping signals before every purchase.
					</p>

					{message ? (
						<div
							className={
								messageType === "success"
									? "alert alert-success"
									: "alert alert-error"
							}
						>
							{message}
						</div>
					) : null}

					{lockSeconds > 0 ? (
						<div className="auth-lock-timer" role="status" aria-live="polite">
							Registration locked for {formatLockTimer(lockSeconds)}
						</div>
					) : null}

					{pendingVerificationEmail ? (
						<div className="register-verify-panel">
							<p>
								Verification pending for <strong>{pendingVerificationEmail}</strong>
							</p>
							<button
								type="button"
								className="btn btn-secondary btn-block"
								onClick={handleResendVerification}
								disabled={resendLoading || loading || googleLoading}
							>
								{resendLoading ? "Resending verification email..." : "Resend verification email"}
							</button>
						</div>
					) : null}

					<button
						type="button"
						className="auth-google-btn auth-google-btn-register"
						onClick={handleGoogleSignUp}
						disabled={googleLoading || loading}
					>
						<span className="auth-google-icon" aria-hidden="true"><GoogleLogo /></span>
						<span>{googleLoading ? "Redirecting to Google..." : "Continue with Google"}</span>
					</button>

					<div className="auth-divider"><span>or register with email</span></div>

					<form onSubmit={handleRegister}>
						<div className="form-group">
							<label htmlFor="register-email">Email</label>
							<input
								id="register-email"
								type="email"
								placeholder="Email"
								value={email}
								onChange={(e) => {
									setEmail(e.target.value)
									if (message) setMessage("")
								}}
								required
							/>
						</div>

						<div className="form-group">
							<label htmlFor="register-password">Password</label>
							<div className="password-input-wrap">
								<input
									id="register-password"
									type={showPassword ? "text" : "password"}
									placeholder="Password"
									value={password}
									onChange={(e) => {
										setPassword(e.target.value)
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
							<label htmlFor="register-confirm-password">Confirm Password</label>
							<div className="password-input-wrap">
								<input
									id="register-confirm-password"
									type={showConfirmPassword ? "text" : "password"}
									placeholder="Confirm Password"
									value={confirmPassword}
									onChange={(e) => {
										setConfirmPassword(e.target.value)
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

						<button className="btn btn-primary btn-block" type="submit" disabled={loading || lockSeconds > 0}>
							{loading ? "Creating account..." : lockSeconds > 0 ? `Try again in ${formatLockTimer(lockSeconds)}` : "Create Account"}
						</button>
					</form>

					<div className="auth-links">
						<div className="auth-trust-row">
							<span>No hidden fees</span>
							<span>Privacy-first protection</span>
						</div>
						<p>
							Already have an account? <Link to="/login">Sign in</Link>
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

export default Register
