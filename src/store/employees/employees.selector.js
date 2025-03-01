// Selectors
export const selectEmployeesByBranch = (state, branchId) =>
	state.employees.byBranch[branchId] || [];
export const selectAllEmployees = (state) => state.employees.allEmployees;
export const selectEmployeesStatus = (state) => state.employees.status;
export const selectEmployeesError = (state) => state.employees.error;
export const selectEmployeesErrorCode = (state) => state.employees.lastErrorCode;
export const selectIsEmployeeLoading = (state) => state.employees.loading;
