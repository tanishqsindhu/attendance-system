// Add these functions to your firebase/index.js file

import {
	doc,
	collection,
	addDoc,
	updateDoc,
	getDocs,
	query,
	where,
	orderBy,
	serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebase/firebase-config";

/**
 * Add a new salary transaction for an employee
 *
 * @param {string} branchId - The branch ID
 * @param {string} employeeId - The employee ID
 * @param {object} transactionData - The transaction data
 * @returns {Promise<object>} - The created transaction with ID
 */
export const addTransaction = async (branchId, employeeId, transactionData) => {
	try {
		// Create a reference to the transactions collection
		const transactionsCollectionRef = collection(db, "branches", branchId, "transactions");

		// Add a timestamp to the transaction data
		const dataWithTimestamp = {
			...transactionData,
			employeeId,
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		};

		// Add the document to the collection
		const docRef = await addDoc(transactionsCollectionRef, dataWithTimestamp);

		// Update the employee's account balance if needed
		// This would depend on your data model

		return {
			id: docRef.id,
			...dataWithTimestamp,
		};
	} catch (error) {
		console.error("Error adding transaction:", error);
		throw error;
	}
};

/**
 * Get all transactions for an employee
 *
 * @param {string} branchId - The branch ID
 * @param {string} employeeId - The employee ID
 * @returns {Promise<Array>} - Array of transaction objects
 */
export const getEmployeeTransactions = async (branchId, employeeId) => {
	try {
		// Create a reference to the transactions collection
		const transactionsCollectionRef = collection(db, "branches", branchId, "transactions");

		// Create a query for the employee's transactions
		const q = query(
			transactionsCollectionRef,
			where("employeeId", "==", employeeId),
			orderBy("createdAt", "desc")
		);

		// Execute the query
		const querySnapshot = await getDocs(q);

		// Map the document data to an array
		const transactions = [];
		querySnapshot.forEach((doc) => {
			transactions.push({
				id: doc.id,
				...doc.data(),
				// Convert Firestore timestamp to ISO string
				date: doc.data().createdAt
					? doc.data().createdAt.toDate().toISOString()
					: new Date().toISOString(),
			});
		});

		return transactions;
	} catch (error) {
		console.error("Error getting employee transactions:", error);
		throw error;
	}
};

/**
 * Update a transaction's status or details
 *
 * @param {string} branchId - The branch ID
 * @param {string} transactionId - The transaction ID
 * @param {object} updateData - The data to update
 * @returns {Promise<void>}
 */
export const updateTransaction = async (branchId, transactionId, updateData) => {
	try {
		// Create a reference to the transaction document
		const transactionDocRef = doc(db, "branches", branchId, "transactions", transactionId);

		// Add an updated timestamp
		const dataWithTimestamp = {
			...updateData,
			updatedAt: serverTimestamp(),
		};

		// Update the document
		await updateDoc(transactionDocRef, dataWithTimestamp);
	} catch (error) {
		console.error("Error updating transaction:", error);
		throw error;
	}
};
