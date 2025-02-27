import { Navigate } from "react-router-dom";
import { selectCurrentUser } from "@/store/user/user.selector";
import { useSelector } from "react-redux";
import ProtectedRouteLoading from "./protector-loading";
import { Lock, ShieldCheck } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import PropTypes from "prop-types";

const ProtectedRoute = ({ children, allowedRoles }) => {
	const { isLoaded } = useUser();
	const currentUser = useSelector(selectCurrentUser);

	if (!isLoaded) {
		return (
			<ProtectedRouteLoading
				title="Authenticating User"
				description="Hang tight! We're checking your access level."
				icon={ShieldCheck}
				secondaryIcon={Lock}
				loadingSpeed={250}
			/>
		);
	}

	// Clerk has loaded but no user in Redux - redirect to login
	if (!currentUser) {
		return <Navigate to="/users/login" />;
	}

	// Ensure roles is always an array
	const userRoles = Array.isArray(currentUser.roles) ? currentUser.roles : [currentUser.roles];

	// Check if user has at least one of the required roles
	const hasAccess = allowedRoles.some((role) => userRoles.includes(role));

	if (!hasAccess) {
		return <Navigate to="/unauthorized" />;
	}

	return children;
};

ProtectedRoute.propTypes = {
	children: PropTypes.node.isRequired,
	allowedRoles: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default ProtectedRoute;
