import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase-config";

/**
 * Helper function to log errors consistently
 * @param {string} operation - The operation that caused the error
 * @param {Error} error - The error object
 */
export const logError = (operation, error) => {
	console.error(`Error during ${operation}:`, error);
	throw error; // Re-throw to allow handling by the caller
};

/**
 * Check if a document exists
 * @param {DocumentReference} docRef - Firestore document reference
 * @returns {Promise<boolean>} - Whether the document exists
 */
export const documentExists = async (docRef) => {
	try {
		const docSnap = await getDoc(docRef);
		return docSnap.exists();
	} catch (error) {
		logError(`checking if document exists at ${docRef.path}`, error);
		return false;
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
 * Convert time string (HH:MM) to minutes since midnight
 * @param {string} timeString - Time in HH:MM format
 * @returns {number} - Minutes since midnight
 */
export const timeStringToMinutes = (timeString) => {
	if (!timeString) return 0;
	
	const [hours, minutes] = timeString.split(':').map(Number);
	return (hours * 60) + minutes;
};

/**
 * Get months between two YYYY-MM dates
 * @param {string} startMonth - Start month in YYYY-MM format
 * @param {string} endMonth - End month in YYYY-MM format
 * @returns {Array<string>} - Array of months in YYYY-MM format
 */
export const getMonthsBetween = (startMonth, endMonth) => {
	const result = [];
	const [startYear, startMonthNum] = startMonth.split('-').map(Number);
	const [endYear, endMonthNum] = endMonth.split('-').map(Number);
	
	let currentYear = startYear;
	let currentMonth = startMonthNum;
	
	while (
		currentYear < endYear || 
		(currentYear === endYear && currentMonth <= endMonthNum)
	) {
		result.push(`${currentYear}-${String(currentMonth).padStart(2, '0')}`);
		
		currentMonth++;
		if (currentMonth > 12) {
			currentMonth = 1;
			currentYear++;
		}
	}
	
	return result;
};