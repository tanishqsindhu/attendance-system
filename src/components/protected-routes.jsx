import { Navigate } from "react-router-dom";
import { selectCurrentUser } from "@/store/user/user.selector";
import { useSelector } from "react-redux";
import ProtectedRouteLoading from "./protector-loading";
import { Lock, ShieldCheck } from "lucide-react";
import { useUser } from "@clerk/clerk-react";

const ProtectedRoute = ({ children, allowedRoles }) => {
	const { isLoaded } = useUser();
	if (!isLoaded) return <ProtectedRouteLoading title="Authenticating User" description="Hang tight! We're checking your access level." icon={ShieldCheck} secondaryIcon={Lock} loadingSpeed={250} />;
	if (isLoaded) {
		const currentUser = useSelector(selectCurrentUser);
		if (!currentUser) return <Navigate to="/users/login" />;

		const hasAccess = currentUser.roles.some((role) => allowedRoles.includes(role));

		if (!hasAccess) return <Navigate to="/unauthorized" />;

		return children;
	}
};

export default ProtectedRoute;
