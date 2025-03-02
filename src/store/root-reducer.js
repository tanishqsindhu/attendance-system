import { combineReducers } from "@reduxjs/toolkit";

import { userReducer } from "@/store/user/user.reducer";
import  employeesReducer from "@/store/employees/employees.reducer";
import { cartReducer } from "@/store/cart/cart.reducer";
import organizationReducer from "@/store/orgaznization-settings/organization-settings.reducer";

export const rootReducer = combineReducers({
	user: userReducer,
	employees: employeesReducer,
	cart: cartReducer,
	organization: organizationReducer,
	employeeTransactions:employeesReducer,
});
