import { db } from "@/firebase/firebase-config";
import { collection, query, where, getDocs } from "firebase/firestore";

export const ShiftScheduleUtils = {
	/**
	 * Check if a shift schedule is currently in use by any employees
	 * @param {string} scheduleId - ID of the shift schedule to check
	 * @returns {Promise<boolean>} - Whether the schedule is in use
	 */
	async isShiftScheduleInUse(scheduleId) {
		try {
			// Query employees collection for any employees using this shift schedule
			const employeesRef = collection(db, "employees");
			const q = query(employeesRef, where("shiftScheduleId", "==", scheduleId));

			const querySnapshot = await getDocs(q);

			return querySnapshot.size > 0;
		} catch (error) {
			console.error("Error checking shift schedule usage:", error);
			return false;
		}
	},

	/**
	 * Validate shift schedule before deletion
	 * @param {string} scheduleId - ID of the shift schedule
	 * @returns {Promise<{canDelete: boolean, reason?: string}>}
	 */
	async validateShiftScheduleDeletion(scheduleId) {
		const isInUse = await this.isShiftScheduleInUse(scheduleId);

		if (isInUse) {
			return {
				canDelete: false,
				reason: "This shift schedule is currently assigned to one or more employees.",
			};
		}

		return { canDelete: true };
	},
};
