import { db } from "./firebase-config";
import { documentExists, logError } from "./firebase-utils";
import { doc, getDoc, setDoc, collection, getDocs, query, runTransaction, where, updateDoc } from "firebase/firestore";

export const OrganizationSettingsService = {
	// Existing methods remain unchanged...
	async getSettings() {
		try {
			const settingsRef = doc(db, "settings", "organizationSettings");
			const docSnap = await getDoc(settingsRef);
			return docSnap.exists() ? docSnap.data() : { departments: [], positions: [], branches: [], shiftSchedules: [] };
		} catch (error) {
			logError("getSettings", error);
			return { departments: [], positions: [], branches: [], shiftSchedules: [] };
		}
	},

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

	getItemPrefix(itemType) {
		const prefixes = { branches: "B", departments: "D", positions: "P", shiftSchedules: "S" };
		return prefixes[itemType] || "X";
	},

	formatId(prefix, numericId) {
		return `${prefix}${numericId.toString().padStart(3, "0")}`;
	},

	idExists(items, id) {
		return items.some((item) => (typeof item === "object" ? item.id === id : item === id));
	},

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
			let numericId = newItem.id && typeof newItem.id === "number" ? newItem.id : await this.getNextId(itemType);

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
					// Date-specific overrides (if any)
					dateOverrides: newItem.dateOverrides || {},
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

	async addShiftScheduleDateOverride(scheduleId, dateOverride) {
		if (!scheduleId || !dateOverride || !dateOverride.date) {
			throw new Error("scheduleId and dateOverride with date are required");
		}

		try {
			const settingsRef = doc(db, "settings", "organizationSettings");
			const docSnap = await getDoc(settingsRef);

			if (!docSnap.exists()) {
				throw new Error("Organization settings not found");
			}

			const settings = docSnap.data();
			const shiftSchedules = [...(settings.shiftSchedules || [])];

			const scheduleIndex = shiftSchedules.findIndex((schedule) => schedule.id === scheduleId);
			if (scheduleIndex === -1) {
				throw new Error(`Shift schedule with ID ${scheduleId} not found`);
			}

			// Create a deep copy of the schedule to modify
			const updatedSchedule = JSON.parse(JSON.stringify(shiftSchedules[scheduleIndex]));

			// Initialize dateOverrides if it doesn't exist
			if (!updatedSchedule.dateOverrides) {
				updatedSchedule.dateOverrides = {};
			}

			// Add or update the date override
			updatedSchedule.dateOverrides[dateOverride.date] = {
				start: dateOverride.start || updatedSchedule.defaultTimes.start,
				end: dateOverride.end || updatedSchedule.defaultTimes.end,
				isWorkDay: dateOverride.isWorkDay !== undefined ? dateOverride.isWorkDay : true,
				description: dateOverride.description || "",
			};

			// Update the schedule in the array
			shiftSchedules[scheduleIndex] = updatedSchedule;

			// Update the database
			await updateDoc(settingsRef, { shiftSchedules: shiftSchedules });

			return shiftSchedules;
		} catch (error) {
			logError("addShiftScheduleDateOverride", error);
			throw error;
		}
	},

	async removeShiftScheduleDateOverride(scheduleId, date) {
		if (!scheduleId || !date) {
			throw new Error("scheduleId and date are required");
		}

		try {
			const settingsRef = doc(db, "settings", "organizationSettings");
			const docSnap = await getDoc(settingsRef);

			if (!docSnap.exists()) {
				throw new Error("Organization settings not found");
			}

			const settings = docSnap.data();
			const shiftSchedules = [...(settings.shiftSchedules || [])];

			const scheduleIndex = shiftSchedules.findIndex((schedule) => schedule.id === scheduleId);
			if (scheduleIndex === -1) {
				throw new Error(`Shift schedule with ID ${scheduleId} not found`);
			}

			// Create a deep copy of the schedule to modify
			const updatedSchedule = JSON.parse(JSON.stringify(shiftSchedules[scheduleIndex]));

			// Check if dateOverrides exists and the specific date exists
			if (updatedSchedule.dateOverrides && updatedSchedule.dateOverrides[date]) {
				// Remove the date override
				const { [date]: removed, ...remainingOverrides } = updatedSchedule.dateOverrides;
				updatedSchedule.dateOverrides = remainingOverrides;

				// Update the schedule in the array
				shiftSchedules[scheduleIndex] = updatedSchedule;

				// Update the database with only the modified field
				await updateDoc(settingsRef, { shiftSchedules: shiftSchedules });
			}

			return shiftSchedules;
		} catch (error) {
			logError("removeShiftScheduleDateOverride", error);
			throw error;
		}
	},

	// NEW METHOD: Add day override to shift schedule
	async addShiftScheduleDayOverride(scheduleId, dayOverride) {
		if (!scheduleId || !dayOverride || !dayOverride.day) {
			throw new Error("scheduleId and dayOverride with day property are required");
		}

		try {
			const settingsRef = doc(db, "settings", "organizationSettings");
			const docSnap = await getDoc(settingsRef);

			if (!docSnap.exists()) {
				throw new Error("Organization settings not found");
			}

			const settings = docSnap.data();
			const shiftSchedules = [...(settings.shiftSchedules || [])];

			const scheduleIndex = shiftSchedules.findIndex((schedule) => schedule.id === scheduleId);
			if (scheduleIndex === -1) {
				throw new Error(`Shift schedule with ID ${scheduleId} not found`);
			}

			// Create a deep copy of the schedule to modify
			const updatedSchedule = JSON.parse(JSON.stringify(shiftSchedules[scheduleIndex]));

			// Initialize dayOverrides if it doesn't exist
			if (!updatedSchedule.dayOverrides) {
				updatedSchedule.dayOverrides = {};
			}

			// Add or update the day override
			updatedSchedule.dayOverrides[dayOverride.day] = {
				start: dayOverride.start || updatedSchedule.defaultTimes.start,
				end: dayOverride.end || updatedSchedule.defaultTimes.end,
				isWorkDay: dayOverride.isWorkDay !== undefined ? dayOverride.isWorkDay : true,
				description: dayOverride.description || "",
			};

			// Update the schedule in the array
			shiftSchedules[scheduleIndex] = updatedSchedule;

			// Update the database
			await updateDoc(settingsRef, { shiftSchedules: shiftSchedules });

			return shiftSchedules;
		} catch (error) {
			logError("addShiftScheduleDayOverride", error);
			throw error;
		}
	},

	// NEW METHOD: Remove day override from shift schedule
	async removeShiftScheduleDayOverride(scheduleId, day) {
		if (!scheduleId || !day) {
			throw new Error("scheduleId and day are required");
		}

		try {
			const settingsRef = doc(db, "settings", "organizationSettings");
			const docSnap = await getDoc(settingsRef);

			if (!docSnap.exists()) {
				throw new Error("Organization settings not found");
			}

			const settings = docSnap.data();
			const shiftSchedules = [...(settings.shiftSchedules || [])];

			const scheduleIndex = shiftSchedules.findIndex((schedule) => schedule.id === scheduleId);
			if (scheduleIndex === -1) {
				throw new Error(`Shift schedule with ID ${scheduleId} not found`);
			}

			// Create a deep copy of the schedule to modify
			const updatedSchedule = JSON.parse(JSON.stringify(shiftSchedules[scheduleIndex]));

			// Check if dayOverrides exists and the specific day exists
			if (updatedSchedule.dayOverrides && updatedSchedule.dayOverrides[day]) {
				// Remove the day override
				const { [day]: removed, ...remainingOverrides } = updatedSchedule.dayOverrides;
				updatedSchedule.dayOverrides = remainingOverrides;

				// Update the schedule in the array
				shiftSchedules[scheduleIndex] = updatedSchedule;

				// Update the database
				await updateDoc(settingsRef, { shiftSchedules: shiftSchedules });
			}

			return shiftSchedules;
		} catch (error) {
			logError("removeShiftScheduleDayOverride", error);
			throw error;
		}
	},

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

	async deleteItem(itemType, itemId, employees) {
		if (!itemType || !itemId || !employees) {
			throw new Error("itemType, itemId, and employees are required");
		}

		const settingsRef = doc(db, "settings", "organizationSettings");

		try {
			const docSnap = await getDoc(settingsRef);

			if (!docSnap.exists()) {
				throw new Error("Organization settings not found");
			}

			const settings = docSnap.data();
			const items = settings[itemType] || [];

			// Check if any employees are using this setting
			let isSettingInUse = false;

			switch (itemType) {
				case "departments":
					isSettingInUse = employees.some((employee) => employee.employment?.department === itemId);
					break;
				case "positions":
					isSettingInUse = employees.some((employee) => employee.employment?.position === itemId);
					break;
				case "branches":
					isSettingInUse = employees.some((employee) => employee.employment?.branchId === itemId);
					break;
				case "shiftSchedules":
					isSettingInUse = employees.some((employee) => employee.employment?.shiftId === itemId);
					break;
				default:
					throw new Error(`Invalid itemType: ${itemType}`);
			}

			if (isSettingInUse) {
				throw new Error(`Cannot delete ${itemType} with ID ${itemId} as it is currently in use by one or more employees.`);
			}

			// If the setting is not in use, proceed with deletion
			const updatedItems = items.filter((item) => item.id !== itemId);

			await setDoc(settingsRef, { ...settings, [itemType]: updatedItems }, { merge: true });
			return updatedItems;
		} catch (error) {
			logError(`deleteItem for ${itemType}`, error);
			throw error;
		}
	},

	async updateItem(itemType, itemId, updatedItem) {
		if (!itemType || !itemId || !updatedItem) {
			throw new Error("itemType, itemId, and updatedItem are required");
		}

		try {
			const settingsRef = doc(db, "settings", "organizationSettings");
			const docSnap = await getDoc(settingsRef);

			if (!docSnap.exists()) {
				throw new Error("Organization settings not found");
			}

			const settings = docSnap.data();
			const items = [...(settings[itemType] || [])];

			// Find the index of the item to update
			const itemIndex = items.findIndex((item) => item.id === itemId);

			if (itemIndex === -1) {
				throw new Error(`${itemType.slice(0, -1)} with ID ${itemId} not found`);
			}

			// Create a new item by merging existing item with updates
			const existingItem = items[itemIndex];
			const updatedItemData = {
				...existingItem,
				...updatedItem,
				// Ensure ID and numericId remain unchanged
				id: itemId,
				numericId: existingItem.numericId,
			};

			// Replace the old item with the updated item
			items[itemIndex] = updatedItemData;

			// Update the Firestore document
			await setDoc(settingsRef, { ...settings, [itemType]: items }, { merge: true });

			return items;
		} catch (error) {
			logError(`updateItem for ${itemType}`, error);
			throw error;
		}
	},

	async deleteShiftSchedule(scheduleId, employees) {
		if (!scheduleId || !employees) {
			throw new Error("scheduleId and employees are required");
		}
		const isSettingInUse = employees.some((employee) => employee.employment?.shiftId === scheduleId);
		if (isSettingInUse) {
			throw new Error(`Cannot delete Shift Schedule with ID ${scheduleId} as it is currently in use by one or more employees.`);
		}
		try {
			return await this.deleteItem("shiftSchedules", scheduleId, employees);
		} catch (error) {
			logError("deleteShiftSchedule", error);
			throw error;
		}
	},
};
