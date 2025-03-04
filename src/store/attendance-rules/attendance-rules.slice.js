import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { AttendanceRulesService } from "@/firebase/attendance-rules-service";

// Async thunks
export const getAttendanceRules = createAsyncThunk(
	"attendanceRules/getAttendanceRules",
	async (branchId, { rejectWithValue }) => {
		try {
			return await AttendanceRulesService.getAttendanceRules(branchId);
		} catch (error) {
			return rejectWithValue(error.message || "Failed to fetch attendance rules");
		}
	}
);

export const saveAttendanceRules = createAsyncThunk(
	"attendanceRules/saveAttendanceRules",
	async ({ branchId, rules }, { rejectWithValue }) => {
		try {
			return await AttendanceRulesService.saveAttendanceRules(branchId, rules);
		} catch (error) {
			return rejectWithValue(error.message || "Failed to save attendance rules");
		}
	}
);

// Default rules structure
const defaultRules = {
	lateDeductions: {
		enabled: false,
		deductionType: "percentage", // 'percentage' or 'fixed'
		deductPerMinute: 0, // Percentage value
		fixedAmountPerMinute: 0, // Rupees amount
		maxDeductionTime: 60,
		halfDayThreshold: 120,
		absentThreshold: 240,
	},
};

// Attendance rules slice
const attendanceRulesSlice = createSlice({
	name: "attendanceRules",
	initialState: {
		rules: null,
		loading: false,
		error: null,
	},
	reducers: {
		resetAttendanceRules: (state) => {
			state.rules = null;
		},
	},
	extraReducers: (builder) => {
		builder
			// Get attendance rules cases
			.addCase(getAttendanceRules.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(getAttendanceRules.fulfilled, (state, action) => {
				state.loading = false;
				state.rules = action.payload;
			})
			.addCase(getAttendanceRules.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			// Save attendance rules cases
			.addCase(saveAttendanceRules.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(saveAttendanceRules.fulfilled, (state, action) => {
				state.loading = false;
				state.rules = action.payload;
			})
			.addCase(saveAttendanceRules.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			});
	},
});

export const { resetAttendanceRules } = attendanceRulesSlice.actions;

export default attendanceRulesSlice.reducer;
// Selectors
export const selectAttendanceRules = (state) => state.attendanceRules.rules;
export const selectAttendanceRulesLoading = (state) => state.attendanceRules.loading;
export const selectAttendanceRulesError = (state) => state.attendanceRules.error;