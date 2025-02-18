import React, { useState, useEffect } from "react";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase/firebase";

const Login = ({ onLoginSuccess }) => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");

	const handleLogin = async () => {
		try {
			await signInWithEmailAndPassword(auth, email, password);
			onLoginSuccess();
		} catch (error) {
			setError("Failed to sign in: " + error.message);
		}
	};

	useEffect(() => {
		onAuthStateChanged(auth, (user) => {
			if (user) {
				onLoginSuccess(); // Redirect to main app after successful login
			}
		});
	}, []);

	return (
		<div>
			<h2>Login</h2>
			<input
				type="email"
				value={email}
				onChange={(e) => setEmail(e.target.value)}
				placeholder="Email"
			/>
			<input
				type="password"
				value={password}
				onChange={(e) => setPassword(e.target.value)}
				placeholder="Password"
			/>
			<button onClick={handleLogin}>Login</button>
			{error && <p>{error}</p>}
		</div>
	);
};

export default Login;
