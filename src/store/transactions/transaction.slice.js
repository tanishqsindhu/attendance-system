// store/transactions/transaction.slice.js

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { addTransaction, getEmployeeTransactions, updateTransaction } from "@/firebase";

// New thunk to calculate and generate salary payment
export const generateSalaryPayment = createAsyncThunk(
	"transactions/generateSalaryPayment",
	async (
		{ branchId, employee, month, year, additionalDeductions = 0 },
		{ rejectWithValue, getState }
	) => {
		try {
			const attendanceKey = `${month}-${year}`;
			const monthAttendance = employee?.attendance?.[attendanceKey] || {};

			// Calculate base salary amount
			const baseSalary = employee?.employment?.salaryAmount || 0;

			// For debugging
			console.log(`Generating salary for ${month}/${year} with base salary: ${baseSalary}`);

			// Calculate deductions from attendance
			let totalDeductions = 0;
			let daysPresent = 0;
			let daysMissingPunch = 0;
			let daysAbsent = 0;

			// Count the days in the given month
			const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();

			// Log days in month for debugging
			console.log(`Days in month: ${daysInMonth}`);

			// Calculate attendance stats
			Object.keys(monthAttendance).forEach((date) => {
				const dayData = monthAttendance[date];

				if (dayData.status === "On Time" || dayData.status === "Late") {
					daysPresent++;
				} else if (dayData.status === "Missing Punch") {
					daysMissingPunch++;
					totalDeductions += dayData.deduction || 0;
				} else if (dayData.status === "Absent") {
					daysAbsent++;
					totalDeductions += 1; // Full day deduction for absence
				}
			});

			// Add any additional deductions (advances, etc.)
			totalDeductions += parseFloat(additionalDeductions) || 0;

			// Calculate daily pay rate
			const dailyRate = daysInMonth > 0 ? baseSalary / daysInMonth : 0;

			// Calculate final salary amount
			const deductionAmount = dailyRate * totalDeductions;
			const finalSalaryAmount = Math.max(0, baseSalary - deductionAmount); // Ensure salary isn't negative

			// Log calculation details for debugging
			console.log(
				`Attendance: Present ${daysPresent}, Missing ${daysMissingPunch}, Absent ${daysAbsent}`
			);
			console.log(
				`Total deductions: ${totalDeductions} days at ${dailyRate}/day = ${deductionAmount}`
			);
			console.log(`Final salary: ${finalSalaryAmount}`);

			// Get current user info to track who generated the salary
			const state = getState();
			const currentUser = state.user?.currentUser || { id: "System", fullName: "System" };

			// Create transaction data
			const transactionData = {
				employeeId: employee.id,
				type: "salary",
				amount: finalSalaryAmount,
				description: `Salary payment for ${month}/${year} (${daysPresent} days present, ${daysMissingPunch} missing punches, ${daysAbsent} absences)`,
				date: new Date().toISOString(),
				status: "completed",
				createdBy: `${currentUser.fullName} #${currentUser.id}`,
				deductions: {
					totalDeductionDays: totalDeductions,
					deductionAmount,
					baseSalary,
					period: `${month}/${year}`,
					daysInMonth,
					dailyRate,
				},
			};

			// Save the transaction
			const transaction = await addTransaction(branchId, employee.id, transactionData);
			return transaction;
		} catch (error) {
			console.error("Error generating salary payment:", error);
			return rejectWithValue(error.message);
		}
	}
);

// Existing thunks
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

export const createTransaction = createAsyncThunk(
	"transactions/createTransaction",
	async ({ branchId, employeeId, transactionData }, { rejectWithValue }) => {
		try {
			// Adjust receiving transactions to be negative
			if (transactionData.type === "receiving") {
				transactionData.amount = -Math.abs(transactionData.amount);
			}

			const transaction = await addTransaction(branchId, employeeId, transactionData);
			return transaction;
		} catch (error) {
			return rejectWithValue(error.message);
		}
	}
);

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
			totalSalary: 0,
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
				totalSalary: 0,
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

			const totalSalary = state.transactions
				.filter((t) => t.type === "salary")
				.reduce((sum, t) => sum + t.amount, 0);

			// Receiving is now negative, so we add it to the balance
			const balance = totalAdvance + totalReceiving - totalPayments + totalSalary;

			state.summary = { totalAdvance, totalPayments, totalReceiving, totalSalary, balance };
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

				const totalSalary = action.payload
					.filter((t) => t.type === "salary")
					.reduce((sum, t) => sum + t.amount, 0);

				// Receiving is now negative, so we add it to the balance
				const balance = totalAdvance + totalReceiving - totalPayments + totalSalary;

				state.summary = { totalAdvance, totalPayments, totalReceiving, totalSalary, balance };
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
				} else if (action.payload.type === "salary") {
					state.summary.totalSalary += action.payload.amount;
				}

				// Recalculate balance (receiving is negative)
				state.summary.balance =
					state.summary.totalAdvance +
					state.summary.totalReceiving -
					state.summary.totalPayments +
					state.summary.totalSalary;
			})
			.addCase(createTransaction.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})

			// Generate salary payment
			.addCase(generateSalaryPayment.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(generateSalaryPayment.fulfilled, (state, action) => {
				state.loading = false;
				state.transactions = [action.payload, ...state.transactions];

				// Update salary total
				state.summary.totalSalary += action.payload.amount;

				// Recalculate balance
				state.summary.balance =
					state.summary.totalAdvance +
					state.summary.totalReceiving -
					state.summary.totalPayments +
					state.summary.totalSalary;
			})
			.addCase(generateSalaryPayment.rejected, (state, action) => {
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
						} else if (updatedTransaction.type === "salary") {
							state.summary.totalSalary -= updatedTransaction.amount;
						}

						// Recalculate balance
						state.summary.balance =
							state.summary.totalAdvance +
							state.summary.totalReceiving -
							state.summary.totalPayments +
							state.summary.totalSalary;
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
