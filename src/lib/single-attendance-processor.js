/**
 * Process attendance for a specific date for an employee
 * @param {Object} employee - The employee object with attendance data
 * @param {string} branchId - Branch ID
 * @param {string} employeeId - Employee ID
 * @param {string} dateKey - Date in YYYY-MM-DD format
 * @param {Object} shiftSchedules - Available shift schedules
 * @param {Object} attendanceRules - Attendance rules for deduction calculation
 * @returns {Object} - Processed attendance data for the date
 */
export const processDateAttendance = async (employee, branchId, employeeId, dateKey, shiftSchedules, attendanceRules) => {
	try {
		// Validate required inputs
		if (!employee || !branchId || !employeeId || !dateKey) {
			throw new Error("Required parameters missing: employee, branchId, employeeId, and dateKey are required");
		}

		// Extract date components
		const [year, month, day] = dateKey.split("-");
		const monthYear = `${month}-${year}`;
		const date = new Date(`${year}-${month}-${day}`);
		const dayOfWeek = date.toLocaleString("en-US", { weekday: "long" });

		// Get employee's attendance for the date
		const dateAttendance = employee.attendance?.[monthYear]?.[dateKey];

		// Get employee shift details
		const shiftId = employee.employment.shiftId;
		const shift = shiftSchedules.find((s) => s.id === shiftId);

		// Early return if shift not found
		if (!shift) {
			return {
				processed: false,
				reason: `Shift not found for employee ${employeeId}`,
				status: "Missing Shift",
			};
		}

		// Check if shift applies to this day
		const isWorkingDay = shift.days.includes(dayOfWeek);

		// Calculate the actual number of days in the month
		const daysInMonth = getDaysInMonth(parseInt(year), parseInt(month) - 1); // Month is 0-indexed in Date

		// Get employee's salary for percentage calculations
		const monthlySalary = employee.employment?.salaryAmount || 0;
		const dailySalary = monthlySalary / daysInMonth; // Accurate daily salary based on actual days in month

		// If it's a working day but no attendance data found, mark as absent
		if (isWorkingDay && !dateAttendance) {
			return {
				processed: true,
				status: "Absent",
				firstIn: null,
				lastOut: null,
				workingHours: "0h 0m",
				deduction: 1, // Full day deduction for absence
				deductionAmount: dailySalary, // Full daily salary deduction
				remarks: "Absent - No attendance records",
				logs: [],
				shiftStart: getShiftTimesForDay(dateKey, dayOfWeek, shift).startTime,
				shiftEnd: getShiftTimesForDay(dateKey, dayOfWeek, shift).endTime,
				isWorkingDay,
			};
		}

		// If it's not a working day and no attendance, mark as off day
		if (!isWorkingDay && !dateAttendance) {
			return {
				processed: true,
				status: "Off Day",
				firstIn: null,
				lastOut: null,
				workingHours: "0h 0m",
				deduction: 0,
				deductionAmount: 0,
				remarks: "Not scheduled to work",
				logs: [],
				shiftStart: getShiftTimesForDay(dateKey, dayOfWeek, shift).startTime,
				shiftEnd: getShiftTimesForDay(dateKey, dayOfWeek, shift).endTime,
				isWorkingDay,
			};
		}

		// If no attendance data found but it's not a work day, no deduction
		if (!dateAttendance && !isWorkingDay) {
			return {
				processed: true,
				reason: `No attendance data found for date ${dateKey} (Off day)`,
				status: "Off Day",
				deduction: 0,
				deductionAmount: 0,
				remarks: "Not scheduled to work",
				isWorkingDay,
			};
		}

		// Set default attendance rules if not provided
		const lateDeductions = attendanceRules?.lateDeductions || {
			halfDayThreshold: 120,
			fixedAmountPerMinute: 0,
			absentThreshold: 0,
			deductionType: "percentage",
			maxDeductionTime: 90,
			deductPerMinute: 0.5,
			enabled: true, // Change default to true to ensure deductions are calculated
		};

		// Get shift times for the day
		const { startTime, endTime } = getShiftTimesForDay(dateKey, dayOfWeek, shift);

		// Parse shift times
		const { shiftStartTime, shiftEndTime } = parseShiftTimes(date, startTime, endTime);

		if (!shiftStartTime || !shiftEndTime) {
			return {
				processed: false,
				reason: "Error parsing shift times",
				status: "Error",
			};
		}

		// Initialize logs array to handle null/undefined
		const attendanceLogs = dateAttendance?.logs || [];

		// Process attendance logs
		const { firstIn, lastOut, workingHours, totalWorkMinutes } = processAttendanceLogs(attendanceLogs, date);

		// Calculate attendance status and deductions
		const attendanceResult = calculateAttendanceStatus({
			isWorkingDay,
			logs: attendanceLogs,
			firstIn,
			lastOut,
			shiftStartTime,
			shiftEndTime,
			shift,
			lateDeductions,
			dailySalary,
		});

		// Create processed attendance object to return
		return {
			processed: true,
			status: attendanceResult.status,
			firstIn: firstIn ? formatTime(firstIn) : null,
			lastOut: lastOut ? formatTime(lastOut) : null,
			workingHours,
			deduction: attendanceResult.attendanceDeduction,
			deductionAmount: attendanceResult.deductionAmount,
			remarks: attendanceResult.deductionRemarks,
			logs: attendanceLogs,
			shiftStart: startTime,
			shiftEnd: endTime,
			isWorkingDay,
			daysInMonth, // Added for reference
		};
	} catch (error) {
		console.error("Error processing date attendance:", error);
		return {
			processed: false,
			error: error.message,
			status: "Error",
			reason: `Error processing date attendance: ${error.message}`,
		};
	}
};

/**
 * Get the number of days in a month
 * @param {number} year - The year (e.g., 2023)
 * @param {number} month - The month (0-11, where 0 is January)
 * @returns {number} - Number of days in the month
 */
function getDaysInMonth(year, month) {
	// The day 0 of next month is the last day of current month
	return new Date(year, month + 1, 0).getDate();
}

/**
 * Process attendance logs to find first in, last out, and calculate working hours
 * @param {Array} logs - Attendance logs
 * @param {Date} baseDate - Base date to use for time calculations
 * @returns {Object} - Processed log information
 */
function processAttendanceLogs(logs, baseDate) {
	// Handle empty logs
	if (!logs || logs.length === 0) {
		return {
			firstIn: null,
			lastOut: null,
			workingHours: "0h 0m",
			totalWorkMinutes: 0,
		};
	}

	// Sort logs by time
	const sortedLogs = [...logs].sort((a, b) => {
		const aTime = a.dateTime ? new Date(a.dateTime.seconds * 1000) : parseTimeStringToDate(a.time, baseDate);
		const bTime = b.dateTime ? new Date(b.dateTime.seconds * 1000) : parseTimeStringToDate(b.time, baseDate);
		return aTime - bTime;
	});

	// Find first DutyOn and last DutyOff
	const dutyOnLogs = sortedLogs.filter((log) => log.inOut === "DutyOn");
	const dutyOffLogs = sortedLogs.filter((log) => log.inOut === "DutyOff");

	const firstInLog = dutyOnLogs.length > 0 ? dutyOnLogs[0] : null;
	const lastOutLog = dutyOffLogs.length > 0 ? dutyOffLogs[dutyOffLogs.length - 1] : null;

	// Get first in and last out timestamps
	const firstIn = firstInLog ? (firstInLog.dateTime ? new Date(firstInLog.dateTime.seconds * 1000) : parseTimeStringToDate(firstInLog.time, baseDate)) : null;

	const lastOut = lastOutLog ? (lastOutLog.dateTime ? new Date(lastOutLog.dateTime.seconds * 1000) : parseTimeStringToDate(lastOutLog.time, baseDate)) : null;

	// Calculate working hours if both in and out are recorded
	let totalWorkMinutes = 0;
	let workingHours = "0h 0m";

	if (firstIn && lastOut) {
		totalWorkMinutes = Math.max(0, (lastOut - firstIn) / (1000 * 60));

		// Format working hours
		const hours = Math.floor(totalWorkMinutes / 60);
		const minutes = Math.round(totalWorkMinutes % 60);
		workingHours = `${hours}h ${minutes}m`;
	}

	return { firstIn, lastOut, workingHours, totalWorkMinutes };
}

/**
 * Convert time string (e.g., "7:43:18 am") to a Date object
 * @param {string} timeStr - Time string (e.g., "7:43:18 am")
 * @param {Date} baseDate - The base date to use
 * @returns {Date} - Date object with the time set
 */
function parseTimeStringToDate(timeStr, baseDate) {
	try {
		if (!timeStr) {
			return null;
		}

		const result = new Date(baseDate);

		// Parse the time format "7:43:18 am"
		const timeRegex = /(\d+):(\d+):(\d+)\s*(am|pm)/i;
		const match = timeStr.match(timeRegex);

		if (!match) {
			throw new Error(`Invalid time format: ${timeStr}`);
		}

		let hours = parseInt(match[1], 10);
		const minutes = parseInt(match[2], 10);
		const seconds = parseInt(match[3], 10);
		const isPM = match[4].toLowerCase() === "pm";

		// Convert to 24-hour format
		if (isPM && hours < 12) {
			hours += 12;
		} else if (!isPM && hours === 12) {
			hours = 0;
		}

		result.setHours(hours, minutes, seconds, 0);
		return result;
	} catch (error) {
		console.error(`Error parsing time string: ${timeStr}`, error);
		return null;
	}
}

/**
 * Parse shift start and end times for a specific date
 * @param {Date} date - The date object
 * @param {string} startTime - Start time in HH:MM format
 * @param {string} endTime - End time in HH:MM format
 * @returns {Object} - Shift start and end time as Date objects
 */
function parseShiftTimes(date, startTime, endTime) {
	try {
		// Parse the time properly
		const [startHour, startMinute] = startTime.split(":").map(Number);
		const [endHour, endMinute] = endTime.split(":").map(Number);

		// Create date objects for the specified date
		const shiftStartTime = new Date(date);
		shiftStartTime.setHours(startHour, startMinute, 0);

		const shiftEndTime = new Date(date);
		shiftEndTime.setHours(endHour, endMinute, 0);

		// If end time is before start time, it's likely a night shift crossing midnight
		if (shiftEndTime < shiftStartTime) {
			shiftEndTime.setDate(shiftEndTime.getDate() + 1);
		}

		return { shiftStartTime, shiftEndTime };
	} catch (err) {
		console.error(`Error parsing shift times: ${startTime} - ${endTime}`, err);
		return { shiftStartTime: null, shiftEndTime: null };
	}
}

/**
 * Calculate attendance status and deductions
 * @param {Object} params - Parameters for calculation
 * @returns {Object} - Attendance status information
 */
function calculateAttendanceStatus({ isWorkingDay, logs, firstIn, lastOut, shiftStartTime, shiftEndTime, shift, lateDeductions, dailySalary }) {
	let status = "Manual Entry";
	let attendanceDeduction = 0;
	let deductionAmount = 0;
	let deductionRemarks = "";

	// Handle non-working days
	if (!isWorkingDay) {
		return {
			status: "Off Day",
			attendanceDeduction: 0,
			deductionAmount: 0,
			deductionRemarks: "Not scheduled to work",
		};
	}

	// Handle absent (no logs)
	if (!logs || logs.length === 0) {
		return {
			status: "Absent",
			attendanceDeduction: 1, // Full day deduction
			deductionAmount: dailySalary, // Full day salary deduction
			deductionRemarks: "Absent - No attendance records",
		};
	}

	// Handle missing punch (either no in or no out)
	if (!firstIn || !lastOut) {
		return {
			status: "Missing Punch",
			attendanceDeduction: 0.5, // Half day deduction for missing punch
			deductionAmount: dailySalary * 0.5, // Half day salary deduction
			deductionRemarks: "Missing entry or exit record",
		};
	}

	// Calculate grace period if enabled
	let effectiveStartTime = new Date(shiftStartTime);
	if (shift.flexibleTime && shift.flexibleTime.enabled) {
		effectiveStartTime.setMinutes(effectiveStartTime.getMinutes() + shift.flexibleTime.graceMinutes);
	}

	// Check for late arrival
	let minutesLate = 0;
	if (firstIn > effectiveStartTime) {
		minutesLate = Math.round((firstIn - effectiveStartTime) / (1000 * 60));

		if (minutesLate > 0) {
			status = `Late In (${minutesLate} min)`;

			// Apply deduction rules for late arrival
			if (lateDeductions.enabled) {
				const lateResult = calculateLateDeduction(minutesLate, lateDeductions, dailySalary, "Late");
				status = lateResult.status;
				attendanceDeduction = lateResult.attendanceDeduction;
				deductionAmount = lateResult.deductionAmount;
				deductionRemarks = lateResult.deductionRemarks;
			}
		}
	}

	// Check for early departure
	let minutesEarly = 0;
	if (lastOut < shiftEndTime) {
		minutesEarly = Math.round((shiftEndTime - lastOut) / (1000 * 60));

		// If already has a status for late arrival, add early departure info
		if (status !== "On Time" && status !== "Manual Entry") {
			status += ` + Early Out (${minutesEarly} min)`;

			// For combined late + early out, calculate additional deduction
			if (lateDeductions.enabled) {
				const earlyResult = calculateEarlyDeduction(minutesEarly, lateDeductions, dailySalary);
				deductionAmount += earlyResult.deductionAmount;
				deductionRemarks += earlyResult.deductionRemarks;
			}
		} else {
			status = `Early Out (${minutesEarly} min)`;

			// Apply similar rules as late arrival for early departure
			if (lateDeductions.enabled) {
				const earlyResult = calculateLateDeduction(minutesEarly, lateDeductions, dailySalary, "Early");
				status = earlyResult.status;
				attendanceDeduction = earlyResult.attendanceDeduction;
				deductionAmount = earlyResult.deductionAmount;
				deductionRemarks = earlyResult.deductionRemarks;
			}
		}
	}

	// If no issues and we haven't changed status from default, mark as present
	if (status === "Manual Entry") {
		status = "Present";
		attendanceDeduction = 0;
		deductionAmount = 0;
		deductionRemarks = "No deduction - Employee present for full shift";
	}

	return {
		status,
		attendanceDeduction,
		deductionAmount,
		deductionRemarks,
	};
}

/**
 * Calculate deduction for late arrival
 * @param {number} minutes - Minutes late
 * @param {Object} lateDeductions - Late deduction rules
 * @param {number} dailySalary - Daily salary amount
 * @param {string} type - Type of lateness (Late or Early)
 * @returns {Object} - Calculated deduction information
 */
function calculateLateDeduction(minutes, lateDeductions, dailySalary, type) {
	const typeText = type === "Late" ? "Late by" : "Left early by";
	const typePrefix = type === "Late" ? "Late" : "Early";

	if (lateDeductions.absentThreshold > 0 && minutes >= lateDeductions.absentThreshold) {
		// Marked as absent
		return {
			status: `Absent (${typePrefix} ${minutes} min)`,
			attendanceDeduction: 1,
			deductionAmount: dailySalary, // Full day salary deduction
			deductionRemarks: `Marked absent - ${typeText} ${minutes} minutes (exceeds threshold of ${lateDeductions.absentThreshold} minutes)`,
		};
	}

	if (lateDeductions.halfDayThreshold > 0 && minutes >= lateDeductions.halfDayThreshold) {
		// Half day deduction
		return {
			status: `Half Day (${typePrefix} ${minutes} min)`,
			attendanceDeduction: 0.5,
			deductionAmount: dailySalary * 0.5, // Half day salary deduction
			deductionRemarks: `Half day deduction - ${typeText} ${minutes} minutes (exceeds threshold of ${lateDeductions.halfDayThreshold} minutes)`,
		};
	}

	// Calculate minute-based deduction
	const deductionMinutes = Math.min(minutes, lateDeductions.maxDeductionTime);

	if (lateDeductions.deductionType === "percentage") {
		// Percentage-based deduction
		const percentageDeduction = deductionMinutes * lateDeductions.deductPerMinute;
		const deductionAmount = (dailySalary * percentageDeduction) / 100;

		return {
			status: `${typePrefix} In (${minutes} min)`,
			attendanceDeduction: percentageDeduction / 100,
			deductionAmount,
			deductionRemarks: `₹${deductionAmount.toFixed(2)} deduction (${percentageDeduction.toFixed(1)}% of daily salary) - ${typeText} ${minutes} minutes (${deductionMinutes} chargeable minutes at ${lateDeductions.deductPerMinute}% per minute)`,
		};
	} else {
		// Fixed amount deduction
		const deductionAmount = deductionMinutes * lateDeductions.fixedAmountPerMinute;

		return {
			status: `${typePrefix} In (${minutes} min)`,
			attendanceDeduction: 0, // No attendance deduction, just monetary
			deductionAmount,
			deductionRemarks: `₹${deductionAmount.toFixed(2)} fixed deduction - ${typeText} ${minutes} minutes (${deductionMinutes} chargeable minutes at ₹${lateDeductions.fixedAmountPerMinute} per minute)`,
		};
	}
}

/**
 * Calculate additional deduction for early departure
 * @param {number} minutes - Minutes early
 * @param {Object} lateDeductions - Late deduction rules
 * @param {number} dailySalary - Daily salary amount
 * @returns {Object} - Additional deduction information
 */
function calculateEarlyDeduction(minutes, lateDeductions, dailySalary) {
	// Calculate minute-based deduction for early departure
	const deductionMinutes = Math.min(minutes, lateDeductions.maxDeductionTime);

	if (lateDeductions.deductionType === "percentage") {
		// Percentage-based deduction
		const percentageDeduction = deductionMinutes * lateDeductions.deductPerMinute;
		const deductionAmount = (dailySalary * percentageDeduction) / 100;

		return {
			deductionAmount,
			deductionRemarks: ` + ₹${deductionAmount.toFixed(2)} additional deduction (${percentageDeduction.toFixed(1)}% of daily salary) for early departure by ${minutes} minutes (${deductionMinutes} chargeable minutes)`,
		};
	} else {
		// Fixed amount deduction
		const deductionAmount = deductionMinutes * lateDeductions.fixedAmountPerMinute;

		return {
			deductionAmount,
			deductionRemarks: ` + ₹${deductionAmount.toFixed(2)} additional fixed deduction for early departure by ${minutes} minutes (${deductionMinutes} chargeable minutes at ₹${lateDeductions.fixedAmountPerMinute} per minute)`,
		};
	}
}

/**
 * Helper function to format Date object to time string
 * @param {Date} date - Date object
 * @returns {string} - Time string in format "HH:MM:SS AM/PM"
 */
function formatTime(date) {
	if (!date) return null;

	// Format as "h:MM:SS AM/PM"
	return date
		.toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "2-digit",
			second: "2-digit",
			hour12: true,
		})
		.toLowerCase();
}

/**
 * Determine the appropriate shift times for a specific day
 * @param {string} date - The date (YYYY-MM-DD)
 * @param {string} dayOfWeek - The day of the week (Monday, Tuesday, etc.)
 * @param {Object} shift - The shift schedule
 * @returns {Object} - The start and end times for the shift
 */
function getShiftTimesForDay(date, dayOfWeek, shift) {
	// Check for date override first (highest priority)
	if (shift.dateOverrides && shift.dateOverrides[date]) {
		return {
			startTime: shift.dateOverrides[date].start,
			endTime: shift.dateOverrides[date].end,
		};
	}

	// Check for day of week override next
	if (shift.dayOverrides && shift.dayOverrides[dayOfWeek]) {
		return {
			startTime: shift.dayOverrides[dayOfWeek].start,
			endTime: shift.dayOverrides[dayOfWeek].end,
		};
	}

	// Use the default shift start/end times
	let startTime = shift.startTime;
	let endTime = shift.endTime;

	// If default times are specified separately, use those
	if (shift.defaultTimes) {
		startTime = shift.defaultTimes.start;
		endTime = shift.defaultTimes.end;
	}

	return { startTime, endTime };
}
