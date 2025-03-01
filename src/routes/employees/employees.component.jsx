import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import ProcessAttendance from "@/processAttendance";
import EmployeeProfile from "@/app/employees/employee-profile";
import EmployeesList from "@/app/employees/employee-list.component";
import AttendanceUpload from "@/upload-data.component";
import EmployeeAdd from "@/app/employees/addEmployee";
import { selectEmployeesByBranch } from "../../store/employees/employees.selector";
import { fetchEmployeesByBranch } from "@/store/employees/employees.reducer.js";

const Employees = () => {
	const dispatch = useDispatch();
	const employees = useSelector((state) => selectEmployeesByBranch(state, "B001"));

	useEffect(() => {
		dispatch(fetchEmployeesByBranch("B001"));
	}, [dispatch]);

	return (
		<Routes>
			<Route index element={<EmployeesList />} />
			<Route path="add" element={<EmployeeAdd />} />
			<Route path="attendance-process" element={<ProcessAttendance />} />
			<Route path="upload-data" element={<AttendanceUpload />} />
			<Route path="view/:empId" element={<EmployeeProfile />} />
		</Routes>
	);
};

export default Employees;
