import { SignIn } from "@clerk/clerk-react";

export default function LoginPage() {
	return (
		<div className="bg-[url('https://res.cloudinary.com/djfy7fvq1/image/upload/v1678905545/Scottish/MST_0203_wiesjz.jpg')] bg-cover bg-center h-screen bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
			<SignIn />
		</div>
	);
}
