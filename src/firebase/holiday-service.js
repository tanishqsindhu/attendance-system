import { db } from "./firebase-config";
import { logError, generateId } from "./firebase-utils";
import {
	collection,
	doc,
	setDoc,
	getDocs,
	deleteDoc,
	query,
	where,
	serverTimestamp,
	orderBy,
} from "firebase/firestore";

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

			// Extract year from the date string
			const year = holidayData.year || new Date(holidayData.date).getFullYear();

			const newHoliday = {
				id: holidayId,
				date: holidayData.date,
				name: holidayData.name,
				type: holidayData.type || "full", // "full" or "half"
				year: year, // Store the year explicitly
				createdAt: serverTimestamp(),
			};

			await setDoc(doc(holidaysRef, holidayId), newHoliday);

			// Return with a JS Date object for immediate use in UI
			return {
				...newHoliday,
				createdAt: new Date(),
			};
		} catch (error) {
			logError("addHoliday", error);
			throw error;
		}
	},

	/**
	 * Get holidays for a specific year
	 * @param {Number} year - The year to get holidays for
	 * @returns {Promise<Array>} - List of holidays for the specified year
	 */
	async getHolidaysByYear(year) {
		if (!year) {
			throw new Error("Year parameter is required");
		}

		try {
			const holidaysRef = collection(db, "holidays");

			// Query holidays by year field
			const q = query(holidaysRef, where("year", "==", year), orderBy("date", "asc"));

			const snapshot = await getDocs(q);
			return snapshot.docs.map((doc) => doc.data());
		} catch (error) {
			logError("getHolidaysByYear", error);
			return [];
		}
	},

	/**
	 * Get all holidays in a date range (deprecated, use getHolidaysByYear instead)
	 * @param {String} startDate - Start date (YYYY-MM-DD)
	 * @param {String} endDate - End date (YYYY-MM-DD)
	 * @returns {Promise<Array>} - List of holidays
	 */
	async getHolidays(startDate, endDate) {
		try {
			const holidaysRef = collection(db, "holidays");
			let q = query(holidaysRef);

			if (startDate && endDate) {
				q = query(
					holidaysRef,
					where("date", ">=", startDate),
					where("date", "<=", endDate),
					orderBy("date", "asc")
				);
			}

			const snapshot = await getDocs(q);
			return snapshot.docs.map((doc) => doc.data());
		} catch (error) {
			logError("getHolidays", error);
			return [];
		}
	},

	/**
	 * Delete a holiday by ID
	 * @param {String} holidayId - The ID of the holiday to delete
	 * @returns {Promise<String>} - The ID of the deleted holiday
	 */
	async deleteHoliday(holidayId) {
		if (!holidayId) {
			throw new Error("Holiday ID is required");
		}

		try {
			const holidayRef = doc(db, "holidays", holidayId);
			await deleteDoc(holidayRef);
			return holidayId;
		} catch (error) {
			logError("deleteHoliday", error);
			throw error;
		}
	},
};
