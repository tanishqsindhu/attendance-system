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

	async saveAttendanceRules(branchId, rules) {
		if (!branchId || !rules) {
			throw new Error("branchId and rules are required");
		}
		try {
			// Fix: Correctly construct the document reference
			const rulesRef = doc(db, "branches", branchId, "settings", "attendanceRules");

			// Get current user ID from session storage or local variable
			// This avoids the n.indexOf error by not accessing auth directly
			// let currentUserId = user.fullName || user.id;

			// Add metadata
			const rulesWithMetadata = {
				...rules,
				updatedAt: serverTimestamp(),
				// updatedBy: currentUserId,
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
					createdAt: serverTimestamp(),
				};
			}

			return docSnap.data();
		} catch (error) {
			logError("getAttendanceRules", error);
			throw new Error(`Failed to get attendance rules: ${error.message}`);
		}
	},

	/**
	 * Calculate deduction amount based on late minutes and rules
	 * @param {number} lateMinutes - Minutes employee was late
	 * @param {Object} rules - Attendance rules
	 * @param {number} dailyWage - Employee's daily wage in rupees
	 * @returns {Object} - Deduction information
	 */
	calculateDeduction(lateMinutes, rules, dailyWage) {
		if (!rules?.lateDeductions?.enabled) {
			return { deductionAmount: 0, deductionReason: "No deduction" };
		}

		// Check if employee is absent based on threshold
		if (lateMinutes >= rules.lateDeductions.absentThreshold) {
			return {
				deductionAmount: dailyWage,
				deductionReason: "Absent (Late by " + lateMinutes + " minutes)",
				deductionPercentage: 100,
			};
		}

		// Check if employee is half-day based on threshold
		if (lateMinutes >= rules.lateDeductions.halfDayThreshold) {
			return {
				deductionAmount: dailyWage * 0.5,
				deductionReason: "Half-day (Late by " + lateMinutes + " minutes)",
				deductionPercentage: 50,
			};
		}

		// Calculate per-minute deduction up to max deduction time
		const deductibleMinutes = Math.min(lateMinutes, rules.lateDeductions.maxDeductionTime);
		let deductionAmount = 0;

		if (rules.lateDeductions.deductionType === "percentage") {
			// Percentage-based deduction
			const percentageDeduction = deductibleMinutes * rules.lateDeductions.deductPerMinute;
			deductionAmount = (dailyWage * percentageDeduction) / 100;
		} else {
			// Fixed amount deduction in rupees
			deductionAmount = deductibleMinutes * rules.lateDeductions.fixedAmountPerMinute;
		}

		return {
			deductionAmount,
			deductionReason: "Late by " + lateMinutes + " minutes",
			deductionPercentage: (deductionAmount / dailyWage) * 100,
		};
	},
};
