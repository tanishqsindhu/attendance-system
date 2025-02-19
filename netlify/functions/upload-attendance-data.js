const { parse } = require("csv-parse/sync");
const { db, collection, doc, setDoc } = require("../../src/firebase/firebase");

// Employee-specific shift rules (No overtime here, just work hours)
const employeeConfigs = {
	1: { shiftStart: "09:00", shiftEnd: "17:00", latePenalty: 10 },
	2: { shiftStart: "10:00", shiftEnd: "18:00", latePenalty: 5 },
	3: { shiftStart: "9:00", shiftEnd: "18:00", latePenalty: 5 },
};

exports.handler = async (event) => {
	if (event.httpMethod !== "POST") {
		return {
			statusCode: 405,
			body: JSON.stringify({ message: "Method Not Allowed" }),
		};
	}

	try {
		const { fileContent, branchId } = JSON.parse(event.body);
		if (!fileContent || !branchId) {
			return {
				statusCode: 400,
				body: JSON.stringify({ message: "No file content provided" }),
			};
		}

		// Convert records to structured data
		const attendanceData = {};
		attendanceData.rawData = `${fileContent}`;

		// Parse the biometric text data
		const records = parse(fileContent, {
			delimiter: "\t",
			columns: true,
			skip_empty_lines: true,
		});
		let noOfProcessDate = 0,
			earliestDate = new Date("9999-01-01"),
			endDate = new Date("1999-01-01");
		records.forEach((record) => {
			const employeeId = record.EnNo.trim().replace(/^0+/, ""); // Remove leading zeroes
			const name = record.Name.trim();
			const mode = record.Mode.trim();
			const inOut = record["In/Out"].trim();
			const dateTime = new Date(record.DateTime.trim());

			if (earliestDate > dateTime) {
				earliestDate = dateTime;
			}
			if (endDate < dateTime) {
				endDate = dateTime;
			}
			if (!attendanceData[employeeId]) {
				attendanceData[employeeId] = { name, logs: [] };
			}

			// Store the mode along with inOut and dateTime
			attendanceData[employeeId].logs.push({ mode, inOut, dateTime });
			noOfProcessDate++;
		});
		attendanceData.date = new Date();
		// console.log(attendanceData[55]);
		// Now, store the attendance logs in Firestore
		// const attendanceCollection = collection(db, "attendance");

		// for (const [employeeId, data] of Object.entries(attendanceData)) {
		// 	const employeeRef = doc(attendanceCollection, employeeId); // Use employee ID as document ID

		// 	// Sort logs by date/time
		// 	data.logs.sort((a, b) => a.dateTime - b.dateTime);

		// 	// Group logs by date
		// 	const dailyLogs = {};

		// 	data.logs.forEach((log) => {
		// 		const date = log.dateTime.toISOString().split("T")[0]; // Use the date (YYYY-MM-DD)
		// 		if (!dailyLogs[date]) {
		// 			dailyLogs[date] = { checkInTimes: [], checkOutTimes: [], totalWorkHours: 0 };
		// 		}

		// 		if (log.inOut === "In") {
		// 			dailyLogs[date].checkInTimes.push(log.dateTime);
		// 		} else if (log.inOut === "Out") {
		// 			dailyLogs[date].checkOutTimes.push(log.dateTime);
		// 		}
		// 	});

		// 	// Calculate total work hours for each day
		// 	for (const [date, logs] of Object.entries(dailyLogs)) {
		// 		const { checkInTimes, checkOutTimes } = logs;

		// 		let totalWorkHours = 0;
		// 		for (let i = 0; i < checkInTimes.length && i < checkOutTimes.length; i++) {
		// 			const inTime = checkInTimes[i];
		// 			const outTime = checkOutTimes[i];

		// 			// Calculate work hours for each pair of check-in and check-out
		// 			if (inTime && outTime) {
		// 				const workHours = (outTime - inTime) / (1000 * 60 * 60); // Convert to hours
		// 				totalWorkHours += workHours;
		// 			}
		// 		}

		// 		// Store the total hours worked in Firestore
		// 		const attendanceRef = doc(employeeRef, date); // Store attendance by date
		// 		await setDoc(
		// 			attendanceRef,
		// 			{
		// 				checkInTimes: checkInTimes.map((time) => time.toISOString()),
		// 				checkOutTimes: checkOutTimes.map((time) => time.toISOString()),
		// 				totalWorkHours: totalWorkHours,
		// 				status: "Present", // Default status is "Present"
		// 			},
		// 			{ merge: true }
		// 		);
		// 	}
		// }

		return {
			statusCode: 200,
			body: JSON.stringify({
				message: "Attendance processed and stored in Firestore",
				data: {
					noOfProcessDate,
					earliestDate,
					endDate,
				},
			}),
		};
	} catch (error) {
		console.log(error);
		return {
			statusCode: 500,
			body: JSON.stringify({ message: "Error processing file", error: error.message }),
		};
	}
};
