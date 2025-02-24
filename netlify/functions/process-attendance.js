const {
	getAttendanceLogs,
	getEmployees,
	saveProcessedAttendance,
} = require("../../src/firebase/firebase");

exports.handler = async (event) => {
	if (event.httpMethod !== "POST") {
		return { statusCode: 405, body: JSON.stringify({ message: "Method Not Allowed" }) };
	}

	try {
		const { branchId, monthYear } = JSON.parse(event.body);
		if (!branchId || !monthYear) {
			return { statusCode: 400, body: JSON.stringify({ message: "Missing required data" }) };
		}

		// Fetch attendance logs & employees
		const [attendanceLogs, employees] = await Promise.all([
			getAttendanceLogs(branchId, monthYear),
			getEmployees(branchId),
		]);
		if (!attendanceLogs || Object.keys(attendanceLogs).length === 0) {
			return { statusCode: 404, body: JSON.stringify({ message: "No attendance logs found" }) };
		}
		if (!employees || Object.keys(employees).length === 0) {
			return { statusCode: 404, body: JSON.stringify({ message: "No employees found" }) };
		}

		// Process attendance grouped by month-year
		const processedAttendance = {};

		for (const [employeeId, logs] of Object.entries(attendanceLogs)) {
			if (!employees[employeeId]) continue;

			const { shiftStart, shiftEnd } = employees[employeeId];

			// Group logs by month-year derived from `dateTime`
			const monthlyAttendance = {};
            
			logs.logs.forEach(({ dateTime, mode, inOut }) => {
				const timestamp = new Date(dateTime.seconds * 1000);
				const monthYear = `${String(timestamp.getMonth() + 1).padStart(
					2,
					"0"
				)}-${timestamp.getFullYear()}`;
				const date = timestamp.toISOString().split("T")[0];

				if (!monthlyAttendance[monthYear]) {
					monthlyAttendance[monthYear] = {};
				}
				if (!monthlyAttendance[monthYear][date]) {
					monthlyAttendance[monthYear][date] = {
						logs: [],
						status: "",
						deduction: 0,
						workingHours: "0h 0m",
					};
				}

				// Store logs under correct month-year and date
				monthlyAttendance[monthYear][date].logs.push({ time: timestamp, inOut, mode });
			});

			// Process attendance for each month-year
			for (const [monthYear, dailyLogs] of Object.entries(monthlyAttendance)) {
				Object.keys(dailyLogs).forEach((date) => {
					const shifts = dailyLogs[date].logs.sort((a, b) => a.time - b.time);
					let totalWorkMinutes = 0;
					let firstIn = null,
						lastOut = null;
					let status = "On Time";

					shifts.forEach((log) => {
						if (log.inOut === "DutyOn") firstIn = log.time;
						if (log.inOut === "DutyOff") lastOut = log.time;

						// Calculate working hours
						if (firstIn && lastOut) {
							const workMinutes = (lastOut - firstIn) / (1000 * 60);
							totalWorkMinutes += workMinutes;
							firstIn = null;
						}
					});

					const workingHours = `${Math.floor(totalWorkMinutes / 60)}h ${totalWorkMinutes % 60}m`;

					// Determine status
					const shiftStartTime = new Date(`${date}T${shiftStart}:00`);
					const shiftEndTime = new Date(`${date}T${shiftEnd}:00`);

					if (shifts.length === 0) {
						status = "Absent";
					} else if (!firstIn || !lastOut) {
						status = "Missing Value";
					} else {
						if (firstIn > shiftStartTime) status = "Late In";
						if (lastOut < shiftEndTime) status = "Early Out";
					}

					dailyLogs[date] = {
						logs: shifts,
						status,
						workingHours,
						deduction: status !== "On Time" ? 1 : 0,
					};
				});

				// Save processed attendance under correct month-year
				if (!processedAttendance[monthYear]) {
					processedAttendance[monthYear] = {};
				}
				processedAttendance[monthYear][employeeId] = dailyLogs;
			}
		}

		// Store processed attendance in Firestore
		for (const [monthYear, data] of Object.entries(processedAttendance)) {
			await saveProcessedAttendance(branchId, monthYear, data);
		}

		return {
			statusCode: 200,
			body: JSON.stringify({ message: "Attendance processed successfully" }),
		};
	} catch (error) {
		console.error(error);
		return {
			statusCode: 500,
			body: JSON.stringify({ message: "Error processing attendance", error: error.message }),
		};
	}
};
