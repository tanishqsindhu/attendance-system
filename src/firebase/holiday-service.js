import { db } from "./firebase-config";
import { logError, generateId } from "./firebase-utils";
import { collection, doc, setDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";

/**
 * Holiday service for managing holidays in the system
 */
export const HolidayService = {
	/**
	 * Add holiday to the system
	 * @param {Object} holidayData - Holiday details including date, name, and type
	 * @returns {Promise<Object>} - Added holiday
	 */
	async addHoliday(holidayData) {
		if (!holidayData || !holidayData.date || !holidayData.name) {
			throw new Error("Holiday data must include date and name");
		}

		try {
			const holidaysRef = collection(db, "holidays");
			const holidayId = generateId(`${holidayData.date}-${holidayData.name}`);

			const newHoliday = {
				id: holidayId,
				date: holidayData.date,
				name: holidayData.name,
				type: holidayData.type || "full", // "full" or "half"
				createdAt: serverTimestamp(),
			};

			await setDoc(doc(holidaysRef, holidayId), newHoliday);
			return newHoliday;
		} catch (error) {
			logError("addHoliday", error);
			throw error;
		}
	},

	/**
	 * Get all holidays in a date range
	 * @param {Date} startDate - Start date
	 * @param {Date} endDate - End date
	 * @returns {Promise<Array>} - List of holidays
	 */
	async getHolidays(startDate, endDate) {
		try {
			const holidaysRef = collection(db, "holidays");
			let q = query(holidaysRef);

			if (startDate && endDate) {
				q = query(holidaysRef, where("date", ">=", startDate), where("date", "<=", endDate));
			}

			const snapshot = await getDocs(q);
			return snapshot.docs.map((doc) => doc.data());
		} catch (error) {
			logError("getHolidays", error);
			return [];
		}
	},
};
