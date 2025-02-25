import { cn } from "@/lib/utils";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	createAuthUserWithEmailAndPassword,
	createUserDocumentFromAuth,
} from "@/firebase/firebase";
import { useNavigate } from "react-router-dom";

const defaultFormFields = {
	displayName: "",
	email: "",
	password: "",
	confirmPassword: "",
};

export function RegisterForm({ className, ...props }) {
	const [formFields, setFormFields] = useState(defaultFormFields);
	const { displayName, email, password, confirmPassword } = formFields;

	const resetFormFields = () => {
		setFormFields(defaultFormFields);
	};

	const handleSubmit = async (event) => {
		event.preventDefault();

		if (password !== confirmPassword) {
			alert("passwords do not match");
			return;
		}

		try {
			const { user } = await createAuthUserWithEmailAndPassword(email, password);

			await createUserDocumentFromAuth(user, { displayName });
			resetFormFields();
		} catch (error) {
			if (error.code === "auth/email-already-in-use") {
				alert("Cannot create user, email already in use");
			} else {
				console.log("user creation encountered an error", error);
			}
		}
	};

	const handleChange = (event) => {
		const { name, value } = event.target;

		setFormFields({ ...formFields, [name]: value });
	};

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card>
				<CardHeader className="text-center">
					<CardTitle className="text-xl">Don&apos;t have an account?</CardTitle>
					<CardDescription>Sign up with your email and password</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit}>
						<div className="grid gap-6">
							<div className="grid gap-6">
								<div className="grid gap-3">
									<Label htmlFor="displayName">Display Name</Label>
									<Input
										name="displayName"
										id="displayName"
										type="text"
										placeholder="Enter Your Display Name"
										onChange={handleChange}
										required
									/>
								</div>
								<div className="grid gap-3">
									<Label htmlFor="email">Email</Label>
									<Input
										name="email"
										id="email"
										type="email"
										placeholder="m@example.com"
										onChange={handleChange}
										required
									/>
								</div>
								<div className="grid gap-3">
									<div className="flex items-center">
										<Label htmlFor="password">Password</Label>
										{/* <a href="#" className="ml-auto text-sm underline-offset-4 hover:underline">
											Forgot your password?
										</a> */}
									</div>

									<Input
										id="password"
										name="password"
										type="password"
										required
										onChange={handleChange}
									/>
								</div>
								<div className="grid gap-3">
									<div className="flex items-center">
										<Label htmlFor="confirm-password">Confirm Password</Label>
										{/* <a href="#" className="ml-auto text-sm underline-offset-4 hover:underline">
											Forgot your password?
										</a> */}
									</div>

									<Input
										id="confirm-password"
										name="confirmPassword"
										type="password"
										required
										onChange={handleChange}
									/>
								</div>
								<Button type="submit" className="w-full">
									Sign Up!
								</Button>
							</div>
							<div className="text-center text-sm">
								Already have an account?{" "}
								<a href="/users/login" className="underline underline-offset-4">
									Login
								</a>
							</div>
						</div>
					</form>
				</CardContent>
			</Card>
			<div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
				By clicking continue, you agree to our <a href="#">Terms of Service</a> and{" "}
				<a href="#">Privacy Policy</a>.
			</div>
		</div>
	);
}
