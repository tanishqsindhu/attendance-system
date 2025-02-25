import { createSelector } from "reselect";

const selectEmployeesReducer = (state) => state.employees;

export const selectEmployees = createSelector([selectEmployeesReducer], (employeesSlice) => employeesSlice.employees);

export const selectemployeesMap = createSelector([selectEmployees], (employees) =>
	employees.reduce((acc, employees) => {
		const { title, items } = employees;
		acc[title.toLowerCase()] = items;
		return acc;
	}, {})
);
