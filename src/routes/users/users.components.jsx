import { Routes, Route } from "react-router-dom";

import LoginPage from "@/app/authentication/login/login.component";
import UserProfilePage from "@/app/authentication/user-profile/user-progfile.component";

const Users = () => {
	return (
		<Routes>
			<Route index element={<UserProfilePage />} />
			<Route path="login" element={<LoginPage />} />
		</Routes>
	);
};

export default Users;
