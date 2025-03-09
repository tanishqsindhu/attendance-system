import { db } from "./firebase-config";
import { documentExists, logError } from "./firebase-utils";
import { doc, getDoc, setDoc, collection, getDocs, query } from "firebase/firestore";

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
 * Update employee details in a branch
 * @param {string} branchId - Branch ID
 * @param {string} employeeId - Employee ID
 * @param {Object} updatedData - Updated employee data
 * @returns {Promise<Object>} - Updated employee
 */
export const updateEmployeeDetails = async (branchId, employeeId, updatedData) => {
	if (!branchId || !employeeId) {
		throw new Error("branchId and employeeId are required");
	}

	try {
		// Get the reference to the employee document
		const employeeRef = doc(db, `branches/${branchId}/employees/${employeeId}`);

		// Check if employee exists
		const employeeDoc = await getDoc(employeeRef);
		if (!employeeDoc.exists()) {
			throw {
				code: "EMPLOYEE_NOT_FOUND",
				message: `Employee with ID ${employeeId} does not exist.`,
			};
		}

		// Get current employee data
		const currentData = employeeDoc.data();

		// Merge current data with updated data
		const mergedData = {
			...currentData,
			...updatedData,
			updatedAt: new Date().toISOString(),
		};

		// Update the document
		await setDoc(employeeRef, mergedData);

		return { id: employeeId, ...mergedData };
	} catch (error) {
		logError("updateEmployeeDetails", error);
		throw error.code
			? error
			: {
					code: "UPDATE_EMPLOYEE_ERROR",
					message: error.message || "Failed to update employee details.",
			  };
	}
};

/**
 * Soft delete an employee (mark as deleted)
 * @param {string} branchId - Branch ID
 * @param {string} employeeId - Employee ID
 * @returns {Promise<Object>} - Result of the operation
 */
export const deleteEmployee = async (branchId, employeeId) => {
	if (!branchId || !employeeId) {
		throw new Error("branchId and employeeId are required");
	}

	try {
		// Get the reference to the employee document
		const employeeRef = doc(db, `branches/${branchId}/employees/${employeeId}`);

		// Check if employee exists
		const employeeDoc = await getDoc(employeeRef);
		if (!employeeDoc.exists()) {
			throw {
				code: "EMPLOYEE_NOT_FOUND",
				message: `Employee with ID ${employeeId} does not exist.`,
			};
		}

		// Get current employee data
		const currentData = employeeDoc.data();

		// Mark as deleted and add deletion timestamp
		const updatedData = {
			...currentData,
			deleted: true,
			deletedAt: new Date().toISOString(),
		};

		// Update the document
		await setDoc(employeeRef, updatedData);

		return {
			success: true,
			message: `Employee ${employeeId} has been marked as deleted.`,
			id: employeeId,
		};
	} catch (error) {
		logError("deleteEmployee", error);
		throw error.code
			? error
			: {
					code: "DELETE_EMPLOYEE_ERROR",
					message: error.message || "Failed to delete employee.",
			  };
	}
};

/**
 * Modified addEmployeeToBranch to include deleted flag (false by default)
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

		// Add creation timestamp and set deleted flag to false by default
		const enrichedData = {
			...employeeData,
			deleted: false, // Set default deleted status to false
			createdAt: new Date().toISOString(),
		};

		await setDoc(employeeRef, enrichedData);
		return { id: employeeId, ...enrichedData };
	} catch (error) {
		logError("addEmployeeToBranch", error);
		throw error.code
			? error
			: {
					code: "ADD_EMPLOYEE_ERROR",
					message: error.message || "Failed to add employee.",
			  };
	}
};

/**
 * Get all active (non-deleted) employees
 * @param {string} branchId - Branch ID
 * @returns {Promise<Object>} - Map of employee IDs to employee data (only non-deleted)
 */
export const getActiveEmployees = async (branchId) => {
	if (!branchId) {
		throw new Error("branchId is required");
	}

	try {
		const employeesRef = collection(db, `branches/${branchId}/employees`);
		const snapshot = await getDocs(query(employeesRef));

		return snapshot.docs.reduce((acc, doc) => {
			const data = doc.data();
			// Only include employees that aren't deleted
			if (!data.deleted) {
				acc[doc.id] = data;
			}
			return acc;
		}, {});
	} catch (error) {
		logError("getActiveEmployees", error);
		return {};
	}
};
