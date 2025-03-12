const { getAttendanceLogs, getEmployees, OrganizationSettingsService, saveProcessedAttendance } = require("@/firebase/index");

/**
 * Serverless function to assign attendance data from raw logs to employees
 * Formats all available logs and organizes them by employee and date
 */
exports.handler = async (event) => {
	// Validate HTTP method
	if (event.httpMethod !== "POST") {
		return { statusCode: 405, body: JSON.stringify({ message: "Method Not Allowed" }) };
	}

	try {
		const { branchId, monthYear } = JSON.parse(event.body);

		// Validate required inputs
		if (!branchId) {
			return {
				statusCode: 400,
				body: JSON.stringify({
					message: "Missing required data. branchId is required.",
				}),
			};
		}

		console.log(`Assigning attendance for branch: ${branchId}`);

		// Fetch all attendance logs, employees, and settings in parallel
		const [allAttendanceLogs, employees, settings] = await Promise.all([getAttendanceLogs(branchId, monthYear), getEmployees(branchId), OrganizationSettingsService.getSettings()]);

		// Extract shift schedules
		const { shiftSchedules } = settings;

		// Validate data existence
		if (!allAttendanceLogs || Object.keys(allAttendanceLogs).length === 0) {
			return {
				statusCode: 404,
				body: JSON.stringify({ message: "No attendance logs found" }),
			};
		}

		if (!employees || Object.keys(employees).length === 0) {
			return {
				statusCode: 404,
				body: JSON.stringify({ message: "No employees found in this branch" }),
			};
		}

		console.log(`Found attendance records for ${Object.keys(allAttendanceLogs).length} month(s) and ${Object.keys(employees).length} employees`);

		// Group logs by month-year for processing
		const logsByMonthYear = groupLogsByMonthYear(allAttendanceLogs);

		// Process each month's attendance
		const processedMonths = [];
		for (const [currentMonthYear, monthLogs] of Object.entries(logsByMonthYear)) {
			const [month, year] = currentMonthYear.split("-").map(Number);

			// Calculate all dates in the month for complete attendance processing
			const daysInMonth = new Date(year, month, 0).getDate();
			const allDatesInMonth = [];
			for (let day = 1; day <= daysInMonth; day++) {
				const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
				allDatesInMonth.push(date);
			}

			// Initialize formatted attendance object for this month
			const formattedAttendance = {};

			// Iterate through each employee
			for (const [employeeId, employee] of Object.entries(employees)) {
				// Get employee shift details
				const shiftId = employee.employment?.shiftId;
				const shift = shiftSchedules.find((s) => s.id === shiftId);

				if (!shift) {
					console.log(`Skipping employee ${employeeId} - shift not found`);
					continue;
				}

				// Get employee's attendance logs for this month
				const employeeLogs = monthLogs[employeeId] || { logs: [] };

				// Format attendance for all days in the month
				formattedAttendance[employeeId] = formatEmployeeAttendance(employeeId, employeeLogs, shift, allDatesInMonth);
			}
			console.log(formattedAttendance);
			// Store formatted attendance in Firestore for this month
			await saveProcessedAttendance(branchId, currentMonthYear, formattedAttendance);
			processedMonths.push(currentMonthYear);

			console.log(`Processed and saved attendance for ${currentMonthYear}`);
		}

		// Return success response with summary
		return {
			statusCode: 200,
			body: JSON.stringify({
				message: "Attendance assigned and formatted successfully for all available logs",
				summary: {
					monthsProcessed: processedMonths.length,
					monthsList: processedMonths,
					totalEmployees: Object.keys(employees).length,
				},
			}),
		};
	} catch (error) {
		console.error("Error assigning attendance:", error);
		return {
			statusCode: 500,
			body: JSON.stringify({
				message: "Error assigning attendance",
				error: error.message,
				stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
			}),
		};
	}
};

/**
 * Get all attendance logs for a branch
 *
 * @param {string} branchId - The branch ID
 * @returns {Object} - All attendance logs organized by month
 */
async function getAllAttendanceLogs(branchId) {
	// This function would need to be implemented in your Firebase module
	// It should fetch all attendance logs for the branch across all months

	// This is a placeholder. You'll need to implement the actual function in your Firebase module
	return await getAttendanceLogs(branchId);
}

/**
 * Group logs by month-year
 *
 * @param {Object} allLogs - All attendance logs
 * @returns {Object} - Logs grouped by month-year
 */
function groupLogsByMonthYear(allLogs) {
	const logsByMonthYear = {};

	// Process each employee's logs
	for (const [employeeId, employeeLogs] of Object.entries(allLogs)) {
		if (employeeLogs.logs && Array.isArray(employeeLogs.logs)) {
			employeeLogs.logs.forEach((log) => {
				// Convert Firestore timestamp to JavaScript Date
				const timestamp = log.dateTime.seconds ? new Date(log.dateTime.seconds * 1000) : new Date(log.dateTime);
				const date = timestamp.toISOString().split("T")[0];
				const [year, month] = date.split("-");
				const monthYear = `${month}-${year}`;

				// Initialize month-year entry if it doesn't exist
				if (!logsByMonthYear[monthYear]) {
					logsByMonthYear[monthYear] = {};
				}

				// Initialize employee entry if it doesn't exist
				if (!logsByMonthYear[monthYear][employeeId]) {
					logsByMonthYear[monthYear][employeeId] = { logs: [] };
				}

				// Add log to employee's logs for this month
				logsByMonthYear[monthYear][employeeId].logs.push(log);
			});
		}
	}

	return logsByMonthYear;
}

/**
 * Format an employee's attendance for the entire month
 *
 * @param {string} employeeId - The employee ID
 * @param {Object} employeeLogs - The employee's attendance logs
 * @param {Object} shift - Employee's shift schedule
 * @param {Array} allDates - All dates in the month to process
 * @returns {Object} - Formatted attendance data by date
 */
function formatEmployeeAttendance(employeeId, employeeLogs, shift, allDates) {
	console.log(`Formatting attendance for employee ${employeeId}`);

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

	// Format for each date in the month
	const formattedDates = {};

	// Process each date in the month
	for (const date of allDates) {
		const dayOfWeek = new Date(date).toLocaleString("en-IN", { weekday: "long" });
		const logs = logsByDate[date] || [];

		// Sort logs chronologically
		const sortedLogs = logs.sort((a, b) => a.time - b.time);

		// Get the appropriate shift times for this day
		const { startTime, endTime } = getShiftTimesForDay(date, dayOfWeek, shift);

		// Initialize variables for calculations
		let firstIn = null;
		let lastOut = null;
		let totalWorkMinutes = 0;

		// Find first in and last out times
		sortedLogs.forEach((log) => {
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
		}

		// Format working hours
		const hours = Math.floor(totalWorkMinutes / 60);
		const minutes = Math.round(totalWorkMinutes % 60);
		const workingHours = `${hours}h ${minutes}m`;

		// Create the formatted record
		formattedDates[date] = {
			logs: sortedLogs.map((log) => ({
				time: log.formattedTime,
				inOut: log.inOut,
				mode: log.mode,
			})),
			firstIn: firstIn ? firstIn.toLocaleTimeString() : null,
			lastOut: lastOut ? lastOut.toLocaleTimeString() : null,
			workingHours,
			dayOfWeek,
			shiftStart: startTime,
			shiftEnd: endTime,
			isWorkDay: shift.days.includes(dayOfWeek),
		};
	}

	return formattedDates;
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
