import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { useDispatch } from "react-redux";

// import { getCategoriesAndDocuments } from "../../firebase/firebase";
// import { setCategories } from "./store/categories/category.reducer";

import ProcessAttendance from "@/processAttendance";
import EmployeeProfile from "@/app/employees/employee-profile";
import EmployeesList from "@/app/employees/employee-list.component";
import AttendanceUpload from "@/upload-data.component";
import EmployeeAdd from "@/app/employees/addEmployee";

const Employees = () => {
	const dispatch = useDispatch();

	useEffect(() => {
		const getCategoriesMap = async () => {
			// const categoriesArray = await getCategoriesAndDocuments("categories");
			// dispatch(setCategories(categoriesArray));
		};

		getCategoriesMap();
	}, []);

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
