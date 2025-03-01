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
	storageBucket: "scottish-attendance.appspot.com",
	messagingSenderId: "375230490779",
	appId: "1:375230490779:web:637d2d9205133c270afe3e",
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore();

// Helper function to log errors consistently
const logError = (operation, error) => {
	console.error(`Error during ${operation}:`, error);
	throw error; // Re-throw to allow handling by the caller
};

// Helper function to check if a document exists
const documentExists = async (docRef) => {
	const docSnap = await getDoc(docRef);
	return docSnap.exists();
};

// Add multiple documents in a batch
export const addCollectionAndDocuments = async (collectionKey, objectsToAdd) => {
	try {
		const collectionRef = collection(db, collectionKey);
		const batch = writeBatch(db);

		objectsToAdd.forEach((object) => {
			const docRef = doc(collectionRef, object.date.toString());
			batch.set(docRef, object);
		});

		await batch.commit();
		console.log("Batch write completed successfully.");
	} catch (error) {
		logError("addCollectionAndDocuments", error);
	}
};

// Check if attendance data exists for a branch and month
export const checkAttendanceExists = async (branchId, yearMonth) => {
	try {
		const attendanceRef = doc(db, "branches", branchId, "attendanceLogs", yearMonth);
		return await documentExists(attendanceRef);
	} catch (error) {
		logError("checkAttendanceExists", error);
	}
};

// Save attendance data with optional overwrite
export const saveAttendanceData = async (
	branchId,
	yearMonth,
	attendanceData,
	forceOverwrite = false
) => {
	try {
		const attendanceRef = doc(db, "branches", branchId, "attendanceLogs", yearMonth);
		const exists = await documentExists(attendanceRef);

		if (exists && !forceOverwrite) {
			throw new Error(`Attendance data for ${yearMonth} already exists.`);
		}

		const newRecords =
			exists && forceOverwrite
				? { ...(await getDoc(attendanceRef)).data(), ...attendanceData }
				: attendanceData;
		await setDoc(attendanceRef, newRecords);
		console.log(`✅ Attendance for ${yearMonth} saved successfully.`);
	} catch (error) {
		logError("saveAttendanceData", error);
	}
};

// Add employee details
export const addEmployeeDetails = async (formData) => {
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
		return "Failed to add employee";
	}
};

// Fetch attendance logs for a branch and month-year
export const getAttendanceLogs = async (branchId, monthYear) => {
	try {
		const docRef = doc(db, `branches/${branchId}/attendanceLogs/${monthYear}`);
		const docSnap = await getDoc(docRef);
		return docSnap.exists() ? docSnap.data() : null;
	} catch (error) {
		logError("getAttendanceLogs", error);
		return null;
	}
};

// Fetch all employees and their shift timings
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
		logError("getEmployees", error);
		return {};
	}
};

// Save processed attendance for each employee
export const saveProcessedAttendance = async (branchId, monthYear, processedAttendance) => {
	try {
		const updates = Object.entries(processedAttendance).map(async ([employeeId, data]) => {
			const employeeRef = doc(db, `branches/${branchId}/employees/${employeeId}`);
			const employeeDoc = await getDoc(employeeRef);

			const currentAttendance = employeeDoc.exists() ? employeeDoc.data().attendance || {} : {};
			currentAttendance[monthYear] = data;

			await setDoc(employeeRef, { attendance: currentAttendance }, { merge: true });
		});

		await Promise.all(updates);
		console.log("Attendance saved successfully.");
	} catch (error) {
		logError("saveProcessedAttendance", error);
	}
};

// Fetch employee details
export const getEmployeeDetails = async (branchId, employeeId) => {
	try {
		const employeeRef = doc(db, `branches/${branchId}/employees/${employeeId}`);
		const employeeDoc = await getDoc(employeeRef);
		return employeeDoc.exists() ? employeeDoc.data() : null;
	} catch (error) {
		logError("getEmployeeDetails", error);
		return null;
	}
};

// Organization Settings Service
export const OrganizationSettingsService = {
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

	async getNextId(counterName) {
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
		try {
			const settingsRef = doc(db, "settings", "organizationSettings");
			const docSnap = await getDoc(settingsRef);
			if (!docSnap.exists()) return [];

			const settings = docSnap.data();
			const updatedItems = [...(settings[itemType] || [])];
			const prefix = this.getItemPrefix(itemType);

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
			};

			updatedItems.push(itemWithId);
			await setDoc(settingsRef, { ...settings, [itemType]: updatedItems }, { merge: true });
			return updatedItems;
		} catch (error) {
			logError(`addItem for ${itemType}`, error);
			return null;
		}
	},

	async getEmployeesByBranch(branchId) {
		try {
			const employeesRef = collection(db, `branches/${branchId}/employees`);
			const querySnapshot = await getDocs(query(employeesRef));
			return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
		} catch (error) {
			logError("getEmployeesByBranch", error);
			return [];
		}
	},

	async addEmployeeToBranch(branchId, employeeData) {
		try {
			const employeeRef = doc(
				db,
				`branches/${branchId}/employees/${employeeData.employment.employeeId}`
			);

			if (await documentExists(employeeRef)) {
				throw {
					code: "DUPLICATE_EMPLOYEE_ID",
					message: `Employee with ID ${employeeData.employment.employeeId} already exists.`,
				};
			}

			await setDoc(employeeRef, employeeData);
			return { id: employeeRef.id, ...employeeData };
		} catch (error) {
			logError("addEmployeeToBranch", error);
			throw error.code
				? error
				: { code: "ADD_EMPLOYEE_ERROR", message: error.message || "Failed to add employee." };
		}
	},
};

// Helper function to generate ID from name
export const generateId = (name) => name.toLowerCase().replace(/\s+/g, "-");
