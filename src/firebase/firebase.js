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
	serverTimestamp,
	addDoc,
	where,
	orderBy,
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
	

// 1. First, let's extend the organization settings to include holiday and attendance rules
// Add this to OrganizationSettingsService in firebase.js

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
	  
	  const newHoliday = {
		id: holidayId,
		date: holidayData.date,
		name: holidayData.name,
		type: holidayData.type || "full", // "full" or "half"
		createdAt: serverTimestamp(),
	  };
	  
	  await setDoc(doc(holidaysRef, holidayId), newHoliday);
	  return newHoliday;
	} catch (error) {
	  logError("addHoliday", error);
	  throw error;
	}
  },
  
  /**
   * Get all holidays in a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
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
		  where("date", "<=", endDate)
		);
	  }
	  
	  const snapshot = await getDocs(q);
	  return snapshot.docs.map(doc => doc.data());
	} catch (error) {
	  logError("getHolidays", error);
	  return [];
	}
  },
  
  /**
   * Save attendance rules for a branch
   * @param {string} branchId - Branch ID
   * @param {Object} rules - Attendance rules
   * @returns {Promise<Object>} - Updated rules
   */
  async saveAttendanceRules(branchId, rules) {
	if (!branchId || !rules) {
	  throw new Error("branchId and rules are required");
	}
	
	try {
	  const rulesRef = doc(db, "branches", branchId, "settings", "attendanceRules");
	  await setDoc(rulesRef, rules, { merge: true });
	  return rules;
	} catch (error) {
	  logError("saveAttendanceRules", error);
	  throw error;
	}
  },
  
  /**
   * Get attendance rules for a branch
   * @param {string} branchId - Branch ID
   * @returns {Promise<Object>} - Attendance rules
   */
  async getAttendanceRules(branchId) {
	if (!branchId) {
	  throw new Error("branchId is required");
	}
	
	try {
	  const rulesRef = doc(db, "branches", branchId, "settings", "attendanceRules");
	  const docSnap = await getDoc(rulesRef);
	  
	  if (!docSnap.exists()) {
		// Return default rules if none exist
		return {
		  lateDeductions: {
			enabled: false,
			deductPerMinute: 0,
			maxDeductionTime: 0,
			halfDayThreshold: 0,
			absentThreshold: 0
		  },
		  customDaySchedules: {}
		};
	  }
	  
	  return docSnap.data();
	} catch (error) {
	  logError("getAttendanceRules", error);
	  throw error;
	}
  }
  
  // 2. Next, let's update the shift schedules model to allow for specific day settings
  // Add this to the addItem method in OrganizationSettingsService for shift schedules
  
  // When adding a shift schedule, allow specific day overrides
  if (itemType === "shiftSchedules") {
	const scheduleWithDayOverrides = {
	  ...(typeof newItem === "object" ? newItem : { name: newItem }),
	  // Default settings
	  defaultTimes: {
		start: newItem.defaultTimes?.start || "08:00",
		end: newItem.defaultTimes?.end || "16:00"
	  },
	  // Day-specific overrides (if any)
	  dayOverrides: newItem.dayOverrides || {},
	  // Flexible time settings (if any)
	  flexibleTime: newItem.flexibleTime || {
		enabled: false,
		graceMinutes: 15
	  }
	};
	
	itemWithId = {
	  id: formattedId,
	  numericId,
	  ...scheduleWithDayOverrides
	};
  }
  
  // 3. Now, let's create a service to handle attendance processing with these new rules
  
  /**
   * Process attendance with deduction rules
   * @param {Object} attendance - Raw attendance record
   * @param {string} employeeId - Employee ID
   * @param {Object} shiftSchedule - Employee's shift schedule
   * @param {Object} rules - Attendance rules for the branch
   * @param {Object} holidays - Map of holidays keyed by date
   * @returns {Object} - Processed attendance with deductions
   */
  export const processAttendanceWithRules = (attendance, employeeId, shiftSchedule, rules, holidays) => {
	if (!attendance || !employeeId || !shiftSchedule || !rules) {
	  throw new Error("Missing required parameters");
	}
	
	const processed = {};
	const dates = Object.keys(attendance);
	
	// Iterate through each date in the attendance record
	dates.forEach(date => {
	  const dayRecord = attendance[date];
	  
	  // Check if it's a holiday
	  const isHoliday = holidays[date];
	  if (isHoliday) {
		processed[date] = {
		  ...dayRecord,
		  status: "holiday",
		  holidayName: isHoliday.name,
		  holidayType: isHoliday.type,
		  deductions: 0
		};
		return;
	  }
	  
	  // Get day of week (0-6, where 0 is Sunday)
	  const dayOfWeek = new Date(date).getDay();
	  const dayName = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][dayOfWeek];
	  
	  // Check if there's a specific schedule for this day
	  const daySchedule = shiftSchedule.dayOverrides?.[dayName] || shiftSchedule.defaultTimes;
	  
	  // Also check if there's a specific schedule for this date in custom day schedules
	  const customSchedule = rules.customDaySchedules?.[date];
	  const scheduledStart = customSchedule?.start || daySchedule.start;
	  const scheduledEnd = customSchedule?.end || daySchedule.end;
	  
	  // Parse times to minutes since midnight for easier comparison
	  const scheduledStartMinutes = timeStringToMinutes(scheduledStart);
	  const actualStartMinutes = timeStringToMinutes(dayRecord.timeIn || "00:00");
	  
	  // Calculate lateness in minutes
	  const latenessMinutes = Math.max(0, actualStartMinutes - scheduledStartMinutes);
	  
	  // Apply deduction rules if enabled
	  let deductions = 0;
	  let attendanceStatus = "present";
	  
	  if (rules.lateDeductions?.enabled && latenessMinutes > 0) {
		const { deductPerMinute, maxDeductionTime, halfDayThreshold, absentThreshold } = rules.lateDeductions;
		
		// If lateness exceeds the absent threshold, mark as absent
		if (latenessMinutes >= absentThreshold) {
		  attendanceStatus = "absent";
		  deductions = 1.0; // Full day deduction
		}
		// If lateness exceeds half-day threshold, mark as half-day
		else if (latenessMinutes >= halfDayThreshold) {
		  attendanceStatus = "half-day";
		  deductions = 0.5; // Half day deduction
		}
		// Otherwise calculate per-minute deductions up to max time
		else {
		  const deductibleMinutes = Math.min(latenessMinutes, maxDeductionTime);
		  deductions = (deductPerMinute / 100) * deductibleMinutes;
		  attendanceStatus = "late";
		}
	  }
	  
	  // Store processed record
	  processed[date] = {
		...dayRecord,
		scheduledStart,
		scheduledEnd,
		latenessMinutes,
		status: attendanceStatus,
		deductions
	  };
	});
	
	return processed;
  };
  
  /**
   * Convert time string (HH:MM) to minutes since midnight
   * @param {string} timeString - Time in HH:MM format
   * @returns {number} - Minutes since midnight
   */
  const timeStringToMinutes = (timeString) => {
	if (!timeString) return 0;
	
	const [hours, minutes] = timeString.split(':').map(Number);
	return (hours * 60) + minutes;
  };
  
  // 4. Finally, let's update the PayrollService to incorporate these new rules
  
  // Add these methods to PayrollService class
  
  /**
   * Calculate payroll with attendance rules applied
   * @param {string} branchId - Branch ID
   * @param {string} employeeId - Employee ID
   * @param {Object} period - Payroll period {startDate, endDate}
   * @returns {Promise<Object>} - Payroll calculation
   */
  static async calculatePayrollWithRules(branchId, employeeId, period) {
	try {
	  // Get employee details
	  const employee = await getEmployeeDetails(branchId, employeeId);
	  if (!employee) {
		throw new Error(`Employee ${employeeId} not found`);
	  }
	  
	  // Get attendance rules for the branch
	  const rules = await OrganizationSettingsService.getAttendanceRules(branchId);
	  
	  // Get holidays in the period
	  const holidays = await OrganizationSettingsService.getHolidays(period.startDate, period.endDate);
	  const holidaysMap = holidays.reduce((map, holiday) => {
		map[holiday.date] = holiday;
		return map;
	  }, {});
	  
	  // Get shift schedule for employee
	  const shiftScheduleId = employee.employment?.shiftScheduleId;
	  const settings = await OrganizationSettingsService.getSettings();
	  const shiftSchedule = settings.shiftSchedules.find(s => s.id === shiftScheduleId) || {
		defaultTimes: { start: "08:00", end: "16:00" }
	  };
	  
	  // Get attendance records for the period
	  const { startDate, endDate } = period;
	  const startMonth = startDate.substring(0, 7); // YYYY-MM
	  const endMonth = endDate.substring(0, 7); // YYYY-MM
	  
	  // Fetch attendance for all months in the period
	  const monthsToFetch = getMonthsBetween(startMonth, endMonth);
	  const attendancePromises = monthsToFetch.map(month => 
		getEmployeeAttendanceLogs(branchId, employeeId, month)
	  );
	  
	  const attendanceResults = await Promise.all(attendancePromises);
	  let allAttendance = {};
	  
	  // Merge attendance from all months
	  attendanceResults.forEach(monthAttendance => {
		allAttendance = { ...allAttendance, ...monthAttendance };
	  });
	  
	  // Filter attendance to only include dates in the period
	  const periodAttendance = Object.keys(allAttendance)
		.filter(date => date >= startDate && date <= endDate)
		.reduce((obj, date) => {
		  obj[date] = allAttendance[date];
		  return obj;
		}, {});
	  
	  // Process attendance with rules
	  const processedAttendance = processAttendanceWithRules(
		periodAttendance,
		employeeId,
		shiftSchedule,
		rules,
		holidaysMap
	  );
	  
	  // Calculate total deductions
	  const totalDeductions = Object.values(processedAttendance)
		.reduce((sum, record) => sum + (record.deductions || 0), 0);
	  
	  // Calculate pay based on employee's salary and deductions
	  const dailyRate = employee.employment?.salary / 22; // Assuming 22 working days per month
	  const deductionAmount = dailyRate * totalDeductions;
	  
	  // Get all existing transactions for this period
	  const existingTransactions = await this.getEmployeeTransactions(branchId, employeeId);
	  const periodTransactions = existingTransactions.filter(
		t => t.date >= startDate && t.date <= endDate
	  );
	  
	  return {
		employee: {
		  id: employeeId,
		  name: `${employee.personal?.firstName} ${employee.personal?.lastName}`,
		  position: employee.employment?.position,
		  department: employee.employment?.department
		},
		salary: employee.employment?.salary || 0,
		attendance: processedAttendance,
		summary: {
		  workingDays: Object.keys(processedAttendance).length,
		  present: Object.values(processedAttendance).filter(r => r.status === "present").length,
		  late: Object.values(processedAttendance).filter(r => r.status === "late").length,
		  halfDay: Object.values(processedAttendance).filter(r => r.status === "half-day").length,
		  absent: Object.values(processedAttendance).filter(r => r.status === "absent").length,
		  holiday: Object.values(processedAttendance).filter(r => r.status === "holiday").length,
		  totalDeductions,
		  deductionAmount
		},
		transactions: periodTransactions,
		netPay: employee.employment?.salary - deductionAmount
	  };
	} catch (error) {
	  console.error("Error calculating payroll with rules:", error);
	  throw error;
	}
  }
  
  /**
   * Get months between two YYYY-MM dates
   * @param {string} startMonth - Start month in YYYY-MM format
   * @param {string} endMonth - End month in YYYY-MM format
   * @returns {Array<string>} - Array of months in YYYY-MM format
   */
  function getMonthsBetween(startMonth, endMonth) {
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
  }
;

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

export class PayrollService {
	// Get all payroll transactions across all employees
	static async getAllTransactions() {
		try {
			const q = query(collection(db, "payrollTransactions"), orderBy("date", "desc"));
			const querySnapshot = await getDocs(q);

			return querySnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}));
		} catch (error) {
			console.error("Error fetching all transactions:", error);
			throw error;
		}
	}

	// Get transactions for a specific employee
	static async getEmployeeTransactions(branchId, employeeId) {
		try {
			const q = query(
				collection(db, "payrollTransactions"),
				where("branchId", "==", branchId),
				where("employeeId", "==", employeeId),
				orderBy("date", "desc")
			);

			const querySnapshot = await getDocs(q);

			return querySnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}));
		} catch (error) {
			console.error(`Error fetching transactions for employee ${employeeId}:`, error);
			throw error;
		}
	}

	// Add a new transaction
	static async addTransaction(transactionData) {
		try {
			// First, verify employee exists
			const { branchId, employeeId } = transactionData;
			const employeeRef = doc(db, `branches/${branchId}/employees/${employeeId}`);
			const employeeDoc = await getDoc(employeeRef);

			if (!employeeDoc.exists()) {
				throw new Error(`Employee with ID ${employeeId} not found in branch ${branchId}`);
			}

			// Add the transaction to the transactions collection
			const transactionWithTimestamp = {
				...transactionData,
				date: transactionData.date || serverTimestamp(),
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			};

			const docRef = await addDoc(collection(db, "payrollTransactions"), transactionWithTimestamp);

			return {
				id: docRef.id,
				...transactionWithTimestamp,
				date: transactionWithTimestamp.date, // Return the provided date or server timestamp
			};
		} catch (error) {
			console.error("Error adding transaction:", error);
			throw error;
		}
	}

	// Get payroll summary for a branch
	static async getBranchPayrollSummary(branchId, period) {
		try {
			const { startDate, endDate } = period;

			const q = query(
				collection(db, "payrollTransactions"),
				where("branchId", "==", branchId),
				where("date", ">=", startDate),
				where("date", "<=", endDate)
			);

			const querySnapshot = await getDocs(q);
			const transactions = querySnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}));

			// Calculate summary
			const summary = {
				totalTransactions: transactions.length,
				totalAmount: transactions.reduce((sum, transaction) => sum + transaction.amount, 0),
				transactionsByType: {},
			};

			// Group by transaction type
			transactions.forEach((transaction) => {
				const type = transaction.type;
				if (!summary.transactionsByType[type]) {
					summary.transactionsByType[type] = {
						count: 0,
						amount: 0,
					};
				}

				summary.transactionsByType[type].count += 1;
				summary.transactionsByType[type].amount += transaction.amount;
			});

			return summary;
		} catch (error) {
			console.error(`Error getting payroll summary for branch ${branchId}:`, error);
			throw error;
		}
	}
	
}
