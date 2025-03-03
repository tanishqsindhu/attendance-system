// store/slices/employeesSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { OrganizationSettingsService, addEmployeeToBranch as firebaseAddEmployeeToBranch } from "@/firebase/index";

// Async thunks for employees
export const fetchEmployeesByBranch = createAsyncThunk("employees/fetchByBranch", async (branchId, { rejectWithValue }) => {
	try {
		const employees = await OrganizationSettingsService.getEmployeesByBranch(branchId);
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

		if (employeeData.id && allEmployees.some((emp) => emp.id === employeeData.id)) {
			return rejectWithValue({
				code: "DUPLICATE_EMPLOYEE_ID",
				message: `Employee with ID ${employeeData.id} already exists`,
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
			});
	},
});

// Export actions
export const { clearEmployeesError, setEmployeesStatus } = employeesSlice.actions;

export default employeesSlice.reducer;
