// Selectors
export const selectAllTransactions = (state) => state.payrollTransactions.allTransactions;
export const selectTransactionsByEmployee = (state, employeeId) =>
	state.payrollTransactions.byEmployee[employeeId] || [];
export const selectTransactionsStatus = (state) => state.payrollTransactions.status;
export const selectTransactionsError = (state) => state.payrollTransactions.error;
export const selectTransactionsErrorCode = (state) => state.payrollTransactions.lastErrorCode;
export const selectIsTransactionsLoading = (state) => state.payrollTransactions.loading;
