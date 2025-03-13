// store/leave/leave.slice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { updateEmployeeDetails, getEmployeeDetails } from "@/firebase/index";

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
								reason: dayData.reason || "",
								leaveType: dayData.leaveType || "",
								sanctionedBy: dayData.sanctionedBy || null,
								sanctionedByName: dayData.sanctionedByName || null,
								sanctionedAt: dayData.sanctionedAt || null,
								rejected: dayData.rejected || false,
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

			// If unsanctioning, remove additional fields
			if (!sanctioned) {
				delete updatedEmployee.attendance[monthKey][date].sanctionedBy;
				delete updatedEmployee.attendance[monthKey][date].sanctionedByName;
				delete updatedEmployee.attendance[monthKey][date].sanctionedAt;
				delete updatedEmployee.attendance[monthKey][date].leaveType;
				delete updatedEmployee.attendance[monthKey][date].reason;
			}
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

// Async thunk to sanction a leave with additional details
export const sanctionLeave = createAsyncThunk("leaves/sanctionLeave", async ({ employeeId, date, leaveType, reason, branchId, createdBy, sanctionedByName, sanctionedAt }, { getState, rejectWithValue }) => {
	try {
		// Get employee from firebase directly to ensure fresh data
		const employee = await getEmployeeDetails(branchId, employeeId);

		if (!employee) {
			return rejectWithValue("Employee not found");
		}

		// Find the month key in attendance
		const [year, month, day] = date.split("-");
		const monthKey = `${month}-${year}`;

		// Create updated employee data
		const updatedEmployee = { ...employee };

		// Make sure attendance structure exists
		if (!updatedEmployee.attendance) {
			updatedEmployee.attendance = {};
		}

		if (!updatedEmployee.attendance[monthKey]) {
			updatedEmployee.attendance[monthKey] = {};
		}

		if (!updatedEmployee.attendance[monthKey][date]) {
			// If no existing record, create one based on system recognition of an absence
			// In a real system, you would have more complex logic here
			updatedEmployee.attendance[monthKey][date] = {
				status: "Absent: Sanctioned Leave",
				deductionAmount: 0, // No deduction for sanctioned leaves
				workingHours: "0h 0m",
				dayOfWeek: new Date(date).toLocaleString("en-IN", { weekday: "long" }),
				logs: [],
			};
		}

		// Sanitize parameters - replace undefined with null
		const sanitizedParams = {
			sanctioned: true,
			leaveType: leaveType || null,
			reason: reason || null,
			createdBy: createdBy || null,
			sanctionedByName: sanctionedByName || null,
			sanctionedAt: sanctionedAt || null,
			rejected: false,
		};

		// Update the leave with sanctioned details
		updatedEmployee.attendance[monthKey][date] = {
			...updatedEmployee.attendance[monthKey][date],
			...sanitizedParams,
			status: updatedEmployee.attendance[monthKey][date].status.replace("Unsanctioned", "Sanctioned"),
		};

		// Sanitize the entire attendance object to prevent undefined values
		sanitizeAttendanceObject(updatedEmployee.attendance);

		// Update in Firebase
		const result = await updateEmployeeDetails(branchId, employeeId, updatedEmployee);

		return {
			employeeId,
			date,
			leaveType: sanitizedParams.leaveType,
			reason: sanitizedParams.reason,
			sanctioned: true,
			createdBy: sanitizedParams.createdBy,
			sanctionedByName: sanitizedParams.sanctionedByName,
			sanctionedAt: sanitizedParams.sanctionedAt,
			success: !!result,
		};
	} catch (error) {
		return rejectWithValue(error.message);
	}
});

// Async thunk to add a new sanctioned leave
export const addSanctionedLeave = createAsyncThunk("leaves/addSanctionedLeave", async ({ employeeId, date, leaveType, reason, duration, branchId, createdBy, sanctionedByName, sanctionedAt }, { getState, rejectWithValue }) => {
	try {
		// Get employee from firebase directly
		const employee = await getEmployeeDetails(branchId, employeeId);

		if (!employee) {
			return rejectWithValue("Employee not found");
		}

		// Find the month key in attendance
		const [year, month, day] = date.split("-");
		const monthKey = `${month}-${year}`;

		// Create updated employee data
		const updatedEmployee = { ...employee };

		// Make sure attendance structure exists
		if (!updatedEmployee.attendance) {
			updatedEmployee.attendance = {};
		}

		if (!updatedEmployee.attendance[monthKey]) {
			updatedEmployee.attendance[monthKey] = {};
		}

		// Determine status based on duration
		let status = "Absent: Sanctioned Leave";
		if (duration === "half_morning") {
			status = "Half Day (Morning): Sanctioned Leave";
		} else if (duration === "half_afternoon") {
			status = "Half Day (Afternoon): Sanctioned Leave";
		}

		// Determine deduction amount based on employee salary
		const monthlySalary = employee.employment?.salaryAmount || 0;
		const daysInMonth = new Date(year, month, 0).getDate();
		const dailySalary = monthlySalary / daysInMonth;

		// Calculate deduction (0 for sanctioned leave typically, but could be a portion)
		const deductionAmount = (duration.startsWith("half") ? dailySalary * 0.5 : dailySalary) * 0;

		// Sanitize parameters - replace undefined with null
		const sanitizedParams = {
			status,
			deductionAmount,
			workingHours: "0h 0m",
			dayOfWeek: new Date(date).toLocaleString("en-IN", { weekday: "long" }),
			logs: [],
			sanctioned: true,
			leaveType: leaveType || null,
			reason: reason || null,
			createdBy: createdBy || null,
			sanctionedByName: sanctionedByName || null,
			sanctionedAt: sanctionedAt || null,
			duration: duration || null,
			deductionRemarks: `Sanctioned leave: ${leaveType || "Unknown"}`,
			isWorkDay: true,
		};

		// Create leave record
		updatedEmployee.attendance[monthKey][date] = sanitizedParams;

		// Sanitize the entire attendance object to prevent undefined values
		sanitizeAttendanceObject(updatedEmployee.attendance);

		// Update in Firebase
		const result = await updateEmployeeDetails(branchId, employeeId, updatedEmployee);

		return {
			employeeId,
			date,
			leaveType: sanitizedParams.leaveType,
			reason: sanitizedParams.reason,
			sanctioned: true,
			createdBy: sanitizedParams.createdBy,
			sanctionedAt: sanitizedParams.sanctionedAt,
			duration: sanitizedParams.duration,
			success: !!result,
		};
	} catch (error) {
		return rejectWithValue(error.message);
	}
});

// Helper function to sanitize attendance object (recursively replace undefined with null)
function sanitizeAttendanceObject(obj) {
	if (!obj || typeof obj !== 'object') return;
	
	Object.keys(obj).forEach(key => {
		if (obj[key] === undefined) {
			obj[key] = null;
		} else if (typeof obj[key] === 'object' && obj[key] !== null) {
			sanitizeAttendanceObject(obj[key]);
		}
	});
}


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
						return {
							...leave,
							sanctioned,
							// If unsanctioning, remove these fields from the UI as well
							...(sanctioned
								? {}
								: {
										sanctionedBy: undefined,
										sanctionedByName: undefined,
										sanctionedAt: undefined,
										leaveType: undefined,
										reason: undefined,
								  }),
						};
					}
					return leave;
				});
			})
			.addCase(updateLeaveSanctionStatus.rejected, (state, action) => {
				state.loading = false;
				state.status = "failed";
				state.error = action.payload;
			})

			// Sanction leave with details
			.addCase(sanctionLeave.pending, (state) => {
				state.loading = true;
				state.status = "loading";
			})
			.addCase(sanctionLeave.fulfilled, (state, action) => {
				state.loading = false;
				state.status = "succeeded";

				// Update the local state
				const { employeeId, date, leaveType, reason, sanctioned, sanctionedBy, sanctionedByName, sanctionedAt } = action.payload;
				state.leaves = state.leaves.map((leave) => {
					if (leave.employeeId === employeeId && leave.date === date) {
						return {
							...leave,
							sanctioned,
							leaveType,
							reason,
							sanctionedBy,
							sanctionedByName,
							sanctionedAt,
							status: leave.status.replace("Unsanctioned", "Sanctioned"),
						};
					}
					return leave;
				});
			})
			.addCase(sanctionLeave.rejected, (state, action) => {
				state.loading = false;
				state.status = "failed";
				state.error = action.payload;
			})

			// Add new sanctioned leave
			.addCase(addSanctionedLeave.pending, (state) => {
				state.loading = true;
				state.status = "loading";
			})
			.addCase(addSanctionedLeave.fulfilled, (state, action) => {
				state.loading = false;
				state.status = "succeeded";

				// For new leaves, we'll let the fetchEmployeeLeaves handle updating the state
				// to ensure we have all the correct data
			})
			.addCase(addSanctionedLeave.rejected, (state, action) => {
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
