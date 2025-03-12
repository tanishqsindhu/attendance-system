const { getEmployees, saveProcessedAttendance, OrganizationSettingsService, HolidayService, AttendanceRulesService } = require("@/firebase/index");
const { doc, getDoc } = require("firebase/firestore");
const { db } = require("@/firebase/firebase-config");

/**
 * Serverless function to process attendance data
 * Recalculates firstIn and lastOut from logs while processing attendance
 */
exports.handler = async (event) => {
	// Validate HTTP method
	if (event.httpMethod !== "POST") {
		return { statusCode: 405, body: JSON.stringify({ message: "Method Not Allowed" }) };
	}

	try {
		const { branchId, monthYear, startDate, endDate, employeeIds } = JSON.parse(event.body);

		// Validate required inputs
		if (!branchId) {
			return {
				statusCode: 400,
				body: JSON.stringify({
					message: "Missing required data. branchId is required.",
				}),
			};
		}

		// Either monthYear OR both startDate and endDate are required
		if (!monthYear && (!startDate || !endDate)) {
			return {
				statusCode: 400,
				body: JSON.stringify({
					message: "Missing required data. Either monthYear OR both startDate and endDate are required.",
				}),
			};
		}

		// Determine processing mode and dates
		let processingDates = [];
		let processingMonthYears = new Set();
		let displayRange = "";
		let primaryYear;

		if (startDate && endDate) {
			// Date range mode
			displayRange = `${startDate} to ${endDate}`;
			console.log(`Processing attendance for branch: ${branchId}, date range: ${displayRange}`);
			processingDates = generateDateRange(startDate, endDate);

			// Extract all month-years from this date range
			for (const date of processingDates) {
				processingMonthYears.add(extractMonthYear(date));
			}

			// Use year from the first date for holiday fetching
			primaryYear = new Date(startDate).getFullYear();
		} else {
			// Month mode (existing functionality)
			displayRange = monthYear;
			console.log(`Processing attendance for branch: ${branchId}, month-year: ${monthYear}`);
			processingMonthYears.add(monthYear);

			// Extract year and month from monthYear
			const [month, year] = monthYear.split("-").map(Number);
			primaryYear = year;

			// Calculate all dates in the month
			const daysInMonth = new Date(year, month, 0).getDate();
			for (let day = 1; day <= daysInMonth; day++) {
				const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
				processingDates.push(date);
			}
		}

		// Fetch employees, settings, and holidays in parallel
		const [allEmployees, settings, attendanceRules, holidays] = await Promise.all([getEmployees(branchId), OrganizationSettingsService.getSettings(), AttendanceRulesService.getAttendanceRules(branchId), HolidayService.getHolidaysByYear(primaryYear)]);

		// Filter employees if specific employeeIds are provided
		const employees = employeeIds && employeeIds.length > 0 ? Object.fromEntries(Object.entries(allEmployees).filter(([id]) => employeeIds.includes(id))) : allEmployees;

		// Extract needed settings
		const { shiftSchedules } = settings;
		const rules = attendanceRules;

		// Create a map of holidays for quick lookup
		const holidayMap = {};
		holidays.forEach((holiday) => {
			holidayMap[holiday.date] = holiday;
		});

		console.log(`Found ${holidays.length} holidays for year ${primaryYear}`);

		// Validate employee data existence
		if (!employees || Object.keys(employees).length === 0) {
			return {
				statusCode: 404,
				body: JSON.stringify({ message: "No employees found matching criteria" }),
			};
		}

		// Process attendance grouped by month-year for storage
		const processedAttendance = {};

		// Iterate through each employee
		for (const [employeeId, employee] of Object.entries(employees)) {
			// Get employee shift details
			const shiftId = employee.employment?.shiftId;
			const shift = shiftSchedules.find((s) => s.id === shiftId);

			if (!shift) {
				console.log(`Skipping employee ${employeeId} - shift not found`);
				continue;
			}

			// Process attendance for the date range using existing employee attendance data
			processEmployeeAttendanceFromExisting(employeeId, employee, shift, rules, processedAttendance, processingDates, holidayMap);
		}

		// Sanitize the processed attendance to remove any undefined values
		for (const monthYear in processedAttendance) {
			for (const employeeId in processedAttendance[monthYear]) {
				for (const date in processedAttendance[monthYear][employeeId]) {
					sanitizeObject(processedAttendance[monthYear][employeeId][date]);
				}
			}
		}

		// Store processed attendance in Firestore - grouped by month-year
		const savePromises = Object.entries(processedAttendance).map(async ([monthYear, data]) => {
			console.log(`Saving attendance data for ${monthYear} with ${Object.keys(data).length} employees`);
			return saveProcessedAttendance(branchId, monthYear, data);
		});

		await Promise.all(savePromises);

		// Return success response with summary
		return {
			statusCode: 200,
			body: JSON.stringify({
				message: "Attendance processed successfully",
				summary: {
					dateRange: displayRange,
					datesProcessed: processingDates.length,
					monthsProcessed: processingMonthYears.size,
					totalEmployees: Object.keys(employees).length,
					processedEmployees: Object.values(processedAttendance).reduce((count, monthData) => count + Object.keys(monthData).length, 0),
				},
			}),
		};
	} catch (error) {
		console.error("Error processing attendance:", error);
		return {
			statusCode: 500,
			body: JSON.stringify({
				message: "Error processing attendance",
				error: error.message,
				stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
			}),
		};
	}
};

/**
 * Sanitize an object by removing undefined values and converting them to null
 *
 * @param {Object} obj - Object to sanitize
 * @returns {Object} - Sanitized object
 */
function sanitizeObject(obj) {
	if (!obj || typeof obj !== "object") return obj;

	Object.keys(obj).forEach((key) => {
		if (obj[key] === undefined) {
			// Replace undefined with null
			obj[key] = null;
		} else if (typeof obj[key] === "object" && obj[key] !== null) {
			// Recursively sanitize nested objects
			sanitizeObject(obj[key]);
		}
	});

	return obj;
}

/**
 * Process an employee's attendance for specific dates using existing attendance data
 *
 * @param {string} employeeId - The employee ID
 * @param {Object} employee - The employee object containing attendance and salary info
 * @param {Object} shift - Employee's shift schedule
 * @param {Object} attendanceRules - Attendance rules
 * @param {Object} processedAttendance - Output object to store processed data
 * @param {Array} dates - Specific dates to process (YYYY-MM-DD format)
 * @param {Object} holidayMap - Map of holidays for quick lookup
 */
function processEmployeeAttendanceFromExisting(employeeId, employee, shift, attendanceRules, processedAttendance, dates, holidayMap) {
	// Get the employee's salary for calculations
	const monthlySalary = employee.employment?.salaryAmount || 0;
	console.log(`Processing employee ${employeeId} with salary: ${monthlySalary}`);

	// Process each date in the specified range
	for (const date of dates) {
		// Get the month-year for this date (for organizing in the output)
		const monthYear = extractMonthYear(date);

		// Initialize the output structure if it doesn't exist
		if (!processedAttendance[monthYear]) {
			processedAttendance[monthYear] = {};
		}

		if (!processedAttendance[monthYear][employeeId]) {
			processedAttendance[monthYear][employeeId] = {};
		}

		// Calculate daily salary based on this date's month
		const [month, year] = monthYear.split("-").map(Number);
		const daysInMonth = new Date(year, month, 0).getDate();
		const dailySalary = monthlySalary / daysInMonth;

		// Get existing attendance data for this date if it exists
		const existingAttendance = employee.attendance?.[monthYear]?.[date] || {};
		const existingLogs = existingAttendance.logs || [];

		// We need day of week for shift checking
		const dayOfWeek = new Date(date).toLocaleString("en-US", { weekday: "long" });

		// Initialize the day record
		const dayRecord = {
			// Preserve existing logs
			logs: existingLogs,

			// Other fields to preserve or default
			dayOfWeek,
			sanctioned: existingAttendance.sanctioned || false,
			isWorkDay: shift.days.includes(dayOfWeek),

			// Ensure we preserve any important metadata
			notes: existingAttendance.notes || null,

			// Fields that will be calculated/recalculated
			firstIn: null,
			lastOut: null,
			workingHours: "0h 0m",
			status: "",
			attendanceDeduction: 0,
			deductionAmount: 0,
			deductionRemarks: "",
			updatedAt: new Date().toISOString(),
		};

		// Calculate firstIn and lastOut from logs
		recalculateFirstInLastOut(dayRecord, date);

		// Check if the date is a holiday
		if (holidayMap[date]) {
			processHolidayAttendance(dayRecord, holidayMap[date]);
		}
		// Check if it's a scheduled work day
		else if (shift.days.includes(dayOfWeek)) {
			// Get shift times for this day
			const { startTime, endTime } = getShiftTimesForDay(date, dayOfWeek, shift);

			// Store shift times
			dayRecord.shiftStart = startTime;
			dayRecord.shiftEnd = endTime;

			// Process attendance based on recalculated firstIn/lastOut
			if (!dayRecord.firstIn && !dayRecord.lastOut) {
				// No punches at all - mark as absent
				processAbsentAttendance(dayRecord, startTime, endTime, dailySalary, attendanceRules.leaveRules?.unsanctionedMultiplier || 2);
			} else {
				// We have some punch data - process it
				processExistingAttendance(date, dayRecord, shift, attendanceRules.lateDeductions, dailySalary, attendanceRules.leaveRules?.unsanctionedMultiplier || 2);
			}
		}
		// Not a working day according to shift
		else {
			processOffDayAttendance(dayRecord);
		}

		// Store the processed record
		processedAttendance[monthYear][employeeId][date] = dayRecord;
	}
}

/**
 * Recalculate firstIn and lastOut times from logs
 * Fixed to ensure proper time comparison for firstIn/lastOut determination
 *
 * @param {Object} dayRecord - The day's attendance record to be updated
 * @param {string} date - The date in YYYY-MM-DD format
 */
function recalculateFirstInLastOut(dayRecord, date) {
	// Get logs from the day record
	const logs = dayRecord.logs || [];

	if (logs.length === 0) {
		dayRecord.firstIn = null;
		dayRecord.lastOut = null;
		dayRecord.workingHours = "0h 0m";
		return;
	}

	// Initialize variables to track earliest in and latest out
	let firstInTime = null;
	let lastOutTime = null;
	let firstInLog = null;
	let lastOutLog = null;

	// Process each log entry
	for (const log of logs) {
		if (!log.time || !log.inOut) continue;

		try {
			// Parse the time
			const timeObj = createTimeFromString(date, log.time);

			// For DutyOn entries, find the earliest
			if (log.inOut === "DutyOn") {
				if (!firstInTime || timeObj < firstInTime) {
					firstInTime = timeObj;
					firstInLog = log;
				}
			}
			// For DutyOff entries, find the latest
			else if (log.inOut === "DutyOff") {
				if (!lastOutTime || timeObj > lastOutTime) {
					lastOutTime = timeObj;
					lastOutLog = log;
				}
			}
		} catch (error) {
			console.warn(`Error parsing log time: ${log.time}`, error);
		}
	}

	// Update the dayRecord with the calculated values
	dayRecord.firstIn = firstInLog ? firstInLog.time : null;
	dayRecord.lastOut = lastOutLog ? lastOutLog.time : null;

	// Calculate working hours if both in and out are present
	if (firstInTime && lastOutTime) {
		const workMinutes = Math.max(0, (lastOutTime - firstInTime) / (1000 * 60));
		const hours = Math.floor(workMinutes / 60);
		const minutes = Math.round(workMinutes % 60);
		dayRecord.workingHours = `${hours}h ${minutes}m`;
	} else {
		dayRecord.workingHours = "0h 0m";
	}
}

/**
 * Process a holiday attendance record
 *
 * @param {Object} dayRecord - The day's attendance record to be updated
 * @param {Object} holiday - Holiday information
 */
function processHolidayAttendance(dayRecord, holiday) {
	dayRecord.status = `Holiday: ${holiday.name}`;
	dayRecord.attendanceDeduction = 0;
	dayRecord.deductionAmount = 0;
	dayRecord.deductionRemarks = `No deduction - ${holiday.type || "full"} holiday: ${holiday.name}`;

	// Store the holiday details
	dayRecord.holiday = {
		name: holiday.name,
		type: holiday.type || "full",
	};
}

/**
 * Process an absent day's attendance
 *
 * @param {Object} dayRecord - The day's attendance record to be updated
 * @param {string} startTime - Shift start time
 * @param {string} endTime - Shift end time
 * @param {number} dailySalary - Daily salary amount
 * @param {number} multiplier - Deduction multiplier
 */
function processAbsentAttendance(dayRecord, startTime, endTime, dailySalary, multiplier) {
	// If it's already sanctioned, use a single multiplier
	const actualMultiplier = dayRecord.sanctioned ? 1 : multiplier;

	// Set status based on sanction status
	dayRecord.status = dayRecord.sanctioned ? "Absent: Sanctioned Leave" : "Absent: Unsanctioned Leave";

	dayRecord.attendanceDeduction = 1; // Full day attendance deduction
	dayRecord.deductionAmount = dailySalary * actualMultiplier;
	dayRecord.deductionRemarks = `₹${dayRecord.deductionAmount.toFixed(2)} deduction (${actualMultiplier}x daily salary) - ${dayRecord.sanctioned ? "Sanctioned" : "Unsanctioned"} leave`;
	dayRecord.shiftStart = startTime;
	dayRecord.shiftEnd = endTime;
}

/**
 * Process an off day's attendance
 *
 * @param {Object} dayRecord - The day's attendance record to be updated
 */
function processOffDayAttendance(dayRecord) {
	dayRecord.status = "Off Day";
	dayRecord.attendanceDeduction = 0;
	dayRecord.deductionAmount = 0;
	dayRecord.deductionRemarks = "No deduction - Not scheduled to work";
}

/**
 * Process existing attendance data based on firstIn and lastOut times
 * Fixed to correctly calculate early departure minutes
 *
 * @param {string} date - The date (YYYY-MM-DD)
 * @param {Object} dayRecord - The day's attendance record to be updated
 * @param {Object} shift - Employee's shift schedule
 * @param {Object} lateDeductions - Late deduction rules
 * @param {number} dailySalary - Employee's daily salary for calculations
 * @param {number} unsanctionedMultiplier - Multiplier for unsanctioned leaves
 */
function processExistingAttendance(date, dayRecord, shift, lateDeductions, dailySalary, unsanctionedMultiplier) {
	const dayOfWeek = dayRecord.dayOfWeek;

	// Get the appropriate shift times for this day
	const { startTime, endTime } = getShiftTimesForDay(date, dayOfWeek, shift);

	// Store shift times
	dayRecord.shiftStart = startTime;
	dayRecord.shiftEnd = endTime;

	// Initialize variables for calculations
	let status = "On Time";
	let attendanceDeduction = 0;
	let deductionAmount = 0;
	let deductionRemarks = "";

	try {
		// Create Date objects for shift times with proper parsing
		const shiftStartTime = createTimeFromString(date, startTime);
		const shiftEndTime = createTimeFromString(date, endTime);

		// Debug output
		console.log(`Shift start: ${shiftStartTime.toLocaleTimeString()}, Shift end: ${shiftEndTime.toLocaleTimeString()}`);

		// Handle night shifts - if end time is before start time, add a day
		if (shiftEndTime < shiftStartTime) {
			shiftEndTime.setDate(shiftEndTime.getDate() + 1);
		}

		// Create DateTime objects from firstIn and lastOut strings with proper parsing
		const firstIn = dayRecord.firstIn ? createTimeFromString(date, dayRecord.firstIn) : null;
		const lastOut = dayRecord.lastOut ? createTimeFromString(date, dayRecord.lastOut) : null;

		// Debug output
		if (firstIn) console.log(`First in: ${firstIn.toLocaleTimeString()}`);
		if (lastOut) console.log(`Last out: ${lastOut.toLocaleTimeString()}`);

		// Check for missing punch
		if (!firstIn || !lastOut) {
			status = "Absent: Missing Punch (Unsanctioned)";
			attendanceDeduction = 1;
			const actualMultiplier = dayRecord.sanctioned ? 1 : unsanctionedMultiplier;
			deductionAmount = dailySalary * actualMultiplier;
			deductionRemarks = `₹${deductionAmount.toFixed(2)} deduction (${actualMultiplier}x daily salary) - ${dayRecord.sanctioned ? "Sanctioned" : "Unsanctioned"} leave due to missing ${!firstIn ? "entry" : "exit"} record`;
		} else {
			// Recalculate working hours
			const workMinutes = Math.max(0, (lastOut - firstIn) / (1000 * 60));
			const hours = Math.floor(workMinutes / 60);
			const minutes = Math.round(workMinutes % 60);
			dayRecord.workingHours = `${hours}h ${minutes}m`;

			// Calculate grace period if enabled
			let effectiveStartTime = new Date(shiftStartTime);
			if (shift.flexibleTime && shift.flexibleTime.enabled) {
				effectiveStartTime.setMinutes(effectiveStartTime.getMinutes() + (shift.flexibleTime.graceMinutes || 0));
			}

			// Check for late arrival
			let minutesLate = 0;
			if (firstIn > effectiveStartTime) {
				minutesLate = Math.round((firstIn - effectiveStartTime) / (1000 * 60));

				if (minutesLate > 0) {
					status = `Late In (${minutesLate} min)`;

					// Apply deduction rules for late arrival
					if (lateDeductions && lateDeductions.enabled) {
						if (minutesLate >= (lateDeductions.absentThreshold || 240)) {
							status = dayRecord.sanctioned ? `Absent: Late ${minutesLate} min (Sanctioned)` : `Absent: Late ${minutesLate} min (Unsanctioned)`;

							attendanceDeduction = 1;
							const actualMultiplier = dayRecord.sanctioned ? 1 : unsanctionedMultiplier;
							deductionAmount = dailySalary * actualMultiplier;
							deductionRemarks = `₹${deductionAmount.toFixed(2)} deduction (${actualMultiplier}x daily salary) - ${dayRecord.sanctioned ? "Sanctioned" : "Unsanctioned"} leave due to excessive lateness (${minutesLate} minutes exceeds threshold of ${lateDeductions.absentThreshold || 240} minutes)`;
						} else if (minutesLate >= (lateDeductions.halfDayThreshold || 120)) {
							status = `Half Day (Late ${minutesLate} min)`;
							attendanceDeduction = 0.5;
							deductionAmount = dailySalary * 0.5;
							deductionRemarks = `₹${deductionAmount.toFixed(2)} deduction (0.5x daily salary) - Half day due to lateness (${minutesLate} minutes exceeds threshold of ${lateDeductions.halfDayThreshold || 120} minutes)`;
						} else {
							// Calculate minute-based deduction
							const deductionMinutes = Math.min(minutesLate, lateDeductions.maxDeductionTime || 90);

							if (lateDeductions.deductionType === "percentage") {
								const percentageDeduction = deductionMinutes * (lateDeductions.deductPerMinute || 0.5);
								attendanceDeduction = percentageDeduction / 100;
								deductionAmount = (dailySalary * percentageDeduction) / 100;
								deductionRemarks = `₹${deductionAmount.toFixed(2)} deduction (${percentageDeduction.toFixed(1)}% of daily salary) - Late by ${minutesLate} minutes (${deductionMinutes} chargeable minutes at ${lateDeductions.deductPerMinute || 0.5}% per minute)`;
							} else {
								deductionAmount = deductionMinutes * (lateDeductions.fixedAmountPerMinute || 1);
								attendanceDeduction = 0;
								deductionRemarks = `₹${deductionAmount.toFixed(2)} fixed deduction - Late by ${minutesLate} minutes (${deductionMinutes} chargeable minutes at ₹${lateDeductions.fixedAmountPerMinute || 1} per minute)`;
							}
						}
					}
				}
			}

			// Check for early departure - FIXED CALCULATION
			let minutesEarly = 0;
			if (lastOut < shiftEndTime) {
				// Calculate correct minutes early by comparing times directly
				const lastOutMinutes = lastOut.getHours() * 60 + lastOut.getMinutes();
				const shiftEndMinutes = shiftEndTime.getHours() * 60 + shiftEndTime.getMinutes();
				minutesEarly = shiftEndMinutes - lastOutMinutes;

				// Ensure this is a positive number between 0 and 1440 (24 hours)
				minutesEarly = Math.max(0, Math.min(minutesEarly, 1440));

				console.log(`Calculated minutes early: ${minutesEarly}`);

				// If already has status for late arrival, add early departure info
				if (status !== "On Time") {
					status += ` + Early Out (${minutesEarly} min)`;

					// For combined late + early out, calculate additional deduction
					if (lateDeductions && lateDeductions.enabled) {
						// Calculate minute-based deduction for early departure
						const earlyDeductionMinutes = Math.min(minutesEarly, lateDeductions.maxDeductionTime || 90);

						if (lateDeductions.deductionType === "percentage") {
							const percentageDeduction = earlyDeductionMinutes * (lateDeductions.deductPerMinute || 0.5);
							const earlyDeductionAmount = (dailySalary * percentageDeduction) / 100;
							deductionAmount += earlyDeductionAmount;
							deductionRemarks += ` + ₹${earlyDeductionAmount.toFixed(2)} additional deduction (${percentageDeduction.toFixed(1)}% of daily salary) for early departure by ${minutesEarly} minutes (${earlyDeductionMinutes} chargeable minutes)`;
						} else {
							const earlyDeductionAmount = earlyDeductionMinutes * (lateDeductions.fixedAmountPerMinute || 1);
							deductionAmount += earlyDeductionAmount;
							deductionRemarks += ` + ₹${earlyDeductionAmount.toFixed(2)} additional fixed deduction for early departure by ${minutesEarly} minutes (${earlyDeductionMinutes} chargeable minutes at ₹${lateDeductions.fixedAmountPerMinute || 1} per minute)`;
						}
					}
				} else {
					status = `Early Out (${minutesEarly} min)`;

					// Apply similar rules as late arrival for early departure
					if (lateDeductions && lateDeductions.enabled) {
						if (minutesEarly >= (lateDeductions.absentThreshold || 240)) {
							status = dayRecord.sanctioned ? `Absent: Early ${minutesEarly} min (Sanctioned)` : `Absent: Early ${minutesEarly} min (Unsanctioned)`;

							attendanceDeduction = 1;
							const actualMultiplier = dayRecord.sanctioned ? 1 : unsanctionedMultiplier;
							deductionAmount = dailySalary * actualMultiplier;
							deductionRemarks = `₹${deductionAmount.toFixed(2)} deduction (${actualMultiplier}x daily salary) - ${dayRecord.sanctioned ? "Sanctioned" : "Unsanctioned"} leave due to leaving early (${minutesEarly} minutes exceeds threshold of ${lateDeductions.absentThreshold || 240} minutes)`;
						} else if (minutesEarly >= (lateDeductions.halfDayThreshold || 120)) {
							status = `Half Day (Early ${minutesEarly} min)`;
							attendanceDeduction = 0.5;
							deductionAmount = dailySalary * 0.5;
							deductionRemarks = `₹${deductionAmount.toFixed(2)} deduction (0.5x daily salary) - Half day due to leaving early (${minutesEarly} minutes exceeds threshold of ${lateDeductions.halfDayThreshold || 120} minutes)`;
						} else {
							const deductionMinutes = Math.min(minutesEarly, lateDeductions.maxDeductionTime || 90);

							if (lateDeductions.deductionType === "percentage") {
								const percentageDeduction = deductionMinutes * (lateDeductions.deductPerMinute || 0.5);
								attendanceDeduction = percentageDeduction / 100;
								deductionAmount = (dailySalary * percentageDeduction) / 100;
								deductionRemarks = `₹${deductionAmount.toFixed(2)} deduction (${percentageDeduction.toFixed(1)}% of daily salary) - Left early by ${minutesEarly} minutes (${deductionMinutes} chargeable minutes at ${lateDeductions.deductPerMinute || 0.5}% per minute)`;
							} else {
								deductionAmount = deductionMinutes * (lateDeductions.fixedAmountPerMinute || 1);
								attendanceDeduction = 0;
								deductionRemarks = `₹${deductionAmount.toFixed(2)} fixed deduction - Left early by ${minutesEarly} minutes (${deductionMinutes} chargeable minutes at ₹${lateDeductions.fixedAmountPerMinute || 1} per minute)`;
							}
						}
					}
				}
			}

			// If no issues, mark as on time
			if (status === "On Time") {
				attendanceDeduction = 0;
				deductionAmount = 0;
				deductionRemarks = "No deduction - On time attendance";
			}
		}
	} catch (error) {
		console.error(`Error processing attendance status for ${date}:`, error);
		status = "Error Processing";
		attendanceDeduction = 0;
		deductionAmount = 0;
		deductionRemarks = `Error calculating deductions: ${error.message}`;
	}

	// Update the day's record with processed values
	dayRecord.status = status;
	dayRecord.attendanceDeduction = attendanceDeduction;
	dayRecord.deductionAmount = deductionAmount;
	dayRecord.deductionRemarks = deductionRemarks;
}

/**
 * Helper function to create a Date object from a date string and a time string
 * Fixes the time parsing issues with AM/PM formats
 *
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @param {string} timeStr - Time string (can be in various formats)
 * @returns {Date} - Date object with the proper time
 */
function createTimeFromString(dateStr, timeStr) {
	// If timeStr is already a Date, just return it
	if (timeStr instanceof Date) return timeStr;

	try {
		// Start with a clean date object for the given date
		const result = new Date(dateStr);
		if (isNaN(result.getTime())) {
			console.error(`Invalid date: ${dateStr}`);
			return new Date(); // Return current date/time as fallback
		}

		// Handle various time formats
		if (typeof timeStr === "string") {
			// For AM/PM format (like "3:46:09 pm")
			if (timeStr.toLowerCase().includes("am") || timeStr.toLowerCase().includes("pm")) {
				const isPM = timeStr.toLowerCase().includes("pm");
				// Extract time parts, handling both colon and space separators
				const timeWithoutAMPM = timeStr.toLowerCase().replace(/\s*[ap]m\s*/i, "");
				const timeParts = timeWithoutAMPM.split(":").map((p) => parseInt(p.trim(), 10));

				// Get hours, defaulting to 0 if parsing fails
				let hours = timeParts[0];
				if (isNaN(hours)) hours = 0;

				// Apply AM/PM conversion
				if (isPM && hours < 12) {
					hours += 12; // Convert to 24-hour format if PM
				} else if (!isPM && hours === 12) {
					hours = 0; // 12 AM should be 0 in 24-hour format
				}

				// Set hours, minutes, seconds
				result.setHours(hours);
				result.setMinutes(timeParts[1] || 0);
				result.setSeconds(timeParts[2] || 0);
				result.setMilliseconds(0);
			}
			// For 24-hour format (like "08:00" or "16:00")
			else if (timeStr.includes(":")) {
				const timeParts = timeStr.split(":").map((p) => parseInt(p.trim(), 10));
				result.setHours(timeParts[0] || 0);
				result.setMinutes(timeParts[1] || 0);
				result.setSeconds(timeParts[2] || 0);
				result.setMilliseconds(0);
			}
		}

		return result;
	} catch (error) {
		console.error(`Error parsing time: ${dateStr} ${timeStr}`, error);
		return new Date(); // Return current date/time as fallback
	}
}

/**
 * Determine the appropriate shift times for a specific day
 *
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
	let startTime = shift.startTime || "08:00";
	let endTime = shift.endTime || "16:00";

	// If default times are specified separately, use those
	if (shift.defaultTimes) {
		startTime = shift.defaultTimes.start || startTime;
		endTime = shift.defaultTimes.end || endTime;
	}

	return { startTime, endTime };
}

/**
 * Generate an array of dates between startDate and endDate (inclusive)
 *
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Array<string>} - Array of dates in YYYY-MM-DD format
 */
function generateDateRange(startDate, endDate) {
	const start = new Date(startDate);
	const end = new Date(endDate);
	const dates = [];

	// Loop from start date to end date (inclusive)
	for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
		dates.push(dt.toISOString().split("T")[0]);
	}

	return dates;
}

/**
 * Extract month-year from a date string
 *
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {string} - Month-year in MM-YYYY format
 */
function extractMonthYear(dateStr) {
	const date = new Date(dateStr);
	const month = date.getMonth() + 1; // JS months are 0-indexed
	const year = date.getFullYear();
	return `${String(month).padStart(2, "0")}-${year}`;
}
