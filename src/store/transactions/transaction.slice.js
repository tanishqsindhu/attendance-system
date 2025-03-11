// store/transactions/transaction.slice.js

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { addTransaction, getEmployeeTransactions, updateTransaction } from "@/firebase";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../user/user.selector";

// Async thunk to fetch employee transactions
export const fetchEmployeeTransactions = createAsyncThunk(
	"transactions/fetchEmployeeTransactions",
	async ({ branchId, employeeId }, { rejectWithValue }) => {
		try {
			const transactions = await getEmployeeTransactions(branchId, employeeId);
			return transactions;
		} catch (error) {
			return rejectWithValue(error.message);
		}
	}
);

// Async thunk to add a transaction
export const createTransaction = createAsyncThunk(
	"transactions/createTransaction",
	async ({ branchId, employeeId, transactionData,currentUser }, { rejectWithValue }) => {
		console.log(branchId, employeeId, transactionData);
		try {
			const transaction = await addTransaction(branchId, employeeId, transactionData);
			return transaction;
		} catch (error) {
			return rejectWithValue(error.message);
		}
	}
);

// Async thunk to update a transaction
export const modifyTransaction = createAsyncThunk(
	"transactions/modifyTransaction",
	async ({ branchId, transactionId, updateData }, { rejectWithValue }) => {
		try {
			await updateTransaction(branchId, transactionId, updateData);
			return { id: transactionId, ...updateData };
		} catch (error) {
			return rejectWithValue(error.message);
		}
	}
);

const transactionsSlice = createSlice({
	name: "transactions",
	initialState: {
		transactions: [],
		loading: false,
		error: null,
		currentEmployeeId: null,
		summary: {
			totalAdvance: 0,
			totalPayments: 0,
			totalReceiving: 0,
			balance: 0,
		},
	},
	reducers: {
		clearTransactions: (state) => {
			state.transactions = [];
			state.currentEmployeeId = null;
			state.summary = {
				totalAdvance: 0,
				totalPayments: 0,
				totalReceiving: 0,
				balance: 0,
			};
		},
		setCurrentEmployeeId: (state, action) => {
			state.currentEmployeeId = action.payload;
		},
		updateSummary: (state) => {
			const totalAdvance = state.transactions
				.filter((t) => t.type === "advance")
				.reduce((sum, t) => sum + t.amount, 0);

			const totalPayments = state.transactions
				.filter((t) => t.type === "payment")
				.reduce((sum, t) => sum + t.amount, 0);

			const totalReceiving = state.transactions
				.filter((t) => t.type === "receiving")
				.reduce((sum, t) => sum + t.amount, 0);

			const balance = totalAdvance + totalReceiving - totalPayments;

			state.summary = { totalAdvance, totalPayments, totalReceiving, balance };
		},
	},
	extraReducers: (builder) => {
		builder
			// Fetch transactions
			.addCase(fetchEmployeeTransactions.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchEmployeeTransactions.fulfilled, (state, action) => {
				state.loading = false;
				state.transactions = action.payload;
				state.currentEmployeeId = action.meta.arg.employeeId;

				// Update summary
				const totalAdvance = action.payload
					.filter((t) => t.type === "advance")
					.reduce((sum, t) => sum + t.amount, 0);

				const totalPayments = action.payload
					.filter((t) => t.type === "payment")
					.reduce((sum, t) => sum + t.amount, 0);

				const totalReceiving = action.payload
					.filter((t) => t.type === "receiving")
					.reduce((sum, t) => sum + t.amount, 0);

				const balance = totalAdvance + totalReceiving - totalPayments;

				state.summary = { totalAdvance, totalPayments, totalReceiving, balance };
			})
			.addCase(fetchEmployeeTransactions.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})

			// Create transaction
			.addCase(createTransaction.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(createTransaction.fulfilled, (state, action) => {
				state.loading = false;
				state.transactions = [action.payload, ...state.transactions];

				// Update summary based on the new transaction
				if (action.payload.type === "advance") {
					state.summary.totalAdvance += action.payload.amount;
				} else if (action.payload.type === "payment") {
					state.summary.totalPayments += action.payload.amount;
				} else if (action.payload.type === "receiving") {
					state.summary.totalReceiving += action.payload.amount;
				}

				// Recalculate balance
				state.summary.balance =
					state.summary.totalAdvance + state.summary.totalReceiving - state.summary.totalPayments;
			})
			.addCase(createTransaction.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})

			// Update transaction
			.addCase(modifyTransaction.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(modifyTransaction.fulfilled, (state, action) => {
				state.loading = false;

				// Find and update the transaction in the state
				const index = state.transactions.findIndex((t) => t.id === action.payload.id);
				if (index !== -1) {
					// Create a new transaction object with the updates
					const updatedTransaction = {
						...state.transactions[index],
						...action.payload,
					};

					// Create a new array with the updated transaction
					state.transactions = [
						...state.transactions.slice(0, index),
						updatedTransaction,
						...state.transactions.slice(index + 1),
					];

					// Update the summary if necessary
					if (action.payload.status === "cancelled") {
						// Adjust summary based on the cancelled transaction
						if (updatedTransaction.type === "advance") {
							state.summary.totalAdvance -= updatedTransaction.amount;
						} else if (updatedTransaction.type === "payment") {
							state.summary.totalPayments -= updatedTransaction.amount;
						} else if (updatedTransaction.type === "receiving") {
							state.summary.totalReceiving -= updatedTransaction.amount;
						}

						// Recalculate balance
						state.summary.balance =
							state.summary.totalAdvance +
							state.summary.totalReceiving -
							state.summary.totalPayments;
					}
				}
			})
			.addCase(modifyTransaction.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			});
	},
});

export const { clearTransactions, setCurrentEmployeeId, updateSummary } = transactionsSlice.actions;

// Selectors
export const selectAllTransactions = (state) => state.transactions.transactions;
export const selectTransactionsByType = (type) => (state) =>
	state.transactions.transactions.filter((t) => t.type === type);
export const selectTransactionSummary = (state) => state.transactions.summary;
export const selectTransactionsLoading = (state) => state.transactions.loading;
export const selectTransactionsError = (state) => state.transactions.error;

export default transactionsSlice.reducer;
