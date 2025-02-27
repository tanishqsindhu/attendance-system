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
import DemoPage from "./app/payments/page";

function App() {
	const dispatch = useDispatch();
	const { user, isLoaded } = useUser();

	useEffect(() => {
		if (isLoaded && user) {
			dispatch(
				setCurrentUser({
					id: user.id,
					username: user.username,
					email: user.primaryEmailAddress?.emailAddress,
					fullName: user.fullName,
					imageUrl: user.imageUrl,
					roles: user.publicMetadata?.roles || "user",
				})
			);
		}
	}, [dispatch, isLoaded, user]);

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
				DemoPage
				<Route path="users/*" element={<Users />} />
				<Route path="data-table/*" element={<DemoPage />} />
				<Route path="unauthorized/*" element={<UnauthorizedPage />} />
			</Route>
		</Routes>
	);
}

export default App;
