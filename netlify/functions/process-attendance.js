const { getAttendanceLogs, getEmployees, saveProcessedAttendance, OrganizationSettingsService } = require("@/firebase/index");

/**
 * Serverless function to process attendance data from raw logs
 * Automatically detects and processes data by month-year from timestamps
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

		// Fetch attendance logs & employees in parallel
		const [attendanceLogs, employees] = await Promise.all([getAttendanceLogs(branchId, monthYear), getEmployees(branchId)]);

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

		// Fetch shift schedules from organization settings
		const { shiftSchedules } = await OrganizationSettingsService.getSettings();

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

			const { startTime: shiftStart, endTime: shiftEnd } = shift;

			// Process each employee's attendance logs
			processEmployeeLogs(employeeId, logs, shiftStart, shiftEnd, processedAttendance);
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
 * @param {string} shiftStart - Employee's shift start time (HH:MM)
 * @param {string} shiftEnd - Employee's shift end time (HH:MM)
 * @param {Object} processedAttendance - Output object to store processed data
 */
function processEmployeeLogs(employeeId, logs, shiftStart, shiftEnd, processedAttendance) {
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

		// Initialize month-year and date structures if they don't exist
		if (!groupedLogs[monthYear]) {
			groupedLogs[monthYear] = {};
		}

		if (!groupedLogs[monthYear][date]) {
			groupedLogs[monthYear][date] = {
				logs: [],
				status: "",
				deduction: 0,
				workingHours: "0h 0m",
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

	// Second pass - process each day's logs by month-year
	for (const [monthYear, dailyLogs] of Object.entries(groupedLogs)) {
		// Process each date in this month-year
		for (const date of Object.keys(dailyLogs)) {
			processDailyAttendance(date, dailyLogs[date], shiftStart, shiftEnd);
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
 * @param {string} shiftStart - Employee's shift start time (HH:MM)
 * @param {string} shiftEnd - Employee's shift end time (HH:MM)
 */
function processDailyAttendance(date, dayRecord, shiftStart, shiftEnd) {
	// Sort logs chronologically
	const shifts = dayRecord.logs.sort((a, b) => a.time - b.time);

	// Initialize variables for calculations
	let totalWorkMinutes = 0;
	let firstIn = null;
	let lastOut = null;
	let status = "On Time";

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

	// Determine attendance status
	try {
		// Create Date objects for shift times
		const shiftStartTime = new Date(`${date}T${shiftStart}:00`);
		const shiftEndTime = new Date(`${date}T${shiftEnd}:00`);

		if (shifts.length === 0) {
			status = "Absent";
		} else if (!firstIn || !lastOut) {
			status = "Missing Punch";
		} else {
			// Check for late arrival or early departure
			if (firstIn > shiftStartTime) {
				const minutesLate = Math.round((firstIn - shiftStartTime) / (1000 * 60));
				status = `Late In (${minutesLate} min)`;
			}

			if (lastOut < shiftEndTime) {
				const minutesEarly = Math.round((shiftEndTime - lastOut) / (1000 * 60));
				// If already late, add early out info
				if (status !== "On Time") {
					status += ` + Early Out (${minutesEarly} min)`;
				} else {
					status = `Early Out (${minutesEarly} min)`;
				}
			}
		}
	} catch (error) {
		console.error(`Error processing attendance status for ${date}:`, error);
		status = "Error Processing";
	}

	// Update the day's record
	dayRecord.status = status;
	dayRecord.deduction = status === "On Time" ? 0 : 1;
	dayRecord.firstIn = firstIn ? firstIn.toLocaleTimeString() : null;
	dayRecord.lastOut = lastOut ? lastOut.toLocaleTimeString() : null;

	// Keep only the formatted logs for storage efficiency
	dayRecord.logs = shifts.map((log) => ({
		time: log.formattedTime,
		inOut: log.inOut,
		mode: log.mode,
	}));
}
