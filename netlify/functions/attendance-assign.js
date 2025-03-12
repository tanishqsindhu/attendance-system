const { saveAttendanceLogs, getEmployees, OrganizationSettingsService } = require("@/firebase/index");

/**
 * Serverless function to read raw attendance logs and assign them to employees
 * This function handles the initial data collection from attendance machines
 */
exports.handler = async (event) => {
	// Validate HTTP method
	if (event.httpMethod !== "POST") {
		return { statusCode: 405, body: JSON.stringify({ message: "Method Not Allowed" }) };
	}

	try {
		const { branchId, rawLogs, monthYear } = JSON.parse(event.body);

		// Validate required inputs
		if (!branchId || !rawLogs || !monthYear) {
			return {
				statusCode: 400,
				body: JSON.stringify({
					message: "Missing required data. branchId, rawLogs, and monthYear are required.",
				}),
			};
		}

		console.log(`Processing raw logs for branch: ${branchId}, month-year: ${monthYear}`);

		// Fetch employees and settings in parallel
		const [employees, settings] = await Promise.all([getEmployees(branchId), OrganizationSettingsService.getSettings()]);

		// Validate employees data existence
		if (!employees || Object.keys(employees).length === 0) {
			return {
				statusCode: 404,
				body: JSON.stringify({ message: "No employees found in this branch" }),
			};
		}

		console.log(`Found ${Object.keys(employees).length} employees`);

		// Create a map of employee IDs to biometric IDs for quick lookup
		const biometricToEmployeeMap = {};
		Object.entries(employees).forEach(([employeeId, employee]) => {
			const biometricId = employee.biometricId || employee.cardId;
			if (biometricId) {
				biometricToEmployeeMap[biometricId] = employeeId;
			}
		});

		// Parse and assign raw logs to employees
		const employeeAttendanceLogs = {};

		// Process each raw log entry
		rawLogs.forEach((logEntry) => {
			const { biometricId, cardId, timestamp, eventType, deviceId } = logEntry;
			const identifier = biometricId || cardId;

			if (!identifier) {
				console.log(`Skipping log entry without biometric or card ID: ${JSON.stringify(logEntry)}`);
				return;
			}

			const employeeId = biometricToEmployeeMap[identifier];

			if (!employeeId) {
				console.log(`No employee found for biometric/card ID: ${identifier}`);
				return;
			}

			// Convert timestamp string to Firestore timestamp
			let dateTime;
			try {
				dateTime = new Date(timestamp);
				if (isNaN(dateTime.getTime())) {
					throw new Error("Invalid timestamp");
				}
			} catch (error) {
				console.error(`Invalid timestamp format: ${timestamp}`);
				return;
			}

			// Determine in/out status based on event type
			let inOut = "DutyOn"; // Default
			if (eventType === "exit" || eventType === "out" || eventType === "clockout") {
				inOut = "DutyOff";
			}

			// Initialize employee log structure if not exists
			if (!employeeAttendanceLogs[employeeId]) {
				employeeAttendanceLogs[employeeId] = {
					employeeId,
					logs: [],
				};
			}

			// Add the log entry
			employeeAttendanceLogs[employeeId].logs.push({
				dateTime,
				inOut,
				mode: "Biometric", // Default mode - can be customized based on device type
				deviceId: deviceId || "unknown",
			});
		});

		// Save organized logs to Firestore
		await saveAttendanceLogs(branchId, monthYear, employeeAttendanceLogs);

		// Return success response with summary
		return {
			statusCode: 200,
			body: JSON.stringify({
				message: "Attendance logs processed and saved successfully",
				summary: {
					totalLogs: rawLogs.length,
					employeesProcessed: Object.keys(employeeAttendanceLogs).length,
				},
			}),
		};
	} catch (error) {
		console.error("Error processing attendance logs:", error);
		return {
			statusCode: 500,
			body: JSON.stringify({
				message: "Error processing attendance logs",
				error: error.message,
				stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
			}),
		};
	}
};
