import { Routes, Route } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useEffect } from "react";

import Page from "./app/dashboard/page";
import AttendanceUpload from "@/upload-data.component";
import Employees from "./routes/employees/employees.component";
// import DemoPage from "./app/payments/page";
import "./App.css";

import { onAuthStateChangedListener, createUserDocumentFromAuth } from "./firebase/firebase";
import { setCurrentUser } from "./store/user/user.reducer";
import Users from "./routes/users/users.components";

function App() {
	const dispatch = useDispatch();

	useEffect(() => {
		const unsubscribe = onAuthStateChangedListener((user) => {
			if (user) {
				createUserDocumentFromAuth(user);
			}
			const pickedUser = user && (({ accessToken, email }) => ({ accessToken, email }))(user);
			dispatch(setCurrentUser(pickedUser));
		});

		return unsubscribe;
	}, []);
	return (
		<Routes>
			<Route path="/" element={<Page />}>
				<Route path="employees/*" element={<Employees />} />
				<Route path="upload-data/*" element={<AttendanceUpload />} />
				<Route path="users/*" element={<Users />} />
				{/* <Route path="payment" element={<DemoPage />} /> */}
			</Route>
		</Routes>
	);
}

export default App;
