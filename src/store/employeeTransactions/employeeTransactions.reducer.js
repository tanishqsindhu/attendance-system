// store/employee-transactions/employeeTransactionsSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getEmployeeTransactions, addEmployeeTransaction } from "@/firebase/firebase";

// Async thunks
export const fetchTransactions = createAsyncThunk(
	"employeeTransactions/fetchTransactions",
	async ({ branchId, employeeId }, { rejectWithValue }) => {
		try {
			const transactions = await getEmployeeTransactions(branchId, employeeId);
			return transactions;
		} catch (error) {
			return rejectWithValue(error.message);
		}
	}
);

export const addTransaction = createAsyncThunk(
	"employeeTransactions/addTransaction",
	async ({ branchId, employeeId, transaction }, { rejectWithValue }) => {
		try {
			const newTransaction = await addEmployeeTransaction(branchId, employeeId, transaction);
			return newTransaction;
		} catch (error) {
			return rejectWithValue(error.message);
		}
	}
);

// Create the slice
const employeeTransactionsSlice = createSlice({
	name: "employeeTransactions",
	initialState: {
		transactions: [],
		loading: false,
		error: null,
	},
	reducers: {
		clearTransactions: (state) => {
			state.transactions = [];
		},
		clearErrors: (state) => {
			state.error = null;
		},
	},
	extraReducers: (builder) => {
		builder
			// Fetch transactions cases
			.addCase(fetchTransactions.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchTransactions.fulfilled, (state, action) => {
				state.loading = false;
				state.transactions = action.payload;
			})
			.addCase(fetchTransactions.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})

			// Add transaction cases
			.addCase(addTransaction.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(addTransaction.fulfilled, (state, action) => {
				state.loading = false;
				state.transactions.push(action.payload);
			})
			.addCase(addTransaction.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			});
	},
});

// Export actions and reducer
export const { clearTransactions, clearErrors } = employeeTransactionsSlice.actions;

export default employeeTransactionsSlice.reducer;