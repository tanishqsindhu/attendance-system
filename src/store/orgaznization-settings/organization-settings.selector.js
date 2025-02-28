// Selectors
export const selectAllDepartments = (state) => state.organization.departments;
export const selectAllPositions = (state) => state.organization.positions;
export const selectAllBranches = (state) => state.organization.branches;
export const selectAllShiftSchedules = (state) => state.organization.shiftSchedules;
export const selectOrganizationStatus = (state) => state.organization.status;
export const selectOrganizationError = (state) => state.organization.error;
