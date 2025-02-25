import "./App.css";
import Page from "./app/dashboard/page";
import { Routes, Route } from "react-router-dom";

import EmployeeProfile from "@/employee-profile";
import ProcessAttendance from "@/processAttendance";
import EmployeeForm from "@/addEmployee";
import AttendanceUpload from "@/upload-data.component";
import LoginPage from "./app/login/page";
function App() {
	return (
		<Routes>
			<Route path="/" element={<Page />}>
				<Route index element={<EmployeeProfile branchId={1} employeeId={2} />} />
				<Route path="upload-data/*" element={<AttendanceUpload />} />
				<Route
					path="add-employee"
					element={
						<EmployeeForm
							branches={{
								branch: { id: 1, name: "Scottish 16 & 17" },
								branch2: { id: 2, name: "Scottish South Bypass" },
							}}
						/>
					}
				/>
				<Route path="attendance-process" element={<ProcessAttendance />} />
				<Route path="login" element={<LoginPage />} />
			</Route>
		</Routes>
	);
}

export default App;
