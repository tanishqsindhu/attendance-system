import { db } from "./firebase-config";
import { documentExists, logError, timeStringToMinutes } from "./firebase-utils";
import { doc, getDoc, setDoc, collection, writeBatch, query, getDocs } from "firebase/firestore";

/**
 * Check if attendance data exists for a branch and month
 * @param {string} branchId - Branch ID
 * @param {string} yearMonth - Year and month in format YYYY-MM
 * @returns {Promise<boolean>} - Whether attendance data exists
 */
export const checkAttendanceExists = async (branchId, yearMonth) => {
	if (!branchId || !yearMonth) {
		throw new Error("branchId and yearMonth are required");
	}

	try {
		const attendanceRef = doc(db, "branches", branchId, "attendanceLogs", yearMonth);
		return await documentExists(attendanceRef);
	} catch (error) {
		logError("checkAttendanceExists", error);
		return false;
	}
};

/**
 * Save attendance data with optional overwrite
 * @param {string} branchId - Branch ID
 * @param {string} yearMonth - Year and month in format YYYY-MM
 * @param {Object} attendanceData - Attendance data to save
 * @param {boolean} forceOverwrite - Whether to overwrite existing data
 * @returns {Promise<boolean>} - Whether the operation succeeded
 */
export const saveAttendanceData = async (branchId, yearMonth, attendanceData, forceOverwrite = false) => {
	if (!branchId || !yearMonth || !attendanceData) {
		throw new Error("branchId, yearMonth, and attendanceData are required");
	}

	try {
		const attendanceRef = doc(db, "branches", branchId, "attendanceLogs", yearMonth);
		const exists = await documentExists(attendanceRef);

		if (exists && !forceOverwrite) {
			throw new Error(`Attendance data for ${yearMonth} already exists.`);
		}

		let newRecords = attendanceData;
		if (exists && forceOverwrite) {
			const existingData = (await getDoc(attendanceRef)).data() || {};
			newRecords = { ...existingData, ...attendanceData };
		}

		await setDoc(attendanceRef, newRecords);
		console.log(`✅ Attendance for ${yearMonth} saved successfully.`);
		return true;
	} catch (error) {
		logError("saveAttendanceData", error);
		return false;
	}
};

/**
 * Fetch attendance logs for a branch and month-year
 * @param {string} branchId - Branch ID
 * @param {string} monthYear - Month and year in format YYYY-MM
 * @returns {Promise<Object|null>} - Attendance logs or null if none exist
 */
export const getAttendanceLogs = async (branchId, monthYear) => {
	if (!branchId || !monthYear) {
		throw new Error("branchId and monthYear are required");
	}

	try {
		const docRef = doc(db, `branches/${branchId}/attendanceLogs/${monthYear}`);
		const docSnap = await getDoc(docRef);
		return docSnap.exists() ? docSnap.data() : null;
	} catch (error) {
		logError("getAttendanceLogs", error);
		return null;
	}
};

/**
 * Save processed attendance for each employee
 * @param {string} branchId - Branch ID
 * @param {string} monthYear - Month and year in format MM-YYYY
 * @param {Object} processedAttendance - Map of employee IDs to attendance data
 * @returns {Promise<boolean>} - Whether the operation succeeded
 */
export const saveProcessedAttendance = async (branchId, monthYear, processedAttendance) => {
	if (!branchId || !monthYear || !processedAttendance) {
		throw new Error("branchId, monthYear, and processedAttendance are required");
	}

	try {
		const batch = writeBatch(db);
		const employeeIds = Object.keys(processedAttendance);

		// Get all employee docs in a single batch
		const employeeDocs = await Promise.all(
			employeeIds.map(async (employeeId) => {
				const ref = doc(db, `branches/${branchId}/employees/${employeeId}`);
				return { ref, data: (await getDoc(ref)).data() || {} };
			})
		);

		// Update all employees in a batch
		employeeDocs.forEach(({ ref, data }) => {
			const employeeId = ref.id;
			const attendance = data.attendance || {};
			attendance[monthYear] = processedAttendance[employeeId];

			batch.set(ref, { attendance }, { merge: true });
		});

		await batch.commit();
		console.log("✅ Attendance saved successfully for all employees.");
		return true;
	} catch (error) {
		logError("saveProcessedAttendance", error);
		return false;
	}
};

/**
 * Add multiple documents in a batch
 * @param {string} collectionKey - Collection to add documents to
 * @param {Array} objectsToAdd - Array of objects to add as documents
 * @returns {Promise<void>}
 */
export const addCollectionAndDocuments = async (collectionKey, objectsToAdd) => {
	if (!Array.isArray(objectsToAdd) || objectsToAdd.length === 0) {
		console.warn("No objects provided to add to collection");
		return;
	}

	try {
		const collectionRef = collection(db, collectionKey);
		const batch = writeBatch(db);

		objectsToAdd.forEach((object) => {
			if (!object.date) {
				throw new Error("Each object must have a date property");
			}
			const docRef = doc(collectionRef, object.date.toString());
			batch.set(docRef, object);
		});

		await batch.commit();
		console.log(`✅ Added ${objectsToAdd.length} documents to ${collectionKey}`);
	} catch (error) {
		logError("addCollectionAndDocuments", error);
	}
};

/**
 * Fetch available attendance log periods for a branch
 * @param {string} branchId - Branch ID
 * @returns {Promise<Array<{year: string, months: string[]}>>} - Available attendance log periods grouped by year
 */
export const getAvailableAttendancePeriods = async (branchId) => {
	if (!branchId) {
		throw new Error("branchId is required");
	}

	try {
		const attendanceLogsRef = collection(db, `branches/${branchId}/attendanceLogs`);
		const snapshot = await getDocs(query(attendanceLogsRef));

		// Group by year
		const periodsByYear = {};

		snapshot.docs.forEach((doc) => {
			const periodId = doc.id; // Format: MM-YYYY
			if (periodId && periodId.includes("-")) {
				const [month, year] = periodId.split("-");

				if (!periodsByYear[year]) {
					periodsByYear[year] = [];
				}

				periodsByYear[year].push(month);
			}
		});

		// Convert to array format sorted by year (descending) and month (ascending)
		const result = Object.keys(periodsByYear)
			.sort((a, b) => b - a) // Sort years descending
			.map((year) => ({
				year,
				months: periodsByYear[year].sort(), // Sort months ascending
			}));

		return result;
	} catch (error) {
		logError("getAvailableAttendancePeriods", error);
		return [];
	}
};

/**
 * Fetches attendance logs for an employee
 * @param {string} branchId - ID of the branch
 * @param {string} employeeId - ID of the employee
 * @param {string} monthYear - Month and year in MM-YYYY format
 * @returns {Promise<Object>} - Attendance logs
 */
export const getEmployeeAttendanceLogs = async (branchId, employeeId, monthYear) => {
	try {
		const employeeRef = doc(db, `branches/${branchId}/employees`, employeeId);
		const employeeSnap = await getDoc(employeeRef);

		if (!employeeSnap.exists()) {
			throw new Error("Employee not found");
		}

		const employeeData = employeeSnap.data();
		return employeeData.attendance?.[monthYear] || {};
	} catch (error) {
		console.error("Error fetching attendance logs:", error);
		throw error;
	}
};

/**
 * Process attendance with deduction rules
 * @param {Object} attendance - Raw attendance record
 * @param {string} employeeId - Employee ID
 * @param {Object} shiftSchedule - Employee's shift schedule
 * @param {Object} rules - Attendance rules for the branch
 * @param {Object} holidays - Map of holidays keyed by date
 * @returns {Object} - Processed attendance with deductions
 */
export const processAttendanceWithRules = (attendance, employeeId, shiftSchedule, rules, holidays) => {
	if (!attendance || !employeeId || !shiftSchedule || !rules) {
		throw new Error("Missing required parameters");
	}

	const processed = {};
	const dates = Object.keys(attendance);

	// Iterate through each date in the attendance record
	dates.forEach((date) => {
		const dayRecord = attendance[date];

		// Check if it's a holiday
		const isHoliday = holidays[date];
		if (isHoliday) {
			processed[date] = {
				...dayRecord,
				status: "holiday",
				holidayName: isHoliday.name,
				holidayType: isHoliday.type,
				deductions: 0,
			};
			return;
		}

		// Get day of week (0-6, where 0 is Sunday)
		const dayOfWeek = new Date(date).getDay();
		const dayName = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][dayOfWeek];

		// Check if there's a specific schedule for this day
		const daySchedule = shiftSchedule.dayOverrides?.[dayName] || shiftSchedule.defaultTimes;

		// Also check if there's a specific schedule for this date in custom day schedules
		const customSchedule = rules.customDaySchedules?.[date];
		const scheduledStart = customSchedule?.start || daySchedule.start;
		const scheduledEnd = customSchedule?.end || daySchedule.end;

		// Parse times to minutes since midnight for easier comparison
		const scheduledStartMinutes = timeStringToMinutes(scheduledStart);
		const actualStartMinutes = timeStringToMinutes(dayRecord.timeIn || "00:00");

		// Calculate lateness in minutes
		const latenessMinutes = Math.max(0, actualStartMinutes - scheduledStartMinutes);

		// Apply deduction rules if enabled
		let deductions = 0;
		let attendanceStatus = "present";

		if (rules.lateDeductions?.enabled && latenessMinutes > 0) {
			const { deductPerMinute, maxDeductionTime, halfDayThreshold, absentThreshold } = rules.lateDeductions;

			// If lateness exceeds the absent threshold, mark as absent
			if (latenessMinutes >= absentThreshold) {
				attendanceStatus = "absent";
				deductions = 1.0; // Full day deduction
			}
			// If lateness exceeds half-day threshold, mark as half-day
			else if (latenessMinutes >= halfDayThreshold) {
				attendanceStatus = "half-day";
				deductions = 0.5; // Half day deduction
			}
			// Otherwise calculate per-minute deductions up to max time
			else {
				const deductibleMinutes = Math.min(latenessMinutes, maxDeductionTime);
				deductions = (deductPerMinute / 100) * deductibleMinutes;
				attendanceStatus = "late";
			}
		}

		// Store processed record
		processed[date] = {
			...dayRecord,
			scheduledStart,
			scheduledEnd,
			latenessMinutes,
			status: attendanceStatus,
			deductions,
		};
	});

	return processed;
};
