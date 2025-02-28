import { Routes, Route } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useEffect } from "react";
import Page from "./app/dashboard/page";
import AttendanceUpload from "@/upload-data.component";
import Employees from "./routes/employees/employees.component";
import "./App.css";
import { setCurrentUser } from "./store/user/user.reducer";
import Users from "./routes/users/users.components";
import { useUser } from "@clerk/clerk-react";
import UnauthorizedPage from "./app/authentication/unauthorized/unauthorized.component";
import ProtectedRoute from "./components/protected-routes"; // Import your RBAC route component
import { getOrganizationSettings } from "./firebase/firebase";
import { setOrganizationSettings } from "./store/orgaznization-settings/organization-settings.reducer";
setOrganizationSettings
function App() {
	const dispatch = useDispatch();
	// getOrganizationSettings()
	// dispatch(setOrganizationSettings);
	const { user, isLoaded, isSignedIn } = useUser();
	if (isLoaded && isSignedIn) {
		const userRoles = user.publicMetadata?.roles
			? Array.isArray(user.publicMetadata.roles)
				? user.publicMetadata.roles
				: [user.publicMetadata.roles]
			: ["user"];

		dispatch(
			setCurrentUser({
				id: user.id,
				username: user.username,
				email: user.primaryEmailAddress?.emailAddress,
				fullName: user.fullName,
				imageUrl: user.imageUrl,
				roles: userRoles, // Now always an array
			})
		);
	}
	return (
		<Routes>
			<Route path="/" element={<Page />}>
				<Route
					path="employees/*"
					element={
						<ProtectedRoute allowedRoles={["admin"]}>
							<Employees />
						</ProtectedRoute>
					}
				/>
				<Route
					path="upload-data/*"
					element={
						<ProtectedRoute allowedRoles={["uploadData"]}>
							<AttendanceUpload />
						</ProtectedRoute>
					}
				/>
				<Route path="users/*" element={<Users />} />
				<Route path="unauthorized/*" element={<UnauthorizedPage />} />
			</Route>
		</Routes>
	);
}

export default App;
