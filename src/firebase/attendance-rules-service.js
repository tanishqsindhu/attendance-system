import { db } from "./firebase-config";
import { logError } from "./firebase-utils";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

/**
 * Service to manage attendance rules for branches
 */
export const AttendanceRulesService = {
	/**
	 * Save attendance rules for a branch
	 * @param {string} branchId - Branch ID
	 * @param {Object} rules - Attendance rules
	 * @returns {Promise<Object>} - Updated rules with timestamp
	 */

	async saveAttendanceRules(branchId, rules, user) {
		if (!branchId || !rules) {
			throw new Error("branchId and rules are required");
		}
		try {
			// Fix: Correctly construct the document reference
			const rulesRef = doc(db, "branches", branchId, "settings", "attendanceRules");

			// Get current user ID 
			let currentUserId = user.fullName || user.id;

			// Add metadata
			const rulesWithMetadata = {
				...rules,
				updatedAt: serverTimestamp(),
				updatedBy: currentUserId,
			};

			await setDoc(rulesRef, rulesWithMetadata, { merge: true });
			return rules; // Return original rules without server timestamp for immediate UI update
		} catch (error) {
			logError("saveAttendanceRules", error);
			throw new Error(`Failed to save attendance rules: ${error.message}`);
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
			// Correctly construct the document reference
			const rulesRef = doc(db, "branches", branchId, "settings", "attendanceRules");
			const docSnap = await getDoc(rulesRef);

			if (!docSnap.exists()) {
				// Return default rules if none exist
				return {
					lateDeductions: {
						enabled: false,
						deductionType: "percentage", // 'percentage' or 'fixed'
						deductPerMinute: 0, // Percentage value
						fixedAmountPerMinute: 0, // Rupees amount
						maxDeductionTime: 60,
						halfDayThreshold: 120,
						absentThreshold: 240,
					},
					leaveRules: {
						unsanctionedMultiplier: 2, // Multiplier for unsanctioned leaves (2x daily wage)
					},
					createdAt: serverTimestamp(),
				};
			}

			return docSnap.data();
		} catch (error) {
			logError("getAttendanceRules", error);
			throw new Error(`Failed to get attendance rules: ${error.message}`);
		}
	},
};
