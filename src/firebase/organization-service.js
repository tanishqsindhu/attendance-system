import { db } from "./firebase-config";
import { documentExists, logError } from "./firebase-utils";
import {
	doc,
	getDoc,
	setDoc,
	collection,
	getDocs,
	query,
	runTransaction,
	where,
} from "firebase/firestore";

export const OrganizationSettingsService = {
	/**
	 * Get organization settings
	 * @returns {Promise<Object>} - Organization settings
	 */
	async getSettings() {
		try {
			const settingsRef = doc(db, "settings", "organizationSettings");
			const docSnap = await getDoc(settingsRef);
			return docSnap.exists()
				? docSnap.data()
				: { departments: [], positions: [], branches: [], shiftSchedules: [] };
		} catch (error) {
			logError("getSettings", error);
			return { departments: [], positions: [], branches: [], shiftSchedules: [] };
		}
	},

	/**
	 * Get next ID for a counter
	 * @param {string} counterName - Name of the counter
	 * @returns {Promise<number>} - Next ID
	 */
	async getNextId(counterName) {
		if (!counterName) {
			throw new Error("counterName is required");
		}

		const counterRef = doc(db, "counters", counterName);

		try {
			return await runTransaction(db, async (transaction) => {
				const counterDoc = await transaction.get(counterRef);
				const currentId = counterDoc.exists() ? counterDoc.data().value + 1 : 1;
				transaction.set(counterRef, { value: currentId });
				return currentId;
			});
		} catch (error) {
			logError(`getNextId for ${counterName}`, error);
			throw error;
		}
	},

	/**
	 * Get prefix for an item type
	 * @param {string} itemType - Type of item
	 * @returns {string} - Prefix for the item type
	 */
	getItemPrefix(itemType) {
		const prefixes = { branches: "B", departments: "D", positions: "P", shiftSchedules: "S" };
		return prefixes[itemType] || "X";
	},

	/**
	 * Format an ID with a prefix and padding
	 * @param {string} prefix - Prefix for the ID
	 * @param {number} numericId - Numeric ID
	 * @returns {string} - Formatted ID
	 */
	formatId(prefix, numericId) {
		return `${prefix}${numericId.toString().padStart(3, "0")}`;
	},

	/**
	 * Check if an ID exists in an array of items
	 * @param {Array} items - Array of items
	 * @param {string} id - ID to check
	 * @returns {boolean} - Whether the ID exists
	 */
	idExists(items, id) {
		return items.some((item) => (typeof item === "object" ? item.id === id : item === id));
	},

	/**
	 * Add an item to an organization settings collection
	 * @param {string} itemType - Type of item
	 * @param {Object|string} newItem - Item to add
	 * @returns {Promise<Array>} - Updated array of items
	 */
	async addItem(itemType, newItem) {
		if (!itemType || !newItem) {
			throw new Error("itemType and newItem are required");
		}

		try {
			const settingsRef = doc(db, "settings", "organizationSettings");
			const docSnap = await getDoc(settingsRef);

			if (!docSnap.exists()) {
				await setDoc(settingsRef, { [itemType]: [] });
				return this.addItem(itemType, newItem); // Retry after creating document
			}

			const settings = docSnap.data();
			const updatedItems = [...(settings[itemType] || [])];
			const prefix = this.getItemPrefix(itemType);

			// Determine the ID to use
			let numericId =
				newItem.id && typeof newItem.id === "number" ? newItem.id : await this.getNextId(itemType);

			const formattedId = this.formatId(prefix, numericId);

			if (this.idExists(updatedItems, formattedId)) {
				throw new Error(`ID ${formattedId} already exists.`);
			}

			let itemWithId = {
				id: formattedId,
				numericId,
				name: typeof newItem === "string" ? newItem : newItem.name,
				...(typeof newItem === "object" ? newItem : {}), // Include other properties if newItem is an object
			};

			// Remove name if it was already added above
			if (typeof newItem === "object" && itemWithId.name === newItem.name) {
				delete itemWithId.name;
				itemWithId.name = newItem.name;
			}

			// Special handling for shift schedules
			if (itemType === "shiftSchedules") {
				const scheduleWithDayOverrides = {
					...(typeof newItem === "object" ? newItem : { name: newItem }),
					// Default settings
					defaultTimes: {
						start: newItem.defaultTimes?.start || "08:00",
						end: newItem.defaultTimes?.end || "16:00",
					},
					// Day-specific overrides (if any)
					dayOverrides: newItem.dayOverrides || {},
					// Flexible time settings (if any)
					flexibleTime: newItem.flexibleTime || {
						enabled: false,
						graceMinutes: 15,
					},
				};

				itemWithId = {
					id: formattedId,
					numericId,
					...scheduleWithDayOverrides,
				};
			}

			updatedItems.push(itemWithId);
			await setDoc(settingsRef, { ...settings, [itemType]: updatedItems }, { merge: true });
			return updatedItems;
		} catch (error) {
			logError(`addItem for ${itemType}`, error);
			return null;
		}
	},

	/**
	 * Get employees for a branch
	 * @param {string} branchId - Branch ID
	 * @returns {Promise<Array>} - Array of employees
	 */
	async getEmployeesByBranch(branchId) {
		if (!branchId) {
			throw new Error("branchId is required");
		}

		try {
			const employeesRef = collection(db, `branches/${branchId}/employees`);
			const querySnapshot = await getDocs(query(employeesRef));
			return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
		} catch (error) {
			logError("getEmployeesByBranch", error);
			return [];
		}
	},
};
