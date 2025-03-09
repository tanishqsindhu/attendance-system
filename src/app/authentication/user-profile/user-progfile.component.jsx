import { UserProfile } from "@clerk/clerk-react";

export default function UserProfilePage() {
	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
			<UserProfile />
		</div>
	);
}
