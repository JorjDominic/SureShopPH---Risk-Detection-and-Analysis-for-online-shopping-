import { useState } from "react"
import { Link } from "react-router-dom"
import { registerUser, signInWithGoogle, validateEmailFormat, validatePasswordRules } from "../services/authService"
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
	const [loading, setLoading] = useState(false)
	const [googleLoading, setGoogleLoading] = useState(false)

	const handleRegister = async (event) => {
		event.preventDefault()
		setMessage("")

		if (!validateEmailFormat(email)) {
			setMessage("Please enter a valid email address")
			return
		}

		const passwordValidationError = validatePasswordRules(password)
		if (passwordValidationError) {
			setMessage(passwordValidationError)
			return
		}

		if (password !== confirmPassword) {
			setMessage("Passwords do not match.")
			return
		}

		setLoading(true)

		try {
			const { error } = await registerUser(email, password, confirmPassword)

			if (error) {
				setMessage(error.message)
				return
			}

			setMessage("Registration successful. Check your email for verification.")
			setPassword("")
			setConfirmPassword("")
		} finally {
			setLoading(false)
		}
	}

	const handleGoogleSignUp = async () => {
		setMessage("")
		setGoogleLoading(true)
		try {
			const { error } = await signInWithGoogle()
			if (error) {
				setMessage(error.message)
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
								message.startsWith("Registration successful")
									? "alert alert-success"
									: "alert alert-error"
							}
						>
							{message}
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

						<button className="btn btn-primary btn-block" type="submit" disabled={loading}>
							{loading ? "Creating account..." : "Create Account"}
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
