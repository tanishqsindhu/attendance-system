import { db } from "./firebase-config";
import { documentExists, logError} from "./firebase-utils";
import { doc, getDoc, setDoc, collection, writeBatch, query, getDocs, updateDoc } from "firebase/firestore";

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
 * Sanitize an object by removing undefined values and converting them to null
 * Firebase Firestore does not accept undefined values
 *
 * @param {Object} obj - Object to sanitize
 * @returns {Object} - Sanitized object
 */
function sanitizeObject(obj) {
	if (!obj || typeof obj !== "object") return obj;

	Object.keys(obj).forEach((key) => {
		if (obj[key] === undefined) {
			// Replace undefined with null
			obj[key] = null;
		} else if (typeof obj[key] === "object" && obj[key] !== null) {
			// Recursively sanitize nested objects
			sanitizeObject(obj[key]);
		}
	});

	return obj;
}

/**
 * Save a single manual attendance punch for an employee and optionally process it
 *
 * @param {string} branchId - Branch ID
 * @param {string} employeeId - Employee ID
 * @param {Date} date - JavaScript Date object for the attendance record
 * @param {string} punchType - Either 'DutyOn' or 'DutyOff'
 * @param {string} punchTime - Time in format 'HH:MM'
 * @param {string} notes - Optional notes for the entry
 * @param {boolean} processAttendance - Whether to process the attendance after saving
 * @returns {Promise<object>} - Updated employee object with the new attendance data
 */
export const saveSingleManualPunch = async (branchId, employeeId, date, punchType, punchTime, notes = "", processAttendance = false) => {
	if (!branchId || !employeeId || !date || !punchType || !punchTime) {
		throw new Error("Required parameters missing: branchId, employeeId, date, punchType, and punchTime are required");
	}

	try {
		// Format date strings
		const yearStr = date.getFullYear().toString();
		const monthStr = String(date.getMonth() + 1).padStart(2, "0");
		const dayStr = String(date.getDate()).padStart(2, "0");

		// Create required keys
		const monthYearKey = `${monthStr}-${yearStr}`;
		const dateKey = `${yearStr}-${monthStr}-${dayStr}`;

		// Create timestamp for the punch
		const [hours, minutes] = punchTime.split(":").map(Number);
		const punchDateTime = new Date(date);
		punchDateTime.setHours(hours, minutes, 0, 0);

		// Format time for display
		const formattedTime = punchDateTime.toLocaleTimeString();

		// Reference to employee document
		const employeeRef = doc(db, `branches/${branchId}/employees`, employeeId);

		// Get current employee data
		const employeeSnap = await getDoc(employeeRef);
		if (!employeeSnap.exists()) {
			throw new Error(`Employee with ID ${employeeId} not found`);
		}

		const employeeData = employeeSnap.data();

		// Create or update attendance object with null checks at each step
		const currentAttendance = employeeData.attendance || {};
		const monthAttendance = currentAttendance[monthYearKey] || {};
		const dateAttendance = monthAttendance[dateKey] || {
			status: "Manual Entry",
			logs: [],
		};

		// Create new attendance log entry with only safe properties
		const newLog = {
			time: formattedTime,
			inOut: punchType,
			mode: "Manual",
			notes: notes || "Manual entry",
		};

		// Add the new log to the attendance logs - safely
		const existingLogs = Array.isArray(dateAttendance.logs) ? dateAttendance.logs : [];
		const updatedLogs = [...existingLogs, newLog];

		// Update firstIn and lastOut based on the punch type
		let updatedFirstIn = dateAttendance.firstIn || null;
		let updatedLastOut = dateAttendance.lastOut || null;

		if (punchType === "DutyOn") {
			// For duty on, always set firstIn if not already set
			if (!updatedFirstIn) {
				updatedFirstIn = formattedTime;
			}
		} else if (punchType === "DutyOff") {
			// For duty off, always set lastOut
			updatedLastOut = formattedTime;
		}

		// Create safe updated attendance object - with null checks at every level
		const updatedDateAttendance = {
			...dateAttendance,
			logs: updatedLogs,
			firstIn: updatedFirstIn,
			lastOut: updatedLastOut,
			updatedAt: new Date().toISOString(),
		};

		const updatedMonthAttendance = {
			...monthAttendance,
			[dateKey]: updatedDateAttendance,
		};

		const updatedAttendance = {
			...currentAttendance,
			[monthYearKey]: updatedMonthAttendance,
		};

		// Sanitize the entire object to remove any undefined values
		const sanitizedAttendance = sanitizeObject(updatedAttendance);

		// Update the document with sanitized data
		await updateDoc(employeeRef, {
			attendance: sanitizedAttendance,
			updatedAt: new Date().toISOString(),
		});

		// Update the attendance logs collection with sanitized data
		try {
			const attendanceLogRef = doc(db, `branches/${branchId}/attendanceLogs`, monthYearKey);
			const attendanceLogSnap = await getDoc(attendanceLogRef);

			if (attendanceLogSnap.exists()) {
				const attendanceLogData = attendanceLogSnap.data() || {};

				// Safely construct the updated log data
				const currentDateData = attendanceLogData[dateKey] || {};
				const updatedLogData = {
					...attendanceLogData,
					[dateKey]: {
						...currentDateData,
						[employeeId]: sanitizeObject(updatedDateAttendance),
					},
				};

				await updateDoc(attendanceLogRef, updatedLogData);
			} else {
				// Create the document if it doesn't exist
				await setDoc(attendanceLogRef, {
					[dateKey]: {
						[employeeId]: sanitizeObject(updatedDateAttendance),
					},
				});
			}
		} catch (logError) {
			console.error("Error updating attendance logs collection:", logError);
			// Continue anyway as the employee document was already updated
		}

		// Process the attendance if requested - using processManualAttendance
		if (processAttendance) {
			try {
				const { processManualAttendance } = await import("./attendance-service");
				await processManualAttendance(branchId, employeeId, dateKey);
			} catch (processError) {
				console.error("Error processing attendance:", processError);
				// Continue anyway as the punch was saved
			}
		}

		// Return updated employee object
		return {
			...employeeData,
			attendance: sanitizedAttendance,
			updatedAt: new Date().toISOString(),
		};
	} catch (error) {
		logError("saveSingleManualPunch", error);
		throw error;
	}
};

/**
 * Process attendance for a single date using the unified attendance processing logic
 *
 * @param {string} branchId - Branch ID
 * @param {string} employeeId - Employee ID or array of employee IDs
 * @param {string} dateKey - Date in YYYY-MM-DD format
 * @returns {Promise<Object>} - Result of processing
 */
export const processSingleDateAttendance = async (branchId, employeeId, dateKey) => {
	try {
		const [year, month, day] = dateKey.split("-");
		const monthYear = `${month}-${year}`;

		// Create a date range with just this single date
		const startDate = dateKey;
		const endDate = dateKey;

		// Call the serverless function directly
		const response = await fetch("/.netlify/functions/attendance-processing", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				branchId,
				startDate,
				endDate,
				employeeIds: Array.isArray(employeeId) ? employeeId : [employeeId],
			}),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.message || "Failed to process attendance");
		}

		const result = await response.json();
		return result;
	} catch (error) {
		console.error("Error processing single date attendance:", error);
		throw error;
	}
};
