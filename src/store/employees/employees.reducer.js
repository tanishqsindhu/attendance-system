import { createSlice } from "@reduxjs/toolkit";

const INITIAL_STATE = {
	employees: [],
};

export const employeesSlice = createSlice({
	name: "employees",
	initialState: INITIAL_STATE,
	reducers: {
		setEmployees(state, action) {
			state.employees = action.payload;
		},
	},
});

export const { setEmployees } = employeesSlice.actions;

export const employeesReducer = employeesSlice.reducer;
