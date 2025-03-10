// Main export file that combines all services

// Config
export { db } from "./firebase-config";

// Utilities
export { logError, documentExists, generateId, timeStringToMinutes, getMonthsBetween } from "./firebase-utils";

// Organization Settings
export { OrganizationSettingsService } from "./organization-service";

// Employee Management
export { getEmployees, getEmployeeDetails, addEmployeeToBranch, deleteEmployee, updateEmployeeDetails, getActiveEmployees } from "./employee-service";

// Attendance Management
export { checkAttendanceExists, saveAttendanceData, getAttendanceLogs, saveProcessedAttendance, addCollectionAndDocuments, getAvailableAttendancePeriods, getEmployeeAttendanceLogs } from "./attendance-service";

// Holiday Management
export { HolidayService } from "./holiday-service";

// Attendance Rules
export { AttendanceRulesService } from "./attendance-rules-service";

