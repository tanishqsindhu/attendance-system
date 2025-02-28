import { combineReducers } from "@reduxjs/toolkit";

import { userReducer } from "./user/user.reducer";
import { employeesReducer } from "./employees/employees.reducer";
import { cartReducer } from "./cart/cart.reducer";
import { organizationSettingsReducer } from "./orgaznization-settings/organization-settings.reducer";

export const rootReducer = combineReducers({
	user: userReducer,
	employees: employeesReducer,
	cart: cartReducer,
	organizationSettings:organizationSettingsReducer,
});
