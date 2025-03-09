import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { updateEmployeeDetails, addEmployeeToBranch as firebaseAddEmployeeToBranch, getActiveEmployees } from "@/firebase/index";

// Async thunks for employees
export const fetchEmployeesByBranch = createAsyncThunk("employees/fetchByBranch", async (branchId, { rejectWithValue }) => {
	try {
		const employeesObj = await getActiveEmployees(branchId);
		// Convert object of employees to array format
		const employees = Object.entries(employeesObj).map(([id, data]) => ({
			id,
			...data,
		}));
		return { branchId, employees };
	} catch (error) {
		return rejectWithValue(error.message);
	}
});

export const addEmployeeToBranch = createAsyncThunk("employees/addToBranch", async ({ branchId, employeeData }, { getState, rejectWithValue }) => {
	try {
		// Check if employee with the same ID already exists in any branch
		const state = getState();
		const allEmployees = state.employees.allEmployees;
		const employeeId = employeeData.employment.employeeId;

		if (employeeId && allEmployees.some((emp) => emp.employment?.employeeId === employeeId)) {
			return rejectWithValue({
				code: "DUPLICATE_EMPLOYEE_ID",
				message: `Employee with ID ${employeeId} already exists`,
			});
		}

		const newEmployee = await firebaseAddEmployeeToBranch(branchId, employeeData);

		if (!newEmployee) {
			throw new Error("Failed to add employee");
		}

		return { branchId, employee: newEmployee };
	} catch (error) {
		return rejectWithValue(
			error.code
				? error
				: {
						code: "ADD_EMPLOYEE_ERROR",
						message: error.message || "An error occurred while adding employee",
				  }
		);
	}
});

export const updateEmployee = createAsyncThunk("employees/updateEmployee", async ({ employeeId, branchId, employeeData }, { getState, rejectWithValue }) => {
	try {
		// Get employee's current branch
		const state = getState();
		const allEmployees = state.employees.allEmployees;
		const existingEmployee = allEmployees.find((emp) => emp.id === employeeId);

		if (!existingEmployee) {
			return rejectWithValue({
				code: "EMPLOYEE_NOT_FOUND",
				message: `Employee with ID ${employeeId} not found`,
			});
		}

		// Check if employee ID is being changed and if it conflicts with another employee
		if (employeeData.employment?.employeeId !== existingEmployee.employment?.employeeId) {
			const idExists = allEmployees.some((emp) => emp.employment?.employeeId === employeeData.employment?.employeeId && emp.id !== employeeId);

			if (idExists) {
				return rejectWithValue({
					code: "DUPLICATE_EMPLOYEE_ID",
					message: `Employee with ID ${employeeData.employment.employeeId} already exists`,
				});
			}
		}

		// Call Firebase service to update employee with correct parameter order
		const updatedEmployee = await updateEmployeeDetails(branchId, employeeId, employeeData);

		if (!updatedEmployee) {
			throw new Error("Failed to update employee");
		}

		return {
			employeeId,
			oldBranchId: existingEmployee.employment?.branchId || branchId,
			newBranchId: branchId,
			employee: updatedEmployee,
		};
	} catch (error) {
		return rejectWithValue(
			error.code
				? error
				: {
						code: "UPDATE_EMPLOYEE_ERROR",
						message: error.message || "An error occurred while updating employee",
				  }
		);
	}
});

// Initial state for employees
const initialState = {
	byBranch: {}, // { branchId: [employees] }
	allEmployees: [], // Flattened array of all employees for easier global access
	loading: false,
	status: "idle",
	error: null,
	lastErrorCode: null, // Added for more specific error handling
};

// Employees slice
const employeesSlice = createSlice({
	name: "employees",
	initialState,
	reducers: {
		clearEmployeesError: (state) => {
			state.error = null;
			state.lastErrorCode = null;
		},
		setEmployeesStatus: (state, action) => {
			state.status = action.payload;
		},
	},
	extraReducers: (builder) => {
		builder
			// Fetch employees by branch
			.addCase(fetchEmployeesByBranch.pending, (state) => {
				state.loading = true;
				state.status = "loading";
				state.error = null;
				state.lastErrorCode = null;
			})
			.addCase(fetchEmployeesByBranch.fulfilled, (state, action) => {
				state.loading = false;
				state.status = "succeeded";
				state.byBranch = {
					...state.byBranch,
					[action.payload.branchId]: action.payload.employees,
				};

				// Update allEmployees array with deduplication
				const existingEmployeeIds = new Set(state.allEmployees.map((emp) => emp.id));
				const newEmployees = action.payload.employees.filter((emp) => !existingEmployeeIds.has(emp.id));
				state.allEmployees = [...state.allEmployees, ...newEmployees];
			})
			.addCase(fetchEmployeesByBranch.rejected, (state, action) => {
				state.loading = false;
				state.status = "failed";
				state.error = action.payload?.message || action.error.message;
				state.lastErrorCode = action.payload?.code || "UNKNOWN_ERROR";
			})

			// Add employee to branch
			.addCase(addEmployeeToBranch.pending, (state) => {
				state.loading = true;
				state.status = "loading";
				state.error = null;
				state.lastErrorCode = null;
			})
			.addCase(addEmployeeToBranch.fulfilled, (state, action) => {
				state.loading = false;
				state.status = "succeeded";
				const { branchId, employee } = action.payload;

				if (!state.byBranch[branchId]) {
					state.byBranch[branchId] = [];
				}

				state.byBranch[branchId].push(employee);

				// Add to allEmployees as well (should never be a duplicate at this point)
				state.allEmployees.push(employee);
			})
			.addCase(addEmployeeToBranch.rejected, (state, action) => {
				state.loading = false;
				state.status = "failed";

				// Store detailed error information
				if (action.payload && typeof action.payload === "object") {
					state.error = action.payload.message;
					state.lastErrorCode = action.payload.code;
				} else {
					state.error = action.payload || action.error.message;
					state.lastErrorCode = "UNKNOWN_ERROR";
				}
			})
			// Update employee
			.addCase(updateEmployee.pending, (state) => {
				state.loading = true;
				state.status = "loading";
				state.error = null;
				state.lastErrorCode = null;
			})
			.addCase(updateEmployee.fulfilled, (state, action) => {
				state.loading = false;
				state.status = "succeeded";
				const { employeeId, oldBranchId, newBranchId, employee } = action.payload;

				// Remove from old branch if branch changed
				if (oldBranchId !== newBranchId) {
					if (state.byBranch[oldBranchId]) {
						state.byBranch[oldBranchId] = state.byBranch[oldBranchId].filter((emp) => emp.id !== employeeId);
					}

					// Add to new branch
					if (!state.byBranch[newBranchId]) {
						state.byBranch[newBranchId] = [];
					}
					state.byBranch[newBranchId].push(employee);
				} else {
					// Update in current branch
					if (state.byBranch[newBranchId]) {
						state.byBranch[newBranchId] = state.byBranch[newBranchId].map((emp) => (emp.id === employeeId ? employee : emp));
					}
				}

				// Update in allEmployees array
				state.allEmployees = state.allEmployees.map((emp) => (emp.id === employeeId ? employee : emp));
			})
			.addCase(updateEmployee.rejected, (state, action) => {
				state.loading = false;
				state.status = "failed";

				// Store detailed error information
				if (action.payload && typeof action.payload === "object") {
					state.error = action.payload.message;
					state.lastErrorCode = action.payload.code;
				} else {
					state.error = action.payload || action.error.message;
					state.lastErrorCode = "UNKNOWN_ERROR";
				}
			});
	},
});

// Export actions
export const { clearEmployeesError, setEmployeesStatus } = employeesSlice.actions;

export default employeesSlice.reducer;

// Selectors
export const selectEmployeesByBranch = (state, branchId) => state.employees.byBranch[branchId] || [];
export const selectAllEmployees = (state) => state.employees.allEmployees;
export const selectEmployeesStatus = (state) => state.employees.status;
export const selectEmployeesError = (state) => state.employees.error;
export const selectEmployeesErrorCode = (state) => state.employees.lastErrorCode;
export const selectIsEmployeeLoading = (state) => state.employees.loading;
