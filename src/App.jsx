import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
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
import { fetchOrganizationSettings } from "@/store/organization-settings/organization-settings.slice";
import EmployeePayroll from "./components/employee-transcation";
import AllTransactions from "./components/allTransacations";
import Settings from "./routes/organization settings/settings.component";

function App() {
	const navigate = useNavigate();
	const dispatch = useDispatch();
	const { user, isLoaded, isSignedIn } = useUser();

	useEffect(() => {
		// Fetch organization settings on app initialization
		dispatch(fetchOrganizationSettings());
	}, [dispatch]);

	useEffect(() => {
		if (isLoaded && !isSignedIn) {
			navigate("/users/login");
		}
	}, [isLoaded, isSignedIn, navigate]);

	useEffect(() => {
		if (isLoaded && isSignedIn) {
			const userRoles = user.publicMetadata?.roles ? (Array.isArray(user.publicMetadata.roles) ? user.publicMetadata.roles : [user.publicMetadata.roles]) : ["user"];

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
	}, [isLoaded, isSignedIn, user, dispatch]);

	return (
		<Routes>
			<Route path="/" element={<Page />}>
				<Route
					path="/employees/*"
					element={
						<ProtectedRoute allowedRoles={["admin", "viewEmployees"]}>
							<Employees />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/upload-data/*"
					element={
						<ProtectedRoute allowedRoles={["uploadData"]}>
							<AttendanceUpload />
						</ProtectedRoute>
					}
				/>
				<Route path="/settings/*" element={<Settings />} />
				<Route path="/unauthorized/*" element={<UnauthorizedPage />} />
			</Route>
			<Route path="/users/*" element={<Users />} />
			<Route path="/employeePayroll/*" element={<EmployeePayroll branchId="B001" employeeId="2" />} />
			<Route path="/allTransactions/*" element={<AllTransactions />} />
		</Routes>
	);
}

export default App;
