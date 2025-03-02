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

// Firebase configuration
const firebaseConfig = {
	apiKey: "AIzaSyCYeIbDzTfZnXjJkfJG6EQynOWkblj4msQ",
	authDomain: "scottish-attendance.firebaseapp.com",
	projectId: "scottish-attendance",
	storageBucket: "scottish-attendance.appspot.com",
	messagingSenderId: "375230490779",
	appId: "1:375230490779:web:637d2d9205133c270afe3e",
};

// Initialize Firebase once
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Helper function to log errors consistently
 * @param {string} operation - The operation that caused the error
 * @param {Error} error - The error object
 */
const logError = (operation, error) => {
	console.error(`Error during ${operation}:`, error);
	throw error; // Re-throw to allow handling by the caller
};

/**
 * Check if a document exists
 * @param {DocumentReference} docRef - Firestore document reference
 * @returns {Promise<boolean>} - Whether the document exists
 */
const documentExists = async (docRef) => {
	try {
		const docSnap = await getDoc(docRef);
		return docSnap.exists();
	} catch (error) {
		logError(`checking if document exists at ${docRef.path}`, error);
		return false;
	}
};

/**
 * Add multiple documents in a batch
 * @param {string} collectionKey - Collection to add documents to
 * @param {Array} objectsToAdd - Array of objects to add as documents
 * @returns {Promise<void>}
 */
export const addCollectionAndDocuments = async (collectionKey, objectsToAdd) => {
	if (!Array.isArray(objectsToAdd) || objectsToAdd.length === 0) {
		console.warn("No objects provided to add to collection");
		return;
	}

	try {
		const collectionRef = collection(db, collectionKey);
		const batch = writeBatch(db);

		objectsToAdd.forEach((object) => {
			if (!object.date) {
				throw new Error("Each object must have a date property");
			}
			const docRef = doc(collectionRef, object.date.toString());
			batch.set(docRef, object);
		});

		await batch.commit();
		console.log(`✅ Added ${objectsToAdd.length} documents to ${collectionKey}`);
	} catch (error) {
		logError("addCollectionAndDocuments", error);
	}
};

/**
 * Check if attendance data exists for a branch and month
 * @param {string} branchId - Branch ID
 * @param {string} yearMonth - Year and month in format YYYY-MM
 * @returns {Promise<boolean>} - Whether attendance data exists
 */
export const checkAttendanceExists = async (branchId, yearMonth) => {
	if (!branchId || !yearMonth) {
		throw new Error("branchId and yearMonth are required");
	}

	try {
		const attendanceRef = doc(db, "branches", branchId, "attendanceLogs", yearMonth);
		return await documentExists(attendanceRef);
	} catch (error) {
		logError("checkAttendanceExists", error);
		return false;
	}
};

/**
 * Save attendance data with optional overwrite
 * @param {string} branchId - Branch ID
 * @param {string} yearMonth - Year and month in format YYYY-MM
 * @param {Object} attendanceData - Attendance data to save
 * @param {boolean} forceOverwrite - Whether to overwrite existing data
 * @returns {Promise<void>}
 */
export const saveAttendanceData = async (
	branchId,
	yearMonth,
	attendanceData,
	forceOverwrite = false
) => {
	if (!branchId || !yearMonth || !attendanceData) {
		throw new Error("branchId, yearMonth, and attendanceData are required");
	}

	try {
		const attendanceRef = doc(db, "branches", branchId, "attendanceLogs", yearMonth);
		const exists = await documentExists(attendanceRef);

		if (exists && !forceOverwrite) {
			throw new Error(`Attendance data for ${yearMonth} already exists.`);
		}

		let newRecords = attendanceData;
		if (exists && forceOverwrite) {
			const existingData = (await getDoc(attendanceRef)).data() || {};
			newRecords = { ...existingData, ...attendanceData };
		}

		await setDoc(attendanceRef, newRecords);
		console.log(`✅ Attendance for ${yearMonth} saved successfully.`);
		return true;
	} catch (error) {
		logError("saveAttendanceData", error);
		return false;
	}
};

/**
 * Add employee details
 * @param {Object} formData - Employee data with branchId and employeeId
 * @returns {Promise<string>} - Success or error message
 */
export const addEmployeeDetails = async (formData) => {
	if (!formData || !formData.branchId || !formData.employeeId) {
		throw new Error("Employee data must include branchId and employeeId");
	}

	try {
		const employeesCollectionRef = collection(db, `branches/${formData.branchId}/employees`);
		const employeeRef = doc(employeesCollectionRef, formData.employeeId);

		if (await documentExists(employeeRef)) {
			throw new Error("Employee with this ID already exists!");
		}

		await setDoc(employeeRef, formData);
		return "Employee added successfully!";
	} catch (error) {
		logError("addEmployeeDetails", error);
		return "Failed to add employee: " + error.message;
	}
};

/**
 * Fetch attendance logs for a branch and month-year
 * @param {string} branchId - Branch ID
 * @param {string} monthYear - Month and year in format YYYY-MM
 * @returns {Promise<Object|null>} - Attendance logs or null if none exist
 */
export const getAttendanceLogs = async (branchId, monthYear) => {
	if (!branchId || !monthYear) {
		throw new Error("branchId and monthYear are required");
	}

	try {
		const docRef = doc(db, `branches/${branchId}/attendanceLogs/${monthYear}`);
		const docSnap = await getDoc(docRef);
		return docSnap.exists() ? docSnap.data() : null;
	} catch (error) {
		logError("getAttendanceLogs", error);
		return null;
	}
};

/**
 * Fetch all employees for a branch
 * @param {string} branchId - Branch ID
 * @returns {Promise<Object>} - Map of employee IDs to employee data
 */
export const getEmployees = async (branchId) => {
	if (!branchId) {
		throw new Error("branchId is required");
	}

	try {
		const employeesRef = collection(db, `branches/${branchId}/employees`);
		const snapshot = await getDocs(query(employeesRef));

		return snapshot.docs.reduce((acc, doc) => {
			acc[doc.id] = doc.data();
			return acc;
		}, {});
	} catch (error) {
		logError("getEmployees", error);
		return {};
	}
};

/**
 * Save processed attendance for each employee
 * @param {string} branchId - Branch ID
 * @param {string} monthYear - Month and year in format MM-YYYY
 * @param {Object} processedAttendance - Map of employee IDs to attendance data
 * @returns {Promise<boolean>} - Whether the operation succeeded
 */
export const saveProcessedAttendance = async (branchId, monthYear, processedAttendance) => {
	if (!branchId || !monthYear || !processedAttendance) {
		throw new Error("branchId, monthYear, and processedAttendance are required");
	}

	try {
		const batch = writeBatch(db);
		const employeeIds = Object.keys(processedAttendance);

		// Get all employee docs in a single batch
		const employeeDocs = await Promise.all(
			employeeIds.map(async (employeeId) => {
				const ref = doc(db, `branches/${branchId}/employees/${employeeId}`);
				return { ref, data: (await getDoc(ref)).data() || {} };
			})
		);

		// Update all employees in a batch
		employeeDocs.forEach(({ ref, data }) => {
			const employeeId = ref.id;
			const attendance = data.attendance || {};
			attendance[monthYear] = processedAttendance[employeeId];

			batch.set(ref, { attendance }, { merge: true });
		});

		await batch.commit();
		console.log("✅ Attendance saved successfully for all employees.");
		return true;
	} catch (error) {
		logError("saveProcessedAttendance", error);
		return false;
	}
};

/**
 * Fetch employee details
 * @param {string} branchId - Branch ID
 * @param {string} employeeId - Employee ID
 * @returns {Promise<Object|null>} - Employee data or null if not found
 */
export const getEmployeeDetails = async (branchId, employeeId) => {
	if (!branchId || !employeeId) {
		throw new Error("branchId and employeeId are required");
	}

	try {
		const employeeRef = doc(db, `branches/${branchId}/employees/${employeeId}`);
		const employeeDoc = await getDoc(employeeRef);
		return employeeDoc.exists() ? employeeDoc.data() : null;
	} catch (error) {
		logError("getEmployeeDetails", error);
		return null;
	}
};

/**
 * Organization Settings Service
 */
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

			const itemWithId = {
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

	/**
	 * Add an employee to a branch
	 * @param {string} branchId - Branch ID
	 * @param {Object} employeeData - Employee data
	 * @returns {Promise<Object>} - Added employee
	 */
	async addEmployeeToBranch(branchId, employeeData) {
		if (
			!branchId ||
			!employeeData ||
			!employeeData.employment ||
			!employeeData.employment.employeeId
		) {
			throw new Error("branchId and employeeData with employment.employeeId are required");
		}

		try {
			const employeeId = employeeData.employment.employeeId;
			const employeeRef = doc(db, `branches/${branchId}/employees/${employeeId}`);

			if (await documentExists(employeeRef)) {
				throw {
					code: "DUPLICATE_EMPLOYEE_ID",
					message: `Employee with ID ${employeeId} already exists.`,
				};
			}

			// Add creation timestamp
			const enrichedData = {
				...employeeData,
				createdAt: new Date().toISOString(),
			};

			await setDoc(employeeRef, enrichedData);
			return { id: employeeId, ...enrichedData };
		} catch (error) {
			logError("addEmployeeToBranch", error);
			throw error.code
				? error
				: { code: "ADD_EMPLOYEE_ERROR", message: error.message || "Failed to add employee." };
		}
	},
};

/**
 * Fetch available attendance log periods for a branch
 * @param {string} branchId - Branch ID
 * @returns {Promise<Array<{year: string, months: string[]}>>} - Available attendance log periods grouped by year
 */
export const getAvailableAttendancePeriods = async (branchId) => {
	if (!branchId) {
		throw new Error("branchId is required");
	}

	try {
		const attendanceLogsRef = collection(db, `branches/${branchId}/attendanceLogs`);
		const snapshot = await getDocs(query(attendanceLogsRef));

		// Group by year
		const periodsByYear = {};

		snapshot.docs.forEach((doc) => {
			const periodId = doc.id; // Format: MM-YYYY
			if (periodId && periodId.includes("-")) {
				const [month, year] = periodId.split("-");

				if (!periodsByYear[year]) {
					periodsByYear[year] = [];
				}

				periodsByYear[year].push(month);
			}
		});

		// Convert to array format sorted by year (descending) and month (ascending)
		const result = Object.keys(periodsByYear)
			.sort((a, b) => b - a) // Sort years descending
			.map((year) => ({
				year,
				months: periodsByYear[year].sort(), // Sort months ascending
			}));

		return result;
	} catch (error) {
		logError("getAvailableAttendancePeriods", error);
		return [];
	}
};

/**
 * Generate ID from name by converting to lowercase and replacing spaces with hyphens
 * @param {string} name - Name to convert to ID
 * @returns {string} - Generated ID
 */
export const generateId = (name) => {
	if (typeof name !== "string") {
		throw new Error("Name must be a string");
	}
	return name.toLowerCase().replace(/\s+/g, "-");
};

/**
 * Fetches attendance logs for an employee
 * @param {string} branchId - ID of the branch
 * @param {string} employeeId - ID of the employee
 * @param {string} monthYear - Month and year in MM-YYYY format
 * @returns {Promise<Object>} - Attendance logs
 */
export const getEmployeeAttendanceLogs = async (branchId, employeeId, monthYear) => {
	try {
		const employeeRef = doc(db, `branches/${branchId}/employees`, employeeId);
		const employeeSnap = await getDoc(employeeRef);

		if (!employeeSnap.exists()) {
			throw new Error("Employee not found");
		}

		const employeeData = employeeSnap.data();
		return employeeData.attendance?.[monthYear] || {};
	} catch (error) {
		console.error("Error fetching attendance logs:", error);
		throw error;
	}
};

/**
 * Fetches transaction history for an employee
 * @param {string} branchId - ID of the branch
 * @param {string} employeeId - ID of the employee
 * @returns {Promise<Array>} - Array of transactions
 */
export const getEmployeeTransactions = async (branchId, employeeId) => {
	try {
		const transactionsRef = collection(
			db,
			`branches/${branchId}/employees/${employeeId}/transactions`
		);
		const transactionsQuery = query(transactionsRef, orderBy("date", "desc"));
		const transactionsSnap = await getDocs(transactionsQuery);

		if (transactionsSnap.empty) {
			return [];
		}

		return transactionsSnap.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		}));
	} catch (error) {
		console.error("Error fetching employee transactions:", error);
		throw error;
	}
};

/**
 * Adds a new transaction for an employee
 * @param {string} branchId - ID of the branch
 * @param {string} employeeId - ID of the employee
 * @param {Object} transaction - Transaction details
 * @param {string} transaction.type - Type of transaction (salary, advance, bonus, etc.)
 * @param {number} transaction.amount - Transaction amount
 * @param {string} transaction.status - Transaction status (paid, pending, cancelled)
 * @param {string} transaction.description - Transaction description
 * @returns {Promise<Object>} - Added transaction with ID
 */
export const addEmployeeTransaction = async (branchId, employeeId, transaction) => {
	try {
		const transactionsRef = collection(
			db,
			`branches/${branchId}/employees/${employeeId}/transactions`
		);

		// Create transaction object with server timestamp
		const newTransaction = {
			...transaction,
			date: transaction.date ? Timestamp.fromDate(new Date(transaction.date)) : serverTimestamp(),
			createdAt: serverTimestamp(),
		};

		const docRef = await addDoc(transactionsRef, newTransaction);

		// Return the created transaction with ID
		return {
			id: docRef.id,
			...newTransaction,
			// Replace serverTimestamp with actual Timestamp for immediate use in UI
			date: newTransaction.date.toDate ? newTransaction.date : new Date(),
			createdAt: new Date(),
		};
	} catch (error) {
		console.error("Error adding employee transaction:", error);
		throw error;
	}
};

/**
 * Updates an existing transaction for an employee
 * @param {string} branchId - ID of the branch
 * @param {string} employeeId - ID of the employee
 * @param {string} transactionId - ID of the transaction to update
 * @param {Object} updatedFields - Fields to update
 * @returns {Promise<Object>} - Updated transaction
 */
export const updateEmployeeTransaction = async (
	branchId,
	employeeId,
	transactionId,
	updatedFields
) => {
	try {
		const transactionRef = doc(
			db,
			`branches/${branchId}/employees/${employeeId}/transactions`,
			transactionId
		);

		await updateDoc(transactionRef, {
			...updatedFields,
			updatedAt: serverTimestamp(),
		});

		const updatedSnapshot = await getDoc(transactionRef);

		return {
			id: updatedSnapshot.id,
			...updatedSnapshot.data(),
		};
	} catch (error) {
		console.error("Error updating employee transaction:", error);
		throw error;
	}
};

/**
 * Gets a summary of employee transactions (totals by type)
 * @param {string} branchId - ID of the branch
 * @param {string} employeeId - ID of the employee
 * @returns {Promise<Object>} - Transaction summary
 */
export const getEmployeeTransactionSummary = async (branchId, employeeId) => {
	try {
		const transactions = await getEmployeeTransactions(branchId, employeeId);

		// Calculate totals by transaction type
		const summary = transactions.reduce(
			(acc, transaction) => {
				const type = transaction.type || "other";
				const status = transaction.status || "unknown";

				// Only count paid transactions in the totals
				if (status === "paid") {
					acc.totalPaid = (acc.totalPaid || 0) + transaction.amount;
					acc.byType[type] = (acc.byType[type] || 0) + transaction.amount;
				}

				// Track pending amounts separately
				if (status === "pending") {
					acc.totalPending = (acc.totalPending || 0) + transaction.amount;
				}

				return acc;
			},
			{ byType: {}, totalPaid: 0, totalPending: 0 }
		);

		return summary;
	} catch (error) {
		console.error("Error getting transaction summary:", error);
		throw error;
	}
};
