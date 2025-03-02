// store/slices/organizationSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { OrganizationSettingsService } from "../../firebase/firebase";

// Async thunks for organization settings
export const fetchOrganizationSettings = createAsyncThunk(
	"organization/fetchSettings",
	async (_, { rejectWithValue }) => {
		try {
			const settings = await OrganizationSettingsService.getSettings();
			console.log(settings);
			return settings;
		} catch (error) {
			return rejectWithValue(error.message);
		}
	}
);

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

// Initial state - removed employees related state
const initialState = {
	departments: [],
	positions: [],
	branches: [],
	shiftSchedules: [],
	loading: false,
	error: null,
	activeBranch: "",
	status: "idle", // Added status field for more granular state tracking
};

// Slice
const organizationSlice = createSlice({
	name: "organization",
	initialState,
	reducers: {
		// Added synchronous actions for local state updates if needed
		clearOrganizationError: (state) => {
			state.error = null;
		},
		setOrganizationStatus: (state, action) => {
			state.status = action.payload;
		},
		setActiveBranch(state, action) {
			state.activeBranch = action.payload;
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
			});
	},
});

// Export actions
export const { clearOrganizationError, setOrganizationStatus, setActiveBranch } =
	organizationSlice.actions;

export default organizationSlice.reducer;
