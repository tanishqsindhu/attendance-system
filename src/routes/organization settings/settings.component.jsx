import { Routes, Route } from "react-router-dom";

import ShiftScheduleForm from "../../components/ShiftScheduleForm";
import HolidayManager from "../../components/HolidayManager";
import AttendanceRulesForm from "../../components/AttendanceRulesForm";

const Settings = () => {
	return (
		<Routes>
			{/* <Route index element={<UserProfilePage />} /> */}
			<Route path="/shift-schedule" element={<ShiftScheduleForm />} />
			<Route path="/holiday-manager" element={<HolidayManager />} />
			<Route path="/attendance-rules" element={<AttendanceRulesForm />} />
		</Routes>
	);
};

export default Settings;
