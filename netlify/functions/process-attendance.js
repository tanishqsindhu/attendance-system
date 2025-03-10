const { getAttendanceLogs, getEmployees, saveProcessedAttendance, OrganizationSettingsService } = require("@/firebase/index");

/**
 * Serverless function to process attendance data from raw logs
 * Uses attendance rules and shift schedules to calculate deductions in rupees
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

		// Fetch attendance logs, employees, and settings in parallel
		const [attendanceLogs, employees, settings] = await Promise.all([getAttendanceLogs(branchId, monthYear), getEmployees(branchId), OrganizationSettingsService.getSettings()]);

		// Extract needed settings
		const { shiftSchedules } = settings;
		const { rules: attendanceRules } = settings.attendanceRules || {
			rules: {
				lateDeductions: {
					halfDayThreshold: 120,
					fixedAmountPerMinute: 40,
					absentThreshold: 240,
					deductionType: "percentage",
					maxDeductionTime: 90,
					deductPerMinute: 0.5,
					enabled: true,
				},
			},
		};

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
		console.log(`Using attendance rules:`, JSON.stringify(attendanceRules.lateDeductions, null, 2));

		// Process attendance grouped by month-year derived from timestamps
		const processedAttendance = {};

		// Iterate through each employee's logs
		for (const [employeeId, logs] of Object.entries(attendanceLogs)) {
			// Skip if employee not found in employees collection
			if (!employees[employeeId]) {
				console.log(`Skipping employee ${employeeId} - not found in employee records`);
				continue;
			}

			// Get employee shift details
			const employee = employees[employeeId];
			const shiftId = employee.employment.shiftId;
			const shift = shiftSchedules.find((s) => s.id === shiftId);

			if (!shift) {
				console.log(`Skipping employee ${employeeId} - shift not found`);
				continue;
			}

			// Process each employee's attendance logs
			processEmployeeLogs(employeeId, logs, shift, attendanceRules.lateDeductions, processedAttendance, employee);
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
 * Process an employee's attendance logs and organize by month-year
 *
 * @param {string} employeeId - The employee ID
 * @param {Object} logs - The employee's attendance logs
 * @param {Object} shift - Employee's shift schedule
 * @param {Object} lateDeductions - Late deduction rules
 * @param {Object} processedAttendance - Output object to store processed data
 * @param {Object} employee - The employee object containing salary info
 */
function processEmployeeLogs(employeeId, logs, shift, lateDeductions, processedAttendance, employee) {
	if (!logs.logs || !Array.isArray(logs.logs) || logs.logs.length === 0) {
		console.log(`No logs found for employee ${employeeId}`);
		return;
	}

	// Group logs by month-year derived from actual timestamps
	const groupedLogs = {};

	// First pass - group logs by date and month-year
	logs.logs.forEach(({ dateTime, mode, inOut }) => {
		// Convert Firestore timestamp to JavaScript Date
		const timestamp = dateTime.seconds ? new Date(dateTime.seconds * 1000) : new Date(dateTime);

		// Extract date components
		const year = timestamp.getFullYear();
		const month = String(timestamp.getMonth() + 1).padStart(2, "0");
		const monthYear = `${month}-${year}`;
		const date = timestamp.toISOString().split("T")[0];
		const dayOfWeek = timestamp.toLocaleString("en-US", { weekday: "long" });

		// Initialize month-year and date structures if they don't exist
		if (!groupedLogs[monthYear]) {
			groupedLogs[monthYear] = {};
		}

		if (!groupedLogs[monthYear][date]) {
			groupedLogs[monthYear][date] = {
				logs: [],
				status: "",
				attendanceDeduction: 0, // For attendance record purposes
				deductionAmount: 0, // Actual monetary deduction in rupees
				deductionRemarks: "",
				workingHours: "0h 0m",
				dayOfWeek,
			};
		}

		// Add the log entry
		groupedLogs[monthYear][date].logs.push({
			time: timestamp,
			inOut,
			mode,
			formattedTime: timestamp.toLocaleTimeString(), // For readability
		});
	});

	// Get the employee's salary for percentage calculations
	const monthlySalary = employee.employment?.salaryAmount || 0;

	console.log(`Processing employee ${employeeId} with salary: ${monthlySalary}`);

	// Second pass - process each day's logs by month-year
	for (const [monthYear, dailyLogs] of Object.entries(groupedLogs)) {
		// Get actual days in this month for accurate daily salary calculation
		const [month, year] = monthYear.split("-").map(Number);
		const daysInMonth = new Date(year, month, 0).getDate();
		const dailySalary = monthlySalary / daysInMonth; // Accurate daily salary

		console.log(`Month ${monthYear} has ${daysInMonth} days, daily salary: ${dailySalary.toFixed(2)}`);

		// Process each date in this month-year
		for (const date of Object.keys(dailyLogs)) {
			processDailyAttendance(date, dailyLogs[date], shift, lateDeductions, dailySalary);
		}

		// Ensure we have a structure to store data for this month-year
		if (!processedAttendance[monthYear]) {
			processedAttendance[monthYear] = {};
		}

		// Store employee's attendance for this month-year
		processedAttendance[monthYear][employeeId] = dailyLogs;
	}
}

/**
 * Process a single day's attendance for an employee
 *
 * @param {string} date - The date (YYYY-MM-DD)
 * @param {Object} dayRecord - The day's attendance record
 * @param {Object} shift - Employee's shift schedule
 * @param {Object} lateDeductions - Late deduction rules
 * @param {number} dailySalary - Employee's daily salary for percentage calculations
 */
function processDailyAttendance(date, dayRecord, shift, lateDeductions, dailySalary) {
	// Sort logs chronologically
	const shifts = dayRecord.logs.sort((a, b) => a.time - b.time);
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

	// Check if shift applies to this day (is in the specified days array)
	const isWorkingDay = shift.days.includes(dayOfWeek);

	// Determine attendance status and calculate deductions
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

		if (!isWorkingDay) {
			status = "Off Day";
			attendanceDeduction = 0;
			deductionAmount = 0;
			deductionRemarks = "Not scheduled to work";
		} else if (shifts.length === 0) {
			status = "Absent";
			attendanceDeduction = 1; // Full day deduction
			deductionAmount = dailySalary; // Full day salary deduction
			deductionRemarks = "Absent - No attendance records";
		} else if (!firstIn || !lastOut) {
			status = "Missing Punch";
			attendanceDeduction = 0.5; // Half day deduction for missing punch
			deductionAmount = dailySalary * 0.5; // Half day salary deduction
			deductionRemarks = "Missing entry or exit record";
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
							// Marked as absent
							status = `Absent (Late ${minutesLate} min)`;
							attendanceDeduction = 1;
							deductionAmount = dailySalary; // Full day salary deduction
							deductionRemarks = `Marked absent - Late by ${minutesLate} minutes (exceeds threshold of ${lateDeductions.absentThreshold} minutes)`;
						} else if (minutesLate >= lateDeductions.halfDayThreshold) {
							// Half day deduction
							status = `Half Day (Late ${minutesLate} min)`;
							attendanceDeduction = 0.5;
							deductionAmount = dailySalary * 0.5; // Half day salary deduction
							deductionRemarks = `Half day deduction - Late by ${minutesLate} minutes (exceeds threshold of ${lateDeductions.halfDayThreshold} minutes)`;
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
							status = `Absent (Early ${minutesEarly} min)`;
							attendanceDeduction = 1;
							deductionAmount = dailySalary; // Full day salary deduction
							deductionRemarks = `Marked absent - Left early by ${minutesEarly} minutes (exceeds threshold of ${lateDeductions.absentThreshold} minutes)`;
						} else if (minutesEarly >= lateDeductions.halfDayThreshold) {
							status = `Half Day (Early ${minutesEarly} min)`;
							attendanceDeduction = 0.5;
							deductionAmount = dailySalary * 0.5; // Half day salary deduction
							deductionRemarks = `Half day deduction - Left early by ${minutesEarly} minutes (exceeds threshold of ${lateDeductions.halfDayThreshold} minutes)`;
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

	// Keep only the formatted logs for storage efficiency
	dayRecord.logs = shifts.map((log) => ({
		time: log.formattedTime,
		inOut: log.inOut,
		mode: log.mode,
	}));
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
