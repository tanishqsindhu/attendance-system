const { getAttendanceLogs, getEmployees, saveProcessedAttendance, OrganizationSettingsService, HolidayService, AttendanceRulesService } = require("@/firebase/index");

/**
 * Serverless function to process attendance data from raw logs
 * Uses attendance rules, holidays, and shift schedules to calculate deductions
 */
exports.handler = async (event) => {
	// Validate HTTP method
	if (event.httpMethod !== "POST") {
		return { statusCode: 405, body: JSON.stringify({ message: "Method Not Allowed" }) };
	}

	try {
		const { branchId, monthYear } = JSON.parse(event.body);

		// Validate required inputs
		if (!branchId || !monthYear) {
			return {
				statusCode: 400,
				body: JSON.stringify({
					message: "Missing required data. Both branchId and monthYear are required.",
				}),
			};
		}

		console.log(`Processing attendance for branch: ${branchId}, input month-year: ${monthYear}`);

		// Extract year and month from monthYear
		const [month, year] = monthYear.split("-").map(Number);

		// Fetch attendance logs, employees, settings, and holidays in parallel
		const [attendanceLogs, employees, settings, attendanceRules, holidays] = await Promise.all([
			getAttendanceLogs(branchId, monthYear),
			getEmployees(branchId),
			OrganizationSettingsService.getSettings(),
			AttendanceRulesService.getAttendanceRules(branchId),
			HolidayService.getHolidaysByYear(year), // Fetch holidays for the year
		]);

		// Extract needed settings
		const { shiftSchedules } = settings;
		const  rules  = attendanceRules;

		// Create a map of holidays for quick lookup
		const holidayMap = {};
		holidays.forEach((holiday) => {
			holidayMap[holiday.date] = holiday;
		});

		console.log(`Found ${holidays.length} holidays for year ${year}`);

		// Validate data existence
		if (!attendanceLogs || Object.keys(attendanceLogs).length === 0) {
			return {
				statusCode: 404,
				body: JSON.stringify({ message: "No attendance logs found for the specified period" }),
			};
		}

		if (!employees || Object.keys(employees).length === 0) {
			return {
				statusCode: 404,
				body: JSON.stringify({ message: "No employees found in this branch" }),
			};
		}

		console.log(`Found ${Object.keys(attendanceLogs).length} attendance records and ${Object.keys(employees).length} employees`);
		console.log(`Using attendance rules:`, JSON.stringify(rules.lateDeductions, null, 2));

		// Process attendance grouped by month-year derived from timestamps
		const processedAttendance = {};

		// Calculate all dates in the month for complete attendance processing
		const daysInMonth = new Date(year, month, 0).getDate();
		const allDatesInMonth = [];
		for (let day = 1; day <= daysInMonth; day++) {
			const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
			allDatesInMonth.push(date);
		}

		// Iterate through each employee
		for (const [employeeId, employee] of Object.entries(employees)) {
			// Get employee shift details
			const shiftId = employee.employment?.shiftId;
			const shift = shiftSchedules.find((s) => s.id === shiftId);

			if (!shift) {
				console.log(`Skipping employee ${employeeId} - shift not found`);
				continue;
			}

			// Get employee's attendance logs
			const employeeLogs = attendanceLogs[employeeId] || { logs: [] };

			// Process attendance for all days in the month
			processEmployeeAttendance(employeeId, employee, employeeLogs, shift, rules, processedAttendance, allDatesInMonth, holidayMap, monthYear);
		}

		// Store processed attendance in Firestore - one call per month-year
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
					monthsProcessed: Object.keys(processedAttendance).length,
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
 * Process an employee's attendance for the entire month
 *
 * @param {string} employeeId - The employee ID
 * @param {Object} employee - The employee object containing salary info
 * @param {Object} employeeLogs - The employee's attendance logs
 * @param {Object} shift - Employee's shift schedule
 * @param {Object} attendanceRules - Attendance rules
 * @param {Object} processedAttendance - Output object to store processed data
 * @param {Array} allDates - All dates in the month to process
 * @param {Object} holidayMap - Map of holidays for quick lookup
 * @param {string} monthYear - Month-year being processed
 */
function processEmployeeAttendance(employeeId, employee, employeeLogs, shift, attendanceRules, processedAttendance, allDates, holidayMap, monthYear) {
	// Get the employee's salary for calculations
	const monthlySalary = employee.employment?.salaryAmount || 0;

	// Get the number of days in the month for daily salary calculation
	const [month, year] = monthYear.split("-").map(Number);
	const daysInMonth = new Date(year, month, 0).getDate();
	const dailySalary = monthlySalary / daysInMonth;

	console.log(`Processing employee ${employeeId} with salary: ${monthlySalary}, daily: ${dailySalary.toFixed(2)}`);

	// Create a map of logs by date for easy lookup
	const logsByDate = {};

	if (employeeLogs.logs && Array.isArray(employeeLogs.logs)) {
		employeeLogs.logs.forEach(({ dateTime, mode, inOut }) => {
			// Convert Firestore timestamp to JavaScript Date
			const timestamp = dateTime.seconds ? new Date(dateTime.seconds * 1000) : new Date(dateTime);
			const date = timestamp.toISOString().split("T")[0];

			if (!logsByDate[date]) {
				logsByDate[date] = [];
			}

			logsByDate[date].push({
				time: timestamp,
				inOut,
				mode,
				formattedTime: timestamp.toLocaleTimeString(),
			});
		});
	}

	// Initialize the output structure if it doesn't exist
	if (!processedAttendance[monthYear]) {
		processedAttendance[monthYear] = {};
	}

	if (!processedAttendance[monthYear][employeeId]) {
		processedAttendance[monthYear][employeeId] = {};
	}

	// Process each date in the month
	for (const date of allDates) {
		const dayOfWeek = new Date(date).toLocaleString("en-US", { weekday: "long" });
		const logs = logsByDate[date] || [];

		// Initialize the day record
		const dayRecord = {
			logs: logs.map((log) => ({
				time: log.formattedTime,
				inOut: log.inOut,
				mode: log.mode,
			})),
			status: "",
			attendanceDeduction: 0,
			deductionAmount: 0,
			deductionRemarks: "",
			workingHours: "0h 0m",
			dayOfWeek,
			sanctioned: false, // New field to track if a leave has been sanctioned
		};

		// Check if the date is a holiday
		if (holidayMap[date]) {
			const holiday = holidayMap[date];
			dayRecord.status = `Holiday: ${holiday.name}`;
			dayRecord.attendanceDeduction = 0;
			dayRecord.deductionAmount = 0;
			dayRecord.deductionRemarks = `No deduction - ${holiday.type} holiday: ${holiday.name}`;

			// Store the holiday details
			dayRecord.holiday = {
				name: holiday.name,
				type: holiday.type || "full",
			};
		}
		// Check if it's a scheduled work day
		else if (shift.days.includes(dayOfWeek)) {
			// Get shift times for this day
			const { startTime, endTime } = getShiftTimesForDay(date, dayOfWeek, shift);

			// If no logs for this date, mark as absent (unsanctioned leave)
			if (logs.length === 0) {
				dayRecord.status = "Absent: Unsanctioned Leave";
				dayRecord.attendanceDeduction = 1; // Full day attendance deduction

				// Apply double deduction for unsanctioned leaves
				const multiplier = attendanceRules.leaveRules?.unsanctionedMultiplier || 2;
				dayRecord.deductionAmount = dailySalary * multiplier;
				dayRecord.deductionRemarks = `₹${dayRecord.deductionAmount.toFixed(2)} deduction (${multiplier}x daily salary) - Unsanctioned leave`;

				// Store shift times
				dayRecord.shiftStart = startTime;
				dayRecord.shiftEnd = endTime;
			}
			// Process attendance for days with logs
			else {
				processDailyAttendance(date, dayRecord, logs, shift, attendanceRules.lateDeductions, dailySalary, attendanceRules.leaveRules?.unsanctionedMultiplier || 2);
			}
		}
		// Not a working day according to shift
		else {
			dayRecord.status = "Off Day";
			dayRecord.attendanceDeduction = 0;
			dayRecord.deductionAmount = 0;
			dayRecord.deductionRemarks = "No deduction - Not scheduled to work";
		}

		// Store the processed record
		processedAttendance[monthYear][employeeId][date] = dayRecord;
	}
}

/**
 * Process a single day's attendance for an employee
 *
 * @param {string} date - The date (YYYY-MM-DD)
 * @param {Object} dayRecord - The day's attendance record to be updated
 * @param {Array} shifts - The day's attendance log entries
 * @param {Object} shift - Employee's shift schedule
 * @param {Object} lateDeductions - Late deduction rules
 * @param {number} dailySalary - Employee's daily salary for calculations
 * @param {number} unsanctionedMultiplier - Multiplier for unsanctioned leaves
 */
function processDailyAttendance(date, dayRecord, shifts, shift, lateDeductions, dailySalary, unsanctionedMultiplier) {
	// Sort logs chronologically
	shifts = shifts.sort((a, b) => a.time - b.time);
	const dayOfWeek = dayRecord.dayOfWeek;

	// Get the appropriate shift times for this day
	const { startTime, endTime } = getShiftTimesForDay(date, dayOfWeek, shift);

	// Initialize variables for calculations
	let totalWorkMinutes = 0;
	let firstIn = null;
	let lastOut = null;
	let status = "On Time";
	let attendanceDeduction = 0;
	let deductionAmount = 0;
	let deductionRemarks = "";

	// Find first in and last out times
	shifts.forEach((log) => {
		if (log.inOut === "DutyOn" && (!firstIn || log.time < firstIn)) {
			firstIn = log.time;
		}
		if (log.inOut === "DutyOff" && (!lastOut || log.time > lastOut)) {
			lastOut = log.time;
		}
	});

	// Calculate working hours if both in and out are recorded
	if (firstIn && lastOut) {
		const workMinutes = Math.max(0, (lastOut - firstIn) / (1000 * 60));
		totalWorkMinutes = workMinutes;

		// Format working hours
		const hours = Math.floor(totalWorkMinutes / 60);
		const minutes = Math.round(totalWorkMinutes % 60);
		dayRecord.workingHours = `${hours}h ${minutes}m`;
	}

	try {
		// Create Date objects for shift times - this is critical for correct time comparison
		let shiftStartTime, shiftEndTime;

		try {
			// Parse the time properly
			const [startHour, startMinute] = startTime.split(":").map(Number);
			const [endHour, endMinute] = endTime.split(":").map(Number);

			// Create date objects for the specified date
			shiftStartTime = new Date(date);
			shiftStartTime.setHours(startHour, startMinute, 0);

			shiftEndTime = new Date(date);
			shiftEndTime.setHours(endHour, endMinute, 0);

			// If end time is before start time, it's likely a night shift crossing midnight
			if (shiftEndTime < shiftStartTime) {
				shiftEndTime.setDate(shiftEndTime.getDate() + 1);
			}
		} catch (err) {
			console.error(`Error parsing shift times for ${date}: ${startTime} - ${endTime}`, err);
			shiftStartTime = new Date(`${date}T${startTime}:00`);
			shiftEndTime = new Date(`${date}T${endTime}:00`);
		}

		// Check for missing punch - now treated as unsanctioned leave with double deduction
		if (!firstIn || !lastOut) {
			status = "Absent: Missing Punch (Unsanctioned)";
			attendanceDeduction = 1; // Full day attendance deduction
			deductionAmount = dailySalary * unsanctionedMultiplier; // Double daily salary deduction for unsanctioned
			deductionRemarks = `₹${deductionAmount.toFixed(2)} deduction (${unsanctionedMultiplier}x daily salary) - Unsanctioned leave due to missing ${!firstIn ? "entry" : "exit"} record`;
		} else {
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
						if (minutesLate >= lateDeductions.absentThreshold) {
							// Marked as absent - now unsanctioned leave
							status = `Absent: Late ${minutesLate} min (Unsanctioned)`;
							attendanceDeduction = 1;
							deductionAmount = dailySalary * unsanctionedMultiplier; // Double deduction for unsanctioned
							deductionRemarks = `₹${deductionAmount.toFixed(2)} deduction (${unsanctionedMultiplier}x daily salary) - Unsanctioned leave due to excessive lateness (${minutesLate} minutes exceeds threshold of ${lateDeductions.absentThreshold} minutes)`;
						} else if (minutesLate >= lateDeductions.halfDayThreshold) {
							// Half day deduction
							status = `Half Day (Late ${minutesLate} min)`;
							attendanceDeduction = 0.5;
							deductionAmount = dailySalary * 0.5; // Half day salary deduction
							deductionRemarks = `₹${deductionAmount.toFixed(2)} deduction (0.5x daily salary) - Half day due to lateness (${minutesLate} minutes exceeds threshold of ${lateDeductions.halfDayThreshold} minutes)`;
						} else {
							// Calculate minute-based deduction
							const deductionMinutes = Math.min(minutesLate, lateDeductions.maxDeductionTime);

							if (lateDeductions.deductionType === "percentage") {
								// Percentage-based deduction
								const percentageDeduction = deductionMinutes * lateDeductions.deductPerMinute;
								attendanceDeduction = percentageDeduction / 100;
								deductionAmount = (dailySalary * percentageDeduction) / 100; // Convert percentage to rupees
								deductionRemarks = `₹${deductionAmount.toFixed(2)} deduction (${percentageDeduction.toFixed(1)}% of daily salary) - Late by ${minutesLate} minutes (${deductionMinutes} chargeable minutes at ${lateDeductions.deductPerMinute}% per minute)`;
							} else {
								// Fixed amount deduction
								deductionAmount = deductionMinutes * lateDeductions.fixedAmountPerMinute;
								attendanceDeduction = 0; // No attendance deduction, just monetary
								deductionRemarks = `₹${deductionAmount.toFixed(2)} fixed deduction - Late by ${minutesLate} minutes (${deductionMinutes} chargeable minutes at ₹${lateDeductions.fixedAmountPerMinute} per minute)`;
							}
						}
					}
				}
			}

			// Check for early departure
			let minutesEarly = 0;
			if (lastOut < shiftEndTime) {
				minutesEarly = Math.round((shiftEndTime - lastOut) / (1000 * 60));

				// If already has a status for late arrival, add early departure info
				if (status !== "On Time") {
					status += ` + Early Out (${minutesEarly} min)`;

					// For combined late + early out, calculate additional deduction
					if (lateDeductions.enabled) {
						// Calculate minute-based deduction for early departure
						const earlyDeductionMinutes = Math.min(minutesEarly, lateDeductions.maxDeductionTime);

						if (lateDeductions.deductionType === "percentage") {
							// Percentage-based deduction
							const percentageDeduction = earlyDeductionMinutes * lateDeductions.deductPerMinute;
							const earlyDeductionAmount = (dailySalary * percentageDeduction) / 100;

							// Add to existing deduction
							deductionAmount += earlyDeductionAmount;
							deductionRemarks += ` + ₹${earlyDeductionAmount.toFixed(2)} additional deduction (${percentageDeduction.toFixed(1)}% of daily salary) for early departure by ${minutesEarly} minutes (${earlyDeductionMinutes} chargeable minutes)`;
						} else {
							// Fixed amount deduction
							const earlyDeductionAmount = earlyDeductionMinutes * lateDeductions.fixedAmountPerMinute;

							// Add to existing deduction
							deductionAmount += earlyDeductionAmount;
							deductionRemarks += ` + ₹${earlyDeductionAmount.toFixed(2)} additional fixed deduction for early departure by ${minutesEarly} minutes (${earlyDeductionMinutes} chargeable minutes at ₹${lateDeductions.fixedAmountPerMinute} per minute)`;
						}
					}
				} else {
					status = `Early Out (${minutesEarly} min)`;

					// Apply similar rules as late arrival for early departure
					if (lateDeductions.enabled) {
						if (minutesEarly >= lateDeductions.absentThreshold) {
							// Now unsanctioned leave
							status = `Absent: Early ${minutesEarly} min (Unsanctioned)`;
							attendanceDeduction = 1;
							deductionAmount = dailySalary * unsanctionedMultiplier; // Double deduction for unsanctioned
							deductionRemarks = `₹${deductionAmount.toFixed(2)} deduction (${unsanctionedMultiplier}x daily salary) - Unsanctioned leave due to leaving early (${minutesEarly} minutes exceeds threshold of ${lateDeductions.absentThreshold} minutes)`;
						} else if (minutesEarly >= lateDeductions.halfDayThreshold) {
							status = `Half Day (Early ${minutesEarly} min)`;
							attendanceDeduction = 0.5;
							deductionAmount = dailySalary * 0.5; // Half day salary deduction
							deductionRemarks = `₹${deductionAmount.toFixed(2)} deduction (0.5x daily salary) - Half day due to leaving early (${minutesEarly} minutes exceeds threshold of ${lateDeductions.halfDayThreshold} minutes)`;
						} else {
							// Calculate minute-based deduction
							const deductionMinutes = Math.min(minutesEarly, lateDeductions.maxDeductionTime);

							if (lateDeductions.deductionType === "percentage") {
								// Percentage-based deduction
								const percentageDeduction = deductionMinutes * lateDeductions.deductPerMinute;
								attendanceDeduction = percentageDeduction / 100;
								deductionAmount = (dailySalary * percentageDeduction) / 100; // Convert percentage to rupees
								deductionRemarks = `₹${deductionAmount.toFixed(2)} deduction (${percentageDeduction.toFixed(1)}% of daily salary) - Left early by ${minutesEarly} minutes (${deductionMinutes} chargeable minutes at ${lateDeductions.deductPerMinute}% per minute)`;
							} else {
								// Fixed amount deduction
								deductionAmount = deductionMinutes * lateDeductions.fixedAmountPerMinute;
								attendanceDeduction = 0; // No attendance deduction, just monetary
								deductionRemarks = `₹${deductionAmount.toFixed(2)} fixed deduction - Left early by ${minutesEarly} minutes (${deductionMinutes} chargeable minutes at ₹${lateDeductions.fixedAmountPerMinute} per minute)`;
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

	// Update the day's record
	dayRecord.status = status;
	dayRecord.attendanceDeduction = attendanceDeduction;
	dayRecord.deductionAmount = deductionAmount;
	dayRecord.deductionRemarks = deductionRemarks;
	dayRecord.firstIn = firstIn ? firstIn.toLocaleTimeString() : null;
	dayRecord.lastOut = lastOut ? lastOut.toLocaleTimeString() : null;
	dayRecord.shiftStart = startTime;
	dayRecord.shiftEnd = endTime;
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
	let startTime = shift.startTime;
	let endTime = shift.endTime;

	// If default times are specified separately, use those
	if (shift.defaultTimes) {
		startTime = shift.defaultTimes.start;
		endTime = shift.defaultTimes.end;
	}

	return { startTime, endTime };
}

/**
 * Function to handle sanctioning a leave - can be called after initial processing
 *
 * @param {string} branchId - Branch ID
 * @param {string} monthYear - Month-year format (MM-YYYY)
 * @param {string} employeeId - Employee ID
 * @param {string} date - Date to sanction leave for (YYYY-MM-DD)
 * @returns {Promise<Object>} - Updated attendance record
 */
async function sanctionLeave(branchId, monthYear, employeeId, date) {
	try {
		// Fetch current attendance data
		const attendanceData = await getProcessedAttendance(branchId, monthYear);

		if (!attendanceData || !attendanceData[employeeId] || !attendanceData[employeeId][date]) {
			throw new Error("Attendance record not found");
		}

		const record = attendanceData[employeeId][date];

		// Check if this is an unsanctioned leave that can be sanctioned
		if (!record.status.includes("Unsanctioned")) {
			throw new Error("This record is not an unsanctioned leave");
		}

		// Get employee salary info for recalculation
		const employee = await getEmployee(branchId, employeeId);
		const monthlySalary = employee.employment?.salaryAmount || 0;
		const [month, year] = monthYear.split("-").map(Number);
		const daysInMonth = new Date(year, month, 0).getDate();
		const dailySalary = monthlySalary / daysInMonth;

		// Update to sanctioned leave (single day deduction)
		record.status = record.status.replace("Unsanctioned", "Sanctioned");
		record.sanctioned = true;
		record.deductionAmount = dailySalary; // Reduce to 1x daily salary
		record.deductionRemarks = record.deductionRemarks.replace(/\(2x daily salary\)/, "(1x daily salary)") + " - Leave sanctioned on " + new Date().toISOString().split("T")[0];

		// Save the updated record
		attendanceData[employeeId][date] = record;
		await saveProcessedAttendance(branchId, monthYear, { [employeeId]: { [date]: record } });

		return record;
	} catch (error) {
		console.error("Error sanctioning leave:", error);
		throw error;
	}
}

// Export the sanctioning function to make it available to other modules
exports.sanctionLeave = sanctionLeave;
