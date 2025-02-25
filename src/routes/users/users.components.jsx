import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { useDispatch } from "react-redux";

import ProcessAttendance from "@/processAttendance";
import LoginPage from "@/app/authentication/login/page";
import RegisterPage from "@/app/authentication/register/page";

const Users = () => {
	return (
		<Routes>
			<Route path="login" element={<LoginPage />} />
			<Route path="register" element={<RegisterPage />} />
		</Routes>
	);
};

export default Users;
