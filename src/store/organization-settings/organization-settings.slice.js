import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { OrganizationSettingsService } from "@/firebase/index";
import { selectAllEmployees } from "@/store/employees/employees.slice";
import { toast } from "sonner";

// Async thunks for organization settings
export const fetchOrganizationSettings = createAsyncThunk(
	"organization/fetchSettings",
	async (_, { rejectWithValue }) => {
		try {
			const settings = await OrganizationSettingsService.getSettings();
			return settings;
		} catch (error) {
			return rejectWithValue(error.message);
		}
	}
);

// src/redux/organizationSlice.js
export const addOrganizationItem = createAsyncThunk(
	"organization/addItem",
	async ({ itemType, newItem }, { rejectWithValue }) => {
		try {
			const updatedItems = await OrganizationSettingsService.addItem(itemType, newItem);
			if (!updatedItems) {
				throw new Error(`Failed to add ${itemType}`);
			}
			return { itemType, items: updatedItems };
		} catch (error) {
			return rejectWithValue(error.message);
		}
	}
);

export const deleteShiftSchedule = createAsyncThunk(
	"organization/deleteShiftSchedule",
	async (scheduleId, { rejectWithValue, getState }) => {
		try {
			// Get employees from the Redux store using getState
			const state = getState();
			const employees = selectAllEmployees(state);

			// Call the delete item method with employees
			const updatedSchedules = await OrganizationSettingsService.deleteItem(
				"shiftSchedules",
				scheduleId,
				employees
			);

			return updatedSchedules;
		} catch (error) {
			// If error is a string, return it directly
			// If it's an error object, return its message
			return rejectWithValue(error instanceof Error ? error.message : error);
		}
	}
);

// New thunk for adding date overrides to shift schedules
export const addShiftScheduleDateOverride = createAsyncThunk(
	"organization/addShiftScheduleDateOverride",
	async ({ scheduleId, dateOverride }, { rejectWithValue }) => {
		try {
			const updatedShiftSchedules = await OrganizationSettingsService.addShiftScheduleDateOverride(
				scheduleId,
				dateOverride
			);
			return updatedShiftSchedules;
		} catch (error) {
			return rejectWithValue(error.message);
		}
	}
);

// New thunk for removing date overrides from shift schedules
export const removeShiftScheduleDateOverride = createAsyncThunk(
	"organization/removeShiftScheduleDateOverride",
	async ({ scheduleId, date }, { rejectWithValue }) => {
		try {
			const updatedShiftSchedules =
				await OrganizationSettingsService.removeShiftScheduleDateOverride(scheduleId, date);
			return updatedShiftSchedules;
		} catch (error) {
			return rejectWithValue(error.message);
		}
	}
);
export const deleteOrganizationItem = createAsyncThunk(
	"organization/deleteItem",
	async ({ itemType, itemId }, { rejectWithValue, getState }) => {
		try {
			// Validate inputs
			if (!itemType || !itemId) {
				throw new Error("Item type and ID are required");
			}

			// Get employees from the Redux store using getState
			const state = getState();
			const employees = selectAllEmployees(state);

			// Validate employees
			if (!employees || employees.length === 0) {
				throw new Error("No employees found in the system");
			}

			// Call the delete item method with employees
			const updatedItems = await OrganizationSettingsService.deleteItem(
				itemType,
				itemId,
				employees
			);

			return {
				itemType,
				updatedItems,
			};
		} catch (error) {
			// Log the error for debugging
			console.error("Delete Item Error:", error);

			// Return a clear, user-friendly error message
			return rejectWithValue(
				error instanceof Error
					? error.message
					: "An unexpected error occurred while deleting the item"
			);
		}
	}
);
export const updateOrganizationItem = createAsyncThunk(
	"organization/updateItem",
	async ({ itemType, itemId, updatedItem }, { rejectWithValue }) => {
		try {
			const updatedItems = await OrganizationSettingsService.updateItem(
				itemType,
				itemId,
				updatedItem
			);
			return { itemType, items: updatedItems };
		} catch (error) {
			return rejectWithValue(error.message);
		}
	}
);
// Initial state
const initialState = {
	departments: [],
	positions: [],
	branches: [],
	shiftSchedules: [],
	loading: false,
	error: null,
	activeBranch: "",
	status: "idle",
	selectedScheduleId: null, // Added for UI state management
};

// Slice
const organizationSlice = createSlice({
	name: "organization",
	initialState,
	reducers: {
		clearOrganizationError: (state) => {
			state.error = null;
		},
		setOrganizationStatus: (state, action) => {
			state.status = action.payload;
		},
		setActiveBranch: (state, action) => {
			state.activeBranch = action.payload;
		},
		setSelectedScheduleId: (state, action) => {
			state.selectedScheduleId = action.payload;
		},
	},
	extraReducers: (builder) => {
		builder
			// Fetch settings
			.addCase(fetchOrganizationSettings.pending, (state) => {
				state.loading = true;
				state.status = "loading";
				state.error = null;
			})
			.addCase(fetchOrganizationSettings.fulfilled, (state, action) => {
				state.loading = false;
				state.status = "succeeded";
				state.departments = action.payload.departments || [];
				state.positions = action.payload.positions || [];
				state.branches = action.payload.branches || [];
				state.shiftSchedules = action.payload.shiftSchedules || [];
			})
			.addCase(fetchOrganizationSettings.rejected, (state, action) => {
				state.loading = false;
				state.status = "failed";
				state.error = action.payload;
			})
			// Add item
			.addCase(addOrganizationItem.pending, (state) => {
				state.loading = true;
				state.status = "loading";
				state.error = null;
			})
			.addCase(addOrganizationItem.fulfilled, (state, action) => {
				state.loading = false;
				state.status = "succeeded";
				state[action.payload.itemType] = action.payload.items;
			})
			.addCase(addOrganizationItem.rejected, (state, action) => {
				state.loading = false;
				state.status = "failed";
				state.error = action.payload;
			})
			// Add shift schedule date override
			.addCase(addShiftScheduleDateOverride.pending, (state) => {
				state.loading = true;
				state.status = "loading";
				state.error = null;
			})
			.addCase(addShiftScheduleDateOverride.fulfilled, (state, action) => {
				state.loading = false;
				state.status = "succeeded";
				state.shiftSchedules = action.payload;
			})
			.addCase(addShiftScheduleDateOverride.rejected, (state, action) => {
				state.loading = false;
				state.status = "failed";
				state.error = action.payload;
			})
			// Remove shift schedule date override
			.addCase(removeShiftScheduleDateOverride.pending, (state) => {
				state.loading = true;
				state.status = "loading";
				state.error = null;
			})
			.addCase(removeShiftScheduleDateOverride.fulfilled, (state, action) => {
				state.loading = false;
				state.status = "succeeded";
				state.shiftSchedules = action.payload;
			})
			.addCase(removeShiftScheduleDateOverride.rejected, (state, action) => {
				state.loading = false;
				state.status = "failed";
				state.error = action.payload;
			})
			.addCase(deleteOrganizationItem.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(deleteOrganizationItem.fulfilled, (state, action) => {
				const { itemType, updatedItems } = action.payload;

				// Update the specific array based on itemType
				switch (itemType) {
					case "departments":
						state.departments = updatedItems;
						break;
					case "positions":
						state.positions = updatedItems;
						break;
					case "branches":
						state.branches = updatedItems;
						break;
					case "shiftSchedules":
						state.shiftSchedules = updatedItems;
						break;
				}

				state.loading = false;
			})
			.addCase(deleteOrganizationItem.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			// Add new cases for updateOrganizationItem
			.addCase(updateOrganizationItem.pending, (state) => {
				state.loading = true;
				state.status = "loading";
				state.error = null;
			})
			.addCase(updateOrganizationItem.fulfilled, (state, action) => {
				state.loading = false;
				state.status = "succeeded";
				// Update the specific item type array with the new items
				state[action.payload.itemType] = action.payload.items;
			})
			.addCase(updateOrganizationItem.rejected, (state, action) => {
				state.loading = false;
				state.status = "failed";
				state.error = action.payload;
			});
	},
});

// Export actions
export const {
	clearOrganizationError,
	setOrganizationStatus,
	setActiveBranch,
	setSelectedScheduleId,
} = organizationSlice.actions;

export default organizationSlice.reducer;

// Selectors
export const selectAllDepartments = (state) => state.organization.departments;
export const selectAllPositions = (state) => state.organization.positions;
export const selectAllBranches = (state) => state.organization.branches;
export const selectAllShiftSchedules = (state) => state.organization.shiftSchedules;
export const selectOrganizationStatus = (state) => state.organization.status;
export const selectOrganizationError = (state) => state.organization.error;
export const selectActiveBranch = (state) => state.organization.activeBranch;
export const selectSelectedScheduleId = (state) => state.organization.selectedScheduleId;

// New selector to get a specific shift schedule by ID
export const selectShiftScheduleById = (state, scheduleId) =>
	state.organization.shiftSchedules.find((schedule) => schedule.id === scheduleId);
