import { db } from "./firebase-config";
import { documentExists, logError } from "./firebase-utils";
import { doc, getDoc, setDoc, collection, getDocs, query } from "firebase/firestore";

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
 * Add an employee to a branch
 * @param {string} branchId - Branch ID
 * @param {Object} employeeData - Employee data
 * @returns {Promise<Object>} - Added employee
 */
export const addEmployeeToBranch = async (branchId, employeeData) => {
	if (!branchId || !employeeData || !employeeData.employment || !employeeData.employment.employeeId) {
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
		throw error.code ? error : { code: "ADD_EMPLOYEE_ERROR", message: error.message || "Failed to add employee." };
	}
};
