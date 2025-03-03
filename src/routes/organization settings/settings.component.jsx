import { Routes, Route } from "react-router-dom";

import HolidayManager from "../../components/HolidayManager";
import AttendanceRulesForm from "../../components/AttendanceRulesForm";
import CustomShiftsPage from "../../app/custom-shifts/custom-shifts-page";

const Settings = () => {
	return (
		<Routes>
			{/* <Route index element={<UserProfilePage />} /> */}
			<Route path="/shift-schedule" element={<CustomShiftsPage />} />
			<Route path="/holiday-manager" element={<HolidayManager />} />
			<Route path="/attendance-rules" element={<AttendanceRulesForm />} />
		</Routes>
	);
};

export default Settings;
