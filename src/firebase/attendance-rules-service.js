import { db } from "./firebase-config";
import { logError } from "./firebase-utils";
import { doc, getDoc, setDoc } from "firebase/firestore";

/**
 * Service to manage attendance rules for branches
 */
export const AttendanceRulesService = {
	/**
	 * Save attendance rules for a branch
	 * @param {string} branchId - Branch ID
	 * @param {Object} rules - Attendance rules
	 * @returns {Promise<Object>} - Updated rules
	 */
	async saveAttendanceRules(branchId, rules) {
		if (!branchId || !rules) {
			throw new Error("branchId and rules are required");
		}

		try {
			const rulesRef = doc(db, "branches", branchId, "settings", "attendanceRules");
			await setDoc(rulesRef, rules, { merge: true });
			return rules;
		} catch (error) {
			logError("saveAttendanceRules", error);
			throw error;
		}
	},

	/**
	 * Get attendance rules for a branch
	 * @param {string} branchId - Branch ID
	 * @returns {Promise<Object>} - Attendance rules
	 */
	async getAttendanceRules(branchId) {
		if (!branchId) {
			throw new Error("branchId is required");
		}

		try {
			const rulesRef = doc(db, "branches", branchId, "settings", "attendanceRules");
			const docSnap = await getDoc(rulesRef);

			if (!docSnap.exists()) {
				// Return default rules if none exist
				return {
					lateDeductions: {
						enabled: false,
						deductPerMinute: 0,
						maxDeductionTime: 0,
						halfDayThreshold: 0,
						absentThreshold: 0,
					},
					customDaySchedules: {},
				};
			}

			return docSnap.data();
		} catch (error) {
			logError("getAttendanceRules", error);
			throw error;
		}
	},
};
