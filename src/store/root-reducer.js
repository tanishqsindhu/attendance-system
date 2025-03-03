import { combineReducers } from "@reduxjs/toolkit";

import { userReducer } from "@/store/user/user.reducer";
import employeesReducer from "@/store/employees/employees.reducer";
import { cartReducer } from "@/store/cart/cart.reducer";
import organizationReducer from "@/store/orgaznization-settings/organization-settings.reducer";
import payrollTransactions from "@/store/employeeTransactions/employeeTransactions.reducer";
import holidayReducer from "@/store/holiday/holiday.reducer.jsx";
import attendanceRulesReducer from "@/store/attendance-rules/attendance-rules.reducer";
import customShiftsReducer from "@/store/custom-shift/custom-shift.reducer";

export const rootReducer = combineReducers({
	user: userReducer,
	employees: employeesReducer,
	cart: cartReducer,
	organization: organizationReducer,
	employeeTransactions: employeesReducer,
	payrollTransactions: payrollTransactions,
	holidays: holidayReducer,
	attendanceRules: attendanceRulesReducer,
	customShifts: customShiftsReducer,
});
