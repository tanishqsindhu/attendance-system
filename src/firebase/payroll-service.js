import { db } from "./firebase-config";
import { getEmployeeDetails } from "./employee-service";
import { getMonthsBetween } from "./firebase-utils";
import { getEmployeeAttendanceLogs, processAttendanceWithRules } from "./attendance-service";
import { OrganizationSettingsService } from "./organization-service";
import { collection, doc, getDoc, query, getDocs, where, orderBy, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * Service for payroll-related operations
 */
export class PayrollService {
	/**
	 * Get all payroll transactions across all employees
	 * @returns {Promise<Array>} - All payroll transactions
	 */
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

	/**
	 * Get transactions for a specific employee
	 * @param {string} branchId - Branch ID
	 * @param {string} employeeId - Employee ID
	 * @returns {Promise<Array>} - Employee's transactions
	 */
	static async getEmployeeTransactions(branchId, employeeId) {
		try {
			const q = query(collection(db, "payrollTransactions"), where("branchId", "==", branchId), where("employeeId", "==", employeeId), orderBy("date", "desc"));

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

	/**
	 * Add a new payroll transaction
	 * @param {Object} transactionData - Transaction data
	 * @returns {Promise<Object>} - Created transaction
	 */
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

	/**
	 * Get payroll summary for a branch
	 * @param {string} branchId - Branch ID
	 * @param {Object} period - Period with startDate and endDate
	 * @returns {Promise<Object>} - Payroll summary
	 */
	static async getBranchPayrollSummary(branchId, period) {
		try {
			const { startDate, endDate } = period;

			const q = query(collection(db, "payrollTransactions"), where("branchId", "==", branchId), where("date", ">=", startDate), where("date", "<=", endDate));

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
			const rules = await AttendanceRulesService.getAttendanceRules(branchId);

			// Get holidays in the period
			const holidays = await HolidayService.getHolidays(period.startDate, period.endDate);
			const holidaysMap = holidays.reduce((map, holiday) => {
				map[holiday.date] = holiday;
				return map;
			}, {});

			// Get shift schedule for employee
			const shiftScheduleId = employee.employment?.shiftScheduleId;
			const settings = await OrganizationSettingsService.getSettings();
			const shiftSchedule = settings.shiftSchedules.find((s) => s.id === shiftScheduleId) || {
				defaultTimes: { start: "08:00", end: "16:00" },
			};

			// Get attendance records for the period
			const { startDate, endDate } = period;
			const startMonth = startDate.substring(0, 7); // YYYY-MM
			const endMonth = endDate.substring(0, 7); // YYYY-MM

			// Fetch attendance for all months in the period
			const monthsToFetch = getMonthsBetween(startMonth, endMonth);
			const attendancePromises = monthsToFetch.map((month) => getEmployeeAttendanceLogs(branchId, employeeId, month));

			const attendanceResults = await Promise.all(attendancePromises);
			let allAttendance = {};

			// Merge attendance from all months
			attendanceResults.forEach((monthAttendance) => {
				allAttendance = { ...allAttendance, ...monthAttendance };
			});

			// Filter attendance to only include dates in the period
			const periodAttendance = Object.keys(allAttendance)
				.filter((date) => date >= startDate && date <= endDate)
				.reduce((obj, date) => {
					obj[date] = allAttendance[date];
					return obj;
				}, {});

			// Process attendance with rules
			const processedAttendance = processAttendanceWithRules(periodAttendance, employeeId, shiftSchedule, rules, holidaysMap);

			// Calculate total deductions
			const totalDeductions = Object.values(processedAttendance).reduce((sum, record) => sum + (record.deductions || 0), 0);

			// Calculate pay based on employee's salary and deductions
			const dailyRate = employee.employment?.salary / 22; // Assuming 22 working days per month
			const deductionAmount = dailyRate * totalDeductions;

			// Get all existing transactions for this period
			const existingTransactions = await this.getEmployeeTransactions(branchId, employeeId);
			const periodTransactions = existingTransactions.filter((t) => t.date >= startDate && t.date <= endDate);

			return {
				employee: {
					id: employeeId,
					name: `${employee.personal?.firstName} ${employee.personal?.lastName}`,
					position: employee.employment?.position,
					department: employee.employment?.department,
				},
				salary: employee.employment?.salary || 0,
				attendance: processedAttendance,
				summary: {
					workingDays: Object.keys(processedAttendance).length,
					present: Object.values(processedAttendance).filter((r) => r.status === "present").length,
					late: Object.values(processedAttendance).filter((r) => r.status === "late").length,
					halfDay: Object.values(processedAttendance).filter((r) => r.status === "half-day").length,
					absent: Object.values(processedAttendance).filter((r) => r.status === "absent").length,
					holiday: Object.values(processedAttendance).filter((r) => r.status === "holiday").length,
					totalDeductions,
					deductionAmount,
				},
				transactions: periodTransactions,
				netPay: employee.employment?.salary - deductionAmount,
			};
		} catch (error) {
			console.error("Error calculating payroll with rules:", error);
			throw error;
		}
	}
}
