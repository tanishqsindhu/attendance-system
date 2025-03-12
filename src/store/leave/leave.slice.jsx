// store/leave/leave.slice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { updateEmployeeDetails } from "@/firebase/index";

// Async thunk to fetch leaves from employee attendance data
export const fetchEmployeeLeaves = createAsyncThunk("leaves/fetchEmployeeLeaves", async (branchId, { getState, rejectWithValue }) => {
	try {
		// Get employees from the store
		const state = getState();
		const employees = state.employees.byBranch[branchId] || [];

		// Extract leave data from attendance records
		const leaveData = [];

		employees.forEach((employee) => {
			// Check if employee has attendance data
			if (employee.attendance) {
				// Loop through months in attendance
				Object.keys(employee.attendance).forEach((month) => {
					const monthData = employee.attendance[month];

					// Loop through days in month
					Object.entries(monthData).forEach(([date, dayData]) => {
						// Check if this is a leave (absent or unsanctioned)
						if (dayData.status && (dayData.status.includes("Absent") || dayData.status.includes("Missing"))) {
							leaveData.push({
								id: `${employee.id}-${date}`,
								employeeId: employee.id,
								employeeName: `${employee.personal?.firstName || ""} ${employee.personal?.lastName || ""}`,
								date: date,
								status: dayData.status,
								deductionAmount: dayData.deductionAmount || 0,
								sanctioned: dayData.sanctioned || false,
								remarks: dayData.deductionRemarks || "",
							});
						}
					});
				});
			}
		});

		return leaveData;
	} catch (error) {
		return rejectWithValue(error.message);
	}
});

// Async thunk to update leave sanctioned status
export const updateLeaveSanctionStatus = createAsyncThunk("leaves/updateSanctionStatus", async ({ employeeId, date, sanctioned, branchId }, { getState, rejectWithValue }) => {
	try {
		const state = getState();
		const allEmployees = state.employees.allEmployees;
		const employee = allEmployees.find((emp) => emp.id === employeeId);

		if (!employee) {
			return rejectWithValue("Employee not found");
		}

		// Find the month key in attendance
		const [year, month, day] = date.split("-");
		const monthKey = `${month}-${year}`;

		// Create updated employee data
		const updatedEmployee = { ...employee };

		// Update sanctioned status
		if (updatedEmployee.attendance && updatedEmployee.attendance[monthKey] && updatedEmployee.attendance[monthKey][date]) {
			updatedEmployee.attendance[monthKey][date].sanctioned = sanctioned;
		}

		// Update in Firebase
		const result = await updateEmployeeDetails(branchId, employeeId, updatedEmployee);

		return {
			employeeId,
			date,
			sanctioned,
			success: !!result,
		};
	} catch (error) {
		return rejectWithValue(error.message);
	}
});

const initialState = {
	leaves: [],
	loading: false,
	error: null,
	status: "idle",
};

const leavesSlice = createSlice({
	name: "leaves",
	initialState,
	reducers: {
		clearLeavesError: (state) => {
			state.error = null;
		},
	},
	extraReducers: (builder) => {
		builder
			// Fetch employee leaves
			.addCase(fetchEmployeeLeaves.pending, (state) => {
				state.loading = true;
				state.status = "loading";
				state.error = null;
			})
			.addCase(fetchEmployeeLeaves.fulfilled, (state, action) => {
				state.loading = false;
				state.status = "succeeded";
				state.leaves = action.payload;
			})
			.addCase(fetchEmployeeLeaves.rejected, (state, action) => {
				state.loading = false;
				state.status = "failed";
				state.error = action.payload;
			})

			// Update leave sanction status
			.addCase(updateLeaveSanctionStatus.pending, (state) => {
				state.loading = true;
				state.status = "loading";
			})
			.addCase(updateLeaveSanctionStatus.fulfilled, (state, action) => {
				state.loading = false;
				state.status = "succeeded";

				// Update the local state
				const { employeeId, date, sanctioned } = action.payload;
				state.leaves = state.leaves.map((leave) => {
					if (leave.employeeId === employeeId && leave.date === date) {
						return { ...leave, sanctioned };
					}
					return leave;
				});
			})
			.addCase(updateLeaveSanctionStatus.rejected, (state, action) => {
				state.loading = false;
				state.status = "failed";
				state.error = action.payload;
			});
	},
});

export const { clearLeavesError } = leavesSlice.actions;

// Selectors
export const selectAllLeaves = (state) => state.leaves.leaves;
export const selectLeavesLoading = (state) => state.leaves.loading;
export const selectLeavesError = (state) => state.leaves.error;

export default leavesSlice.reducer;
