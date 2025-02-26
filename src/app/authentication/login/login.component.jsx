import { SignIn } from "@clerk/clerk-react";

export default function LoginPage() {
	return (
		<div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
			<SignIn />
		</div>
	);
}
