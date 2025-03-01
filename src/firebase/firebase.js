import { initializeApp } from "firebase/app";
import {
	getFirestore,
	doc,
	getDoc,
	setDoc,
	collection,
	writeBatch,
	query,
	getDocs,
	runTransaction,
} from "firebase/firestore";

const firebaseConfig = {
	apiKey: "AIzaSyCYeIbDzTfZnXjJkfJG6EQynOWkblj4msQ",
	authDomain: "scottish-attendance.firebaseapp.com",
	projectId: "scottish-attendance",
	storageBucket: "scottish-attendance.firebasestorage.app",
	messagingSenderId: "375230490779",
	appId: "1:375230490779:web:637d2d9205133c270afe3e",
};

const firebaseApp = initializeApp(firebaseConfig);

export const db = getFirestore();

export const addCollectionAndDocuments = async (collectionKey, objectsToAdd, field) => {
	const collectionRef = collection(db, collectionKey);
	const batch = writeBatch(db);

	objectsToAdd.forEach((object) => {
		const docRef = doc(collectionRef, object.date.toString());
		batch.set(docRef, object);
	});

	await batch.commit();
	console.log("done");
};

export const checkAttendanceExists = async (branchId, yearMonth) => {
	try {
		const attendanceRef = doc(db, "branches", branchId, "attendanceLogs", yearMonth);
		const existingDoc = await getDoc(attendanceRef);
		return existingDoc.exists();
	} catch (error) {
		console.error("Error checking attendance:", error);
		throw error;
	}
};

export const saveAttendanceData = async (branchId, yearMonth, attendanceData, forceOverwrite) => {
	try {
		const attendanceRef = doc(db, "branches", branchId, "attendanceLogs", yearMonth);
		const existingDoc = await getDoc(attendanceRef);

		// If document exists and not forcing overwrite, reject the request
		if (existingDoc.exists() && !forceOverwrite) {
			throw new Error(`Attendance data for ${yearMonth} already exists.`);
		}

		// Merge with existing data if overwriting
		const newRecords =
			existingDoc.exists() && forceOverwrite
				? { ...existingDoc.data(), ...attendanceData }
				: attendanceData;

		await setDoc(attendanceRef, newRecords);
		console.log(`✅ Attendance for ${yearMonth} saved successfully.`);
	} catch (error) {
		console.error("Error saving attendance:", error);
		throw error;
	}
};

export const addEmployeeDetails = async (formData) => {
	console.log(formData);
	const employeesCollectionRef = collection(db, `branches/${formData.branchId}/employees`);
	const employeeRef = doc(employeesCollectionRef, formData.employeeId);
	console.log(employeeRef);
	const existingDoc = await getDoc(employeeRef);
	console.log(existingDoc);
	if (existingDoc.exists()) {
		console.log("document exists");
		return "Employee with this ID already exists!";
	}
	try {
		console.log("document adding");
		await setDoc(employeeRef, { ...formData });
		return "Employee added successfully!";
	} catch (error) {
		console.error("Error adding employee: ", error);
		return "Failed to add employee";
	}
};

/**
 * Fetches attendance logs for a branch & month-year.
 */
export const getAttendanceLogs = async (branchId, monthYear) => {
	try {
		const docRef = doc(db, `branches/${branchId}/attendanceLogs/${monthYear}`);
		const docSnap = await getDoc(docRef);
		return docSnap.exists() ? docSnap.data() : null;
	} catch (error) {
		console.error("Error fetching attendance logs:", error);
		return null;
	}
};

/**
 * Fetches all employees and their shift timings.
 */
export const getEmployees = async (branchId) => {
	try {
		const employeesRef = collection(db, `branches/${branchId}/employees`);
		const snapshot = await getDocs(employeesRef);
		const employees = {};
		snapshot.forEach((doc) => {
			employees[doc.id] = doc.data();
		});
		return employees;
	} catch (error) {
		console.error("Error fetching employees:", error);
		return {};
	}
};

/**
 * Stores processed attendance inside each employee's document.
 */
export const saveProcessedAttendance = async (branchId, monthYear, processedAttendance) => {
	try {
		const updates = Object.entries(processedAttendance).map(async ([employeeId, data]) => {
			const employeeRef = doc(db, `branches/${branchId}/employees/${employeeId}`);
			const employeeDoc = await getDoc(employeeRef);

			// Merge existing attendance data with new data
			const currentAttendance = employeeDoc.exists() ? employeeDoc.data().attendance || {} : {};
			currentAttendance[monthYear] = data; // Store attendance under month-year

			await setDoc(employeeRef, { attendance: currentAttendance }, { merge: true });
		});

		await Promise.all(updates);
		console.log("Attendance saved successfully.");
	} catch (error) {
		console.error("Error saving attendance:", error);
	}
};

// Fetch Employee Details
export const getEmployeeDetails = async (branchId, employeeId) => {
	const employeeRef = doc(db, `branches/${branchId}/employees/${employeeId}`);
	const employeeDoc = await getDoc(employeeRef);
	return employeeDoc.exists ? employeeDoc.data() : null;
};

// Organization Settings Service
export const OrganizationSettingsService = {
	async getSettings() {
		try {
			const db = getFirestore();
			const settingsRef = doc(db, "settings", "organizationSettings");
			const docSnap = await getDoc(settingsRef);
			if (docSnap.exists()) {
				return docSnap.data();
			}
			return {
				departments: [],
				positions: [],
				branches: [],
				shiftSchedules: [],
			};
		} catch (error) {
			console.error("Error fetching organization settings:", error);
			return {
				departments: [],
				positions: [],
				branches: [],
				shiftSchedules: [],
			};
		}
	},

	async getNextId(counterName) {
		const db = getFirestore();
		const counterRef = doc(db, "counters", counterName);

		try {
			// Use a transaction to ensure atomic increment of the counter
			return await runTransaction(db, async (transaction) => {
				const counterDoc = await transaction.get(counterRef);

				let currentId = 1; // Start with 1 if counter doesn't exist

				if (counterDoc.exists()) {
					currentId = counterDoc.data().value + 1;
				}

				// Update the counter with the new value
				transaction.set(counterRef, { value: currentId });

				return currentId;
			});
		} catch (error) {
			console.error(`Error getting next ${counterName} ID:`, error);
			throw error;
		}
	},

	// Get prefix for each item type
	getItemPrefix(itemType) {
		const prefixes = {
			branches: "B",
			departments: "D",
			positions: "P",
			shiftSchedules: "S",
		};
		return prefixes[itemType] || "X";
	},

	// Format ID with prefix and padding (e.g., D001)
	formatId(prefix, numericId) {
		return `${prefix}${numericId.toString().padStart(3, "0")}`;
	},

	// Check if ID already exists in the array
	idExists(items, id) {
		return items.some(
			(item) =>
				(typeof item === "object" && item.id === id) || (typeof item === "string" && item === id)
		);
	},

	async addItem(itemType, newItem) {
		const db = getFirestore();
		const settingsRef = doc(db, "settings", "organizationSettings");

		try {
			const docSnap = await getDoc(settingsRef);
			if (docSnap.exists()) {
				const settings = docSnap.data();
				const updatedItems = [...(settings[itemType] || [])];
				const prefix = this.getItemPrefix(itemType);

				// Handle different item types
				if (itemType === "shiftSchedules") {
					// For shift schedules (complex objects)
					let numericId;

					if (newItem.id && typeof newItem.id === "string" && newItem.id.startsWith(prefix)) {
						// If ID is already provided and valid, use it
						console.log("Using provided ID for shift schedule");
					} else {
						// Get the next sequential ID
						numericId = await this.getNextId(itemType);
						const formattedId = this.formatId(prefix, numericId);

						// Check if ID already exists to prevent duplicates
						if (this.idExists(updatedItems, formattedId)) {
							console.warn(`ID ${formattedId} already exists, getting a new ID`);
							// Recursively try again with a new ID
							return this.addItem(itemType, { ...newItem, id: null });
						}

						// Add ID to item
						newItem = {
							...newItem,
							id: formattedId,
							numericId: numericId,
						};
					}

					updatedItems.push(newItem);
				} else if (itemType === "branches") {
					// For branches
					let numericId;

					if (newItem.id && typeof newItem.id === "number") {
						numericId = newItem.id;
					} else {
						numericId = await this.getNextId(itemType);
					}

					const formattedId = this.formatId(prefix, numericId);

					// Check if ID already exists to prevent duplicates
					if (this.idExists(updatedItems, formattedId)) {
						console.warn(`Branch ID ${formattedId} already exists, getting a new ID`);
						return this.addItem(itemType, { ...newItem, id: null });
					}

					const branchWithId = {
						id: formattedId,
						numericId: numericId,
						name: newItem.name,
					};

					updatedItems.push(branchWithId);
				} else {
					// For departments and positions
					// Convert from string-based to object-based for consistency
					const numericId = await this.getNextId(itemType);
					const formattedId = this.formatId(prefix, numericId);

					// Check if ID already exists to prevent duplicates
					if (this.idExists(updatedItems, formattedId)) {
						console.warn(`${itemType} ID ${formattedId} already exists, getting a new ID`);
						return this.addItem(itemType, newItem);
					}

					// For departments and positions, convert string value to object
					const name = typeof newItem === "string" ? newItem : newItem.name;
					const itemWithId = {
						id: formattedId,
						numericId: numericId,
						name: name,
					};

					updatedItems.push(itemWithId);
				}

				await setDoc(
					settingsRef,
					{
						...settings,
						[itemType]: updatedItems,
					},
					{ merge: true }
				);

				return updatedItems;
			}
			return [];
		} catch (error) {
			console.error(`Error adding ${itemType}:`, error);
			return null;
		}
	},

	// Get all employees for a specific branch
	async getEmployeesByBranch(branchId) {
		try {
			const db = getFirestore();
			const employeesRef = collection(db, `branches/${branchId}/employees`);
			const q = query(employeesRef);
			const querySnapshot = await getDocs(q);

			const employees = [];
			querySnapshot.forEach((doc) => {
				employees.push({ id: doc.id, ...doc.data() });
			});

			return employees;
		} catch (error) {
			console.error("Error fetching employees:", error);
			return [];
		}
	},

	// Add employee to a specific branch
	async addEmployeeToBranch(branchId, employeeData) {
		try {
			const db = getFirestore();
			const employeeRef = doc(
				db,
				`branches/${branchId}/employees/${employeeData.employment.employeeId}`
			);

			// Check if employee already exists in this branch
			const employeeSnap = await getDoc(employeeRef);

			if (employeeSnap.exists()) {
				console.log("Employee with this ID already exists in this branch.");
				// Instead of returning null, throw an error with specific code and message
				throw {
					code: "DUPLICATE_EMPLOYEE_ID",
					message: `Employee with ID ${employeeData.employment.employeeId} already exists in this branch.`,
				};
			}

			// Proceed with adding the employee
			await setDoc(employeeRef, employeeData);
			return { id: employeeRef.id, ...employeeData };
		} catch (error) {
			console.error("Error adding employee:", error);
			// Re-throw the error to be handled by the calling function
			throw error.code
				? error
				: {
						code: "ADD_EMPLOYEE_ERROR",
						message: error.message || "An error occurred while adding employee",
				  };
		}
	},
};

// Helper function to generate ID from name (kept for backward compatibility)
export const generateId = (name) => {
	return name.toLowerCase().replace(/\s+/g, "-");
};
