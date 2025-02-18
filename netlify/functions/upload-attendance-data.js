const { parse } = require("csv-parse/sync");
const fs = require("fs");

// Employee-specific shift and payroll rules (this would ideally come from a database)
const employeeConfigs = {
	"00000001": { shiftStart: "09:00", shiftEnd: "17:00", overtimeRate: 1.5, latePenalty: 10 },
	"00000002": { shiftStart: "10:00", shiftEnd: "18:00", overtimeRate: 1.2, latePenalty: 5 },
};

exports.handler = async (event) => {
	if (event.httpMethod !== "POST") {
		return {
			statusCode: 405,
			body: JSON.stringify({ message: "Method Not Allowed" }),
		};
	}

	try {
		const { fileContent } = JSON.parse(event.body);
		if (!fileContent) {
			return {
				statusCode: 400,
				body: JSON.stringify({ message: "No file content provided" }),
			};
		}

		// Parse the biometric text data
		const records = parse(fileContent, {
			delimiter: "\t",
			columns: true,
			skip_empty_lines: true,
		});

		// Convert records to structured data
		const attendanceData = {};

		records.forEach((record) => {
			const employeeId = record.EnNo.trim();
			const name = record.Name.trim();
			const mode = record.Mode.trim();
			const inOut = record["In/Out"].trim();
			const dateTime = new Date(record.DateTime.trim());

			if (!attendanceData[employeeId]) {
				attendanceData[employeeId] = { name, logs: [] };
			}

			attendanceData[employeeId].logs.push({ mode, inOut, dateTime });
		});

		// Calculate payroll details
		const payrollData = Object.entries(attendanceData).map(([employeeId, data]) => {
			const config = employeeConfigs[employeeId] || {};
			const shiftStart = config.shiftStart ? new Date(`1970-01-01T${config.shiftStart}:00Z`) : null;
			const shiftEnd = config.shiftEnd ? new Date(`1970-01-01T${config.shiftEnd}:00Z`) : null;
			const overtimeRate = config.overtimeRate || 1.0;
			const latePenalty = config.latePenalty || 0;

			let totalWorkHours = 0;
			let overtimeHours = 0;
			let lateDeductions = 0;

			data.logs.sort((a, b) => a.dateTime - b.dateTime);
			for (let i = 0; i < data.logs.length - 1; i += 2) {
				const inTime = data.logs[i].dateTime;
				const outTime = data.logs[i + 1] ? data.logs[i + 1].dateTime : null;
				if (inTime && outTime) {
					const workHours = (outTime - inTime) / (1000 * 60 * 60);
					totalWorkHours += workHours;

					if (shiftEnd && outTime > shiftEnd) {
						overtimeHours += (outTime - shiftEnd) / (1000 * 60 * 60);
					}
					if (shiftStart && inTime > shiftStart) {
						lateDeductions += latePenalty;
					}
				}
			}

			return {
				employeeId,
				name: data.name,
				totalWorkHours,
				overtimeHours,
				lateDeductions,
				finalPay: totalWorkHours + overtimeHours * overtimeRate - lateDeductions,
			};
		});
console.log(payrollData)
		return {
			statusCode: 200,
			body: JSON.stringify({ message: "Payroll processed", data: payrollData }),
		};
	} catch (error) {
		return {
			statusCode: 500,
			body: JSON.stringify({ message: "Error processing file", error: error.message }),
		};
	}
};
