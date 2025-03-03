import { db } from "./firebase-config";
import { logError } from "./firebase-utils";
import {
	doc,
	getDoc,
	setDoc,
	collection,
	query,
	where,
	getDocs,
	deleteDoc,
	serverTimestamp,
} from "firebase/firestore";

/**
 * Service to manage custom shifts for specific dates
 */
export const CustomShiftService = {
	/**
	 * Save a custom shift for a specific date
	 * @param {string} branchId - Branch ID
	 * @param {string} employeeId - Employee ID (optional, if null applies to all employees)
	 * @param {string} date - Date in YYYY-MM-DD format
	 * @param {Object} shiftData - Custom shift data
	 * @returns {Promise<Object>} - Saved shift data with ID
	 */
	async saveCustomShift(branchId, employeeId, date, shiftData) {
		if (!branchId || !date || !shiftData) {
			throw new Error("branchId, date, and shift data are required");
		}

		try {
			// Create a document ID that ensures uniqueness
			const shiftId = employeeId ? `${date}_${employeeId}` : `${date}_branch`;

			const customShiftRef = doc(db, "branches", branchId, "customShifts", shiftId);

			const shiftWithMetadata = {
				...shiftData,
				date,
				employeeId: employeeId || null,
				applyToAllEmployees: !employeeId,
				updatedAt: serverTimestamp(),
				createdAt: serverTimestamp(),
			};

			await setDoc(customShiftRef, shiftWithMetadata, { merge: true });
			return { id: shiftId, ...shiftWithMetadata };
		} catch (error) {
			logError("saveCustomShift", error);
			throw new Error(`Failed to save custom shift: ${error.message}`);
		}
	},

	/**
	 * Get custom shifts for a date range
	 * @param {string} branchId - Branch ID
	 * @param {string} startDate - Start date in YYYY-MM-DD format
	 * @param {string} endDate - End date in YYYY-MM-DD format
	 * @param {string} employeeId - Optional employee ID to filter by
	 * @returns {Promise<Array>} - Array of custom shifts
	 */
	async getCustomShifts(branchId, startDate, endDate, employeeId = null) {
		if (!branchId || !startDate || !endDate) {
			throw new Error("branchId, startDate, and endDate are required");
		}

		try {
			const shiftsCollection = collection(db, "branches", branchId, "customShifts");

			// Start with a query for shifts within the date range that apply to all employees
			const allEmployeesQuery = query(
				shiftsCollection,
				where("date", ">=", startDate),
				where("date", "<=", endDate),
				where("applyToAllEmployees", "==", true)
			);

			const allEmployeesSnapshot = await getDocs(allEmployeesQuery);
			const shifts = allEmployeesSnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}));

			// If employeeId is provided, also get employee-specific shifts
			if (employeeId) {
				const employeeQuery = query(
					shiftsCollection,
					where("date", ">=", startDate),
					where("date", "<=", endDate),
					where("employeeId", "==", employeeId)
				);

				const employeeSnapshot = await getDocs(employeeQuery);
				const employeeShifts = employeeSnapshot.docs.map((doc) => ({
					id: doc.id,
					...doc.data(),
				}));

				// Combine shifts, with employee-specific shifts taking precedence
				const shiftsByDate = {};
				[...shifts, ...employeeShifts].forEach((shift) => {
					shiftsByDate[shift.date] = shift;
				});

				return Object.values(shiftsByDate);
			}

			return shifts;
		} catch (error) {
			logError("getCustomShifts", error);
			throw new Error(`Failed to get custom shifts: ${error.message}`);
		}
	},

	/**
	 * Get a custom shift for a specific date and employee
	 * @param {string} branchId - Branch ID
	 * @param {string} date - Date in YYYY-MM-DD format
	 * @param {string} employeeId - Optional employee ID
	 * @returns {Promise<Object|null>} - Custom shift or null if not found
	 */
	async getCustomShiftForDate(branchId, date, employeeId = null) {
		if (!branchId || !date) {
			throw new Error("branchId and date are required");
		}

		try {
			// Check for employee-specific shift first
			if (employeeId) {
				const employeeShiftRef = doc(
					db,
					"branches",
					branchId,
					"customShifts",
					`${date}_${employeeId}`
				);
				const employeeShiftSnap = await getDoc(employeeShiftRef);

				if (employeeShiftSnap.exists()) {
					return { id: employeeShiftSnap.id, ...employeeShiftSnap.data() };
				}
			}

			// Check for branch-wide shift for this date
			const branchShiftRef = doc(db, "branches", branchId, "customShifts", `${date}_branch`);
			const branchShiftSnap = await getDoc(branchShiftRef);

			if (branchShiftSnap.exists()) {
				return { id: branchShiftSnap.id, ...branchShiftSnap.data() };
			}

			return null;
		} catch (error) {
			logError("getCustomShiftForDate", error);
			throw new Error(`Failed to get custom shift for date: ${error.message}`);
		}
	},

	/**
	 * Delete a custom shift
	 * @param {string} branchId - Branch ID
	 * @param {string} shiftId - Custom shift ID
	 * @returns {Promise<void>}
	 */
	async deleteCustomShift(branchId, shiftId) {
		if (!branchId || !shiftId) {
			throw new Error("branchId and shiftId are required");
		}

		try {
			const shiftRef = doc(db, "branches", branchId, "customShifts", shiftId);
			await deleteDoc(shiftRef);
		} catch (error) {
			logError("deleteCustomShift", error);
			throw new Error(`Failed to delete custom shift: ${error.message}`);
		}
	},
};
