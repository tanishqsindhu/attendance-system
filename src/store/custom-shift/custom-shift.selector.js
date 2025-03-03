// Selectors
export const selectCustomShifts = (state) => state.customShifts.shifts;
export const selectCurrentShift = (state) => state.customShifts.currentShift;
export const selectCustomShiftsLoading = (state) => state.customShifts.loading;
export const selectCustomShiftsError = (state) => state.customShifts.error;
