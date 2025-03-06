import { combineReducers } from "@reduxjs/toolkit";

import { userReducer } from "@/store/user/user.reducer";
import employeesReducer from "@/store/employees/employees.slice";
import organizationReducer from "@/store/organization-settings/organization-settings.slice";
import payrollTransactions from "@/store/employeeTransactions/employeeTransactions.slice";
import holidayReducer from "@/store/holiday/holiday.slice";
import attendanceRulesReducer from "@/store/attendance-rules/attendance-rules.slice";

export const rootReducer = combineReducers({
	user: userReducer,
	employees: employeesReducer,
	organization: organizationReducer,
	employeeTransactions: employeesReducer,
	payrollTransactions: payrollTransactions,
	holidays: holidayReducer,
	attendanceRules: attendanceRulesReducer,
});
