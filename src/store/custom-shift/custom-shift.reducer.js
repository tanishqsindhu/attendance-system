import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { CustomShiftService } from "@/firebase/custom-shift-service";

// Async thunks
export const getCustomShifts = createAsyncThunk(
  "customShifts/getCustomShifts",
  async ({ branchId, startDate, endDate, employeeId }, { rejectWithValue }) => {
    try {
      return await CustomShiftService.getCustomShifts(branchId, startDate, endDate, employeeId);
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch custom shifts");
    }
  }
);

export const saveCustomShift = createAsyncThunk(
  "customShifts/saveCustomShift",
  async ({ branchId, employeeId, date, shiftData }, { rejectWithValue }) => {
    try {
      return await CustomShiftService.saveCustomShift(branchId, employeeId, date, shiftData);
    } catch (error) {
      return rejectWithValue(error.message || "Failed to save custom shift");
    }
  }
);

export const deleteCustomShift = createAsyncThunk(
  "customShifts/deleteCustomShift",
  async ({ branchId, shiftId }, { rejectWithValue }) => {
    try {
      await CustomShiftService.deleteCustomShift(branchId, shiftId);
      return shiftId;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to delete custom shift");
    }
  }
);

export const getCustomShiftForDate = createAsyncThunk(
  "customShifts/getCustomShiftForDate",
  async ({ branchId, date, employeeId }, { rejectWithValue }) => {
    try {
      return await CustomShiftService.getCustomShiftForDate(branchId, date, employeeId);
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch custom shift for date");
    }
  }
);

// Custom shifts slice
const customShiftsSlice = createSlice({
  name: "customShifts",
  initialState: {
    shifts: [],
    currentShift: null,
    loading: false,
    error: null,
  },
  reducers: {
    resetCustomShifts: (state) => {
      state.shifts = [];
      state.currentShift = null;
    },
    clearCurrentShift: (state) => {
      state.currentShift = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Get custom shifts cases
      .addCase(getCustomShifts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCustomShifts.fulfilled, (state, action) => {
        state.loading = false;
        state.shifts = action.payload;
      })
      .addCase(getCustomShifts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Save custom shift cases
      .addCase(saveCustomShift.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(saveCustomShift.fulfilled, (state, action) => {
        state.loading = false;
        state.currentShift = action.payload;
        
        // Update shifts array if it exists and contains the shift
        const index = state.shifts.findIndex(s => s.id === action.payload.id);
        if (index >= 0) {
          state.shifts[index] = action.payload;
        } else if (state.shifts.length > 0) {
          state.shifts.push(action.payload);
        }
      })
      .addCase(saveCustomShift.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete custom shift cases
      .addCase(deleteCustomShift.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCustomShift.fulfilled, (state, action) => {
        state.loading = false;
        state.shifts = state.shifts.filter(shift => shift.id !== action.payload);
        if (state.currentShift && state.currentShift.id === action.payload) {
          state.currentShift = null;
        }
      })
      .addCase(deleteCustomShift.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get custom shift for date cases
      .addCase(getCustomShiftForDate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCustomShiftForDate.fulfilled, (state, action) => {
        state.loading = false;
        state.currentShift = action.payload;
      })
      .addCase(getCustomShiftForDate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { resetCustomShifts, clearCurrentShift } = customShiftsSlice.actions;
export default customShiftsSlice.reducer;

