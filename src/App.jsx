import { useState } from "react";
import "./App.css";
import PayrollDashboard from "./upload-data.component";
import EmployeeForm from "./addEmployee";

function App() {
	return (
		<>
			{/* <EmployeeForm
				branches={{
					branch: { id: 1, name: "Scottish 16 & 17" },
					branch2: { id: 2, name: "Scottish South Bypass" },
				}}
			/> */}
			<PayrollDashboard />
		</>
	);
}

export default App;
