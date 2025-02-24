import "./App.css";
import PayrollDashboard from "./upload-data.component";
import EmployeeForm from "./addEmployee";
import ProcessAttendance from "./processAttendance";
import EmployeeProfile from "./employee-profile";
function App() {
	return (
		<>
			<EmployeeForm
				branches={{
					branch: { id: 1, name: "Scottish 16 & 17" },
					branch2: { id: 2, name: "Scottish South Bypass" },
				}}
			/>
			<PayrollDashboard />
			<ProcessAttendance />
			<EmployeeProfile branchId={1} employeeId={1}/>
		</>
	);
}

export default App;
