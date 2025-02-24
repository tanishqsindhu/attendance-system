const { parse } = require("csv-parse/sync");
import { checkAttendanceExists, saveAttendanceData } from "../../src/firebase/firebase";

exports.handler = async (event) => {
	if (event.httpMethod !== "POST") {
		return {
			statusCode: 405,
			body: JSON.stringify({ message: "Method Not Allowed" }),
		};
	}

	try {
		const { fileContent, formData, checkOnly } = JSON.parse(event.body);
		// if (!fileContent || !formData?.branchId || !formData?.monthYear) {
		// 	return {
		// 		statusCode: 400,
		// 		body: JSON.stringify({ message: "Missing required data" }),
		// 	};
		// }

		const { branchId, monthYear, forceOverwrite } = formData;

		// ✅ Step 1: Check if attendance data already exists
		const alreadyExists = await checkAttendanceExists(branchId, monthYear);

		if (checkOnly) {
			console.log("in checkOnly");
			return {
				statusCode: alreadyExists ? 409 : 200,
				body: JSON.stringify({
					message: alreadyExists
						? `Attendance data for ${monthYear} already exists.`
						: "No existing attendance data found.",
					monthYear,
				}),
			};
		}

		// ✅ Step 2: Handle overwrite logic
		if (alreadyExists && !forceOverwrite) {
			return {
				statusCode: 409,
				body: JSON.stringify({
					message: `Attendance data for ${monthYear} already exists. Overwrite denied.`,
					monthYear,
				}),
			};
		}

		// ✅ Step 3: Parse biometric text data
		if (!fileContent) {
			return {
				statusCode: 400,
				body: JSON.stringify({ message: "No file content provided" }),
			};
		}

		const records = parse(fileContent, {
			delimiter: "\t",
			columns: true,
			skip_empty_lines: true,
		});

		const attendanceData = {};
		let noOfProcessDate = 0,
			earliestDate = new Date("9999-01-01"),
			endDate = new Date("1999-01-01");

		records.forEach((record) => {
			const employeeId = record.EnNo.trim().replace(/^0+/, "");
			const name = record.Name.trim();
			const mode = record.Mode.trim();
			const inOut = record["In/Out"].trim();
			const dateTime = new Date(record.DateTime.trim());

			if (earliestDate > dateTime) earliestDate = dateTime;
			if (endDate < dateTime) endDate = dateTime;

			if (!attendanceData[employeeId]) {
				attendanceData[employeeId] = { name, logs: [] };
			}
			attendanceData[employeeId].logs.push({ mode, inOut, dateTime });
			noOfProcessDate++;
		});
		const dateTimeNow = new Date();
		attendanceData.rawData = `${fileContent}`;
		attendanceData.uploadDate = dateTimeNow;

		// ✅ Step 4: Save to Firestore using utility function
		await saveAttendanceData(branchId, monthYear, attendanceData, forceOverwrite);

		return {
			statusCode: 200,
			body: JSON.stringify({
				message: "Attendance processed and stored in Firestore",
				data: { noOfProcessDate, earliestDate, endDate },
			}),
		};
	} catch (error) {
		console.error("❌ Error processing attendance:", error);
		return {
			statusCode: 500,
			body: JSON.stringify({ message: "Error processing file", error: error.message }),
		};
	}
};
