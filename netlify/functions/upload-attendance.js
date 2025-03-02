const { parse } = require("csv-parse/sync");
const { checkAttendanceExists, saveAttendanceData } = require("../../src/firebase/firebase");

/**
 * Netlify function to handle attendance data uploads
 * Supports both checking for existing data and saving new attendance records
 */
exports.handler = async (event) => {
	// Validate HTTP method
	if (event.httpMethod !== "POST") {
		return {
			statusCode: 405,
			body: JSON.stringify({ message: "Method Not Allowed" }),
			headers: { "Content-Type": "application/json" },
		};
	}

	try {
		const { fileContent, formData, checkOnly } = JSON.parse(event.body);

		// Validate required data
		if (!formData?.branchId || !formData?.monthYear) {
			return {
				statusCode: 400,
				body: JSON.stringify({ message: "Missing required data: branch ID or month/year" }),
				headers: { "Content-Type": "application/json" },
			};
		}

		const { branchId, monthYear, forceOverwrite } = formData;

		// Step 1: Check if attendance data already exists
		const alreadyExists = await checkAttendanceExists(branchId, monthYear);

		// Handle check-only mode (used for pre-validation)
		if (checkOnly) {
			return {
				statusCode: alreadyExists ? 409 : 200,
				body: JSON.stringify({
					message: alreadyExists
						? `Attendance data for ${monthYear} already exists.`
						: "No existing attendance data found.",
					exists: alreadyExists,
					monthYear,
				}),
				headers: { "Content-Type": "application/json" },
			};
		}

		// Step 2: Handle overwrite protection
		if (alreadyExists && !forceOverwrite) {
			return {
				statusCode: 409,
				body: JSON.stringify({
					message: `Attendance data for ${monthYear} already exists. Overwrite denied.`,
					monthYear,
				}),
				headers: { "Content-Type": "application/json" },
			};
		}

		// Step 3: Validate and parse file content
		if (!fileContent) {
			return {
				statusCode: 400,
				body: JSON.stringify({ message: "No file content provided" }),
				headers: { "Content-Type": "application/json" },
			};
		}

		// Parse and process attendance data
		const processedData = processAttendanceData(fileContent);

		// Step 4: Save to Firestore
		await saveAttendanceData(branchId, monthYear, processedData.attendanceData, forceOverwrite);

		return {
			statusCode: 200,
			body: JSON.stringify({
				message: "Attendance processed and stored successfully",
				data: processedData.stats,
			}),
			headers: { "Content-Type": "application/json" },
		};
	} catch (error) {
		console.error("Error processing attendance:", error);

		// Return appropriate error based on type
		const statusCode = error.name === "SyntaxError" ? 400 : 500;
		const errorMessage =
			error.name === "SyntaxError"
				? "Invalid file format. Please check your file and try again."
				: "Server error processing attendance data";

		return {
			statusCode,
			body: JSON.stringify({
				message: errorMessage,
				error: error.message,
			}),
			headers: { "Content-Type": "application/json" },
		};
	}
};

/**
 * Process attendance data from file content
 * @param {string} fileContent - Raw file content to parse
 * @returns {Object} Processed attendance data and stats
 */
function processAttendanceData(fileContent) {
	// Parse the CSV/TSV data
	const records = parse(fileContent, {
		delimiter: "\t",
		columns: true,
		skip_empty_lines: true,
		trim: true,
	});

	const attendanceData = {};
	const stats = {
		recordCount: records.length,
		employeeCount: 0,
		earliestDate: new Date("9999-12-31"),
		latestDate: new Date("1970-01-01"),
	};

	// Process each record
	records.forEach((record) => {
		// Normalize employee ID (remove leading zeros)
		const employeeId = record.EnNo.trim().replace(/^0+/, "");
		const name = record.Name.trim();
		const mode = record.Mode.trim();
		const inOut = record["In/Out"].trim();

		// Parse date with error handling
		const dateTime = new Date(record.DateTime.trim());

		// Skip invalid dates
		if (isNaN(dateTime.getTime())) {
			return;
		}

		// Update date range statistics
		if (dateTime < stats.earliestDate) stats.earliestDate = new Date(dateTime);
		if (dateTime > stats.latestDate) stats.latestDate = new Date(dateTime);

		// Initialize employee record if not exists
		if (!attendanceData[employeeId]) {
			attendanceData[employeeId] = {
				name,
				logs: [],
			};
			stats.employeeCount++;
		}

		// Add log entry
		attendanceData[employeeId].logs.push({
			mode,
			inOut,
			dateTime: dateTime.toISOString(),
		});
	});

	// Add metadata
	attendanceData.metadata = {
		rawData: fileContent,
		uploadDate: new Date().toISOString(),
		processedRecords: stats.recordCount,
		employeeCount: stats.employeeCount,
		dateRange: {
			start: stats.earliestDate.toISOString(),
			end: stats.latestDate.toISOString(),
		},
	};

	return {
		attendanceData,
		stats: {
			recordCount: stats.recordCount,
			employeeCount: stats.employeeCount,
			dateRange: {
				start: stats.earliestDate.toISOString(),
				end: stats.latestDate.toISOString(),
			},
		},
	};
}
