import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import ProcessAttendance from "@/processAttendance";
import EmployeeProfile from "@/app/employees/employee-profile";
import EmployeesList from "@/app/employees/employee-list.component";
import AttendanceUpload from "@/upload-data.component";
import EmployeeAdd from "@/app/employees/addEmployee";
import { fetchEmployeesByBranch, selectEmployeesByBranch } from "@/store/employees/employees.slice.js";
import { selectActiveBranch } from "@/store/organization-settings/organization-settings.slice.js";
import ProtectedRoute from "@/components/protected-routes";

const Employees = () => {
	const dispatch = useDispatch();
	const activeBranch = useSelector(selectActiveBranch);
	const employees = useSelector((state) => (activeBranch ? selectEmployeesByBranch(state, activeBranch.id) : []));

	useEffect(() => {
		if (activeBranch) {
			dispatch(fetchEmployeesByBranch(activeBranch.id));
		}
	}, [dispatch, activeBranch]);

	// Render a fallback UI if activeBranch is not set
	if (!activeBranch) {
		return <div>Loading...</div>;
	}

	return (
		<Routes>
			<Route index element={<EmployeesList />} />
			<Route
				path="add"
				element={
					<ProtectedRoute allowedRoles={["admin", "viewEmployees"]}>
						<EmployeeAdd />
					</ProtectedRoute>
				}
			/>
			<Route
				path="attendance-process"
				element={
					<ProtectedRoute allowedRoles={["admin", "processEmployees"]}>
						<ProcessAttendance />
					</ProtectedRoute>
				}
			/>
			<Route
				path="upload-data"
				element={
					<ProtectedRoute allowedRoles={["admin", "uploadAttendance"]}>
						<AttendanceUpload />
					</ProtectedRoute>
				}
			/>
			<Route
				path=":empId"
				element={
					<ProtectedRoute allowedRoles={["admin", "viewEmployee"]}>
						<EmployeeProfile />
					</ProtectedRoute>
				}
			/>
		</Routes>
	);
};

export default Employees;
