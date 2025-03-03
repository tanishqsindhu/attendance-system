// holidaySlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { HolidayService } from "@/firebase/index.js";

// Async thunk to fetch holidays
export const fetchHolidays = createAsyncThunk(
	"holidays/fetchHolidays",
	async ({ year }, { rejectWithValue }) => {
		try {
			const holidays = await HolidayService.getHolidaysByYear(year);
			return holidays;
		} catch (error) {
			return rejectWithValue(error.message);
		}
	}
);

// Async thunk to add a holiday
export const addHoliday = createAsyncThunk(
	"holidays/addHoliday",
	async (holidayData, { rejectWithValue }) => {
		try {
			const newHoliday = await HolidayService.addHoliday(holidayData);
			return newHoliday;
		} catch (error) {
			return rejectWithValue(error.message);
		}
	}
);

// Async thunk to delete a holiday
export const deleteHoliday = createAsyncThunk(
	"holidays/deleteHoliday",
	async ({ id, year }, { rejectWithValue }) => {
		try {
			await HolidayService.deleteHoliday(id);
			return id;
		} catch (error) {
			return rejectWithValue(error.message);
		}
	}
);

const holidaySlice = createSlice({
	name: "holidays",
	initialState: {
		holidays: [],
		loading: false,
		error: null,
	},
	reducers: {},
	extraReducers: (builder) => {
		builder
			// Fetch Holidays
			.addCase(fetchHolidays.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchHolidays.fulfilled, (state, action) => {
				state.loading = false;
				state.holidays = action.payload;
			})
			.addCase(fetchHolidays.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			// Add Holiday
			.addCase(addHoliday.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(addHoliday.fulfilled, (state, action) => {
				state.loading = false;
				// Only add to the current list if it's for the same year
				if (state.holidays.length > 0) {
					const firstHolidayYear = new Date(state.holidays[0].date).getFullYear();
					const newHolidayYear = new Date(action.payload.date).getFullYear();

					if (firstHolidayYear === newHolidayYear) {
						state.holidays = [...state.holidays, action.payload];
					}
				} else {
					state.holidays = [action.payload];
				}
			})
			.addCase(addHoliday.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			// Delete Holiday
			.addCase(deleteHoliday.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(deleteHoliday.fulfilled, (state, action) => {
				state.loading = false;
				state.holidays = state.holidays.filter((holiday) => holiday.id !== action.payload);
			})
			.addCase(deleteHoliday.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			});
	},
});

export default holidaySlice.reducer;
