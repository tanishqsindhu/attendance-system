import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { useDispatch } from "react-redux";

// import { getCategoriesAndDocuments } from "../../firebase/firebase";
// import { setCategories } from "./store/categories/category.reducer";
import EmployeeForm from "@/addEmployee";
import ProcessAttendance from "@/processAttendance";
import EmployeeProfile from "@/employee-profile";
import EmployeesList from "@/app/employees/employee-list.component";
import AttendanceUpload from "@/upload-data.component";

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
			<Route path="upload-data" element={<AttendanceUpload />} />
			<Route path=":empId" element={<EmployeeProfile />} />
		</Routes>
	);
};

export default Employees;
