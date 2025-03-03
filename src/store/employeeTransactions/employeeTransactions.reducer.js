import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { PayrollService } from "@/firebase/firebase";

// Async thunks for payroll transactions
export const fetchAllTransactions = createAsyncThunk(
	"payrollTransactions/fetchAll",
	async (_, { rejectWithValue }) => {
		try {
			const transactions = await PayrollService.getAllTransactions();
			return transactions;
		} catch (error) {
			return rejectWithValue(error.message);
		}
	}
);

export const fetchEmployeeTransactions = createAsyncThunk(
	"payrollTransactions/fetchByEmployee",
	async ({ branchId, employeeId }, { rejectWithValue }) => {
		try {
			const transactions = await PayrollService.getEmployeeTransactions(branchId, employeeId);
			return { employeeId, transactions };
		} catch (error) {
			return rejectWithValue(error.message);
		}
	}
);

export const addTransaction = createAsyncThunk(
	"payrollTransactions/add",
	async (transactionData, { rejectWithValue }) => {
		try {
			const { branchId, employeeId } = transactionData;
			const newTransaction = await PayrollService.addTransaction(transactionData);
			return {
				branchId,
				employeeId,
				transaction: newTransaction,
			};
		} catch (error) {
			return rejectWithValue({
				code: "ADD_TRANSACTION_ERROR",
				message: error.message || "Failed to add transaction",
			});
		}
	}
);

// Initial state
const initialState = {
	allTransactions: [], // All transactions across all employees for reporting
	byEmployee: {}, // Transactions organized by employee { employeeId: [transactions] }
	loading: false,
	status: "idle",
	error: null,
	lastErrorCode: null,
};

// Payroll transactions slice
const payrollTransactionsSlice = createSlice({
	name: "payrollTransactions",
	initialState,
	reducers: {
		clearTransactionsError: (state) => {
			state.error = null;
			state.lastErrorCode = null;
		},
		setTransactionsStatus: (state, action) => {
			state.status = action.payload;
		},
	},
	extraReducers: (builder) => {
		builder
			// Fetch all transactions
			.addCase(fetchAllTransactions.pending, (state) => {
				state.loading = true;
				state.status = "loading";
				state.error = null;
			})
			.addCase(fetchAllTransactions.fulfilled, (state, action) => {
				state.loading = false;
				state.status = "succeeded";
				state.allTransactions = action.payload;

				// Also organize by employee for quick access
				action.payload.forEach((transaction) => {
					const { employeeId } = transaction;
					if (!state.byEmployee[employeeId]) {
						state.byEmployee[employeeId] = [];
					}

					// Avoid duplicates
					const exists = state.byEmployee[employeeId].some((t) => t.id === transaction.id);
					if (!exists) {
						state.byEmployee[employeeId].push(transaction);
					}
				});
			})
			.addCase(fetchAllTransactions.rejected, (state, action) => {
				state.loading = false;
				state.status = "failed";
				state.error = action.payload || action.error.message;
				state.lastErrorCode = "FETCH_ALL_ERROR";
			})

			// Fetch employee transactions
			.addCase(fetchEmployeeTransactions.pending, (state) => {
				state.loading = true;
				state.status = "loading";
				state.error = null;
			})
			.addCase(fetchEmployeeTransactions.fulfilled, (state, action) => {
				state.loading = false;
				state.status = "succeeded";
				const { employeeId, transactions } = action.payload;

				// Update employee-specific transactions
				state.byEmployee[employeeId] = transactions;

				// Update allTransactions by removing old entries for this employee and adding new ones
				state.allTransactions = state.allTransactions.filter((t) => t.employeeId !== employeeId);
				state.allTransactions = [...state.allTransactions, ...transactions];
			})
			.addCase(fetchEmployeeTransactions.rejected, (state, action) => {
				state.loading = false;
				state.status = "failed";
				state.error = action.payload || action.error.message;
				state.lastErrorCode = "FETCH_EMPLOYEE_ERROR";
			})

			// Add transaction
			.addCase(addTransaction.pending, (state) => {
				state.loading = true;
				state.status = "loading";
				state.error = null;
			})
			.addCase(addTransaction.fulfilled, (state, action) => {
				state.loading = false;
				state.status = "succeeded";
				const { employeeId, transaction } = action.payload;

				// Add to employee-specific list
				if (!state.byEmployee[employeeId]) {
					state.byEmployee[employeeId] = [];
				}
				state.byEmployee[employeeId].push(transaction);

				// Add to allTransactions list
				state.allTransactions.push(transaction);
			})
			.addCase(addTransaction.rejected, (state, action) => {
				state.loading = false;
				state.status = "failed";
				if (action.payload && typeof action.payload === "object") {
					state.error = action.payload.message;
					state.lastErrorCode = action.payload.code;
				} else {
					state.error = action.payload || action.error.message;
					state.lastErrorCode = "ADD_TRANSACTION_ERROR";
				}
			});
	},
});

// Export actions
export const { clearTransactionsError, setTransactionsStatus } = payrollTransactionsSlice.actions;



export default payrollTransactionsSlice.reducer;
