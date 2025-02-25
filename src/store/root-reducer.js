import { combineReducers } from "@reduxjs/toolkit";

import { userReducer } from "./user/user.reducer";
import { employeesReducer } from "./employees/employees.reducer";
import { cartReducer } from "./cart/cart.reducer";

export const rootReducer = combineReducers({
	user: userReducer,
	employees: employeesReducer,
	cart: cartReducer,
});
