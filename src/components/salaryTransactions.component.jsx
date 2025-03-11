import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { format } from "date-fns";
import { toast } from "sonner";
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/data-table.component";
import {
	BadgePlus,
	CreditCard,
	RefreshCw,
	ArrowDownCircle,
	ArrowUpCircle,
	Calculator,
	Calendar,
} from "lucide-react";
import { selectCurrentUser } from "../store/user/user.selector";
import { selectActiveBranch } from "@/store/organization-settings/organization-settings.slice";
import {
	fetchEmployeeTransactions,
	createTransaction,
	generateSalaryPayment,
	selectAllTransactions,
	selectTransactionSummary,
	selectTransactionsLoading,
} from "@/store/transactions/transaction.slice";

const SalaryTransactions = ({ employee }) => {
	const { empId } = useParams();
	const dispatch = useDispatch();
	const [activeTab, setActiveTab] = useState("all");
	const [showTransactionForm, setShowTransactionForm] = useState(false);
	const [showSalaryForm, setShowSalaryForm] = useState(false);
	const [transactionType, setTransactionType] = useState("advance");
	const [transactionAmount, setTransactionAmount] = useState("");
	const [transactionDescription, setTransactionDescription] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	// For salary generation
	const [selectedMonth, setSelectedMonth] = useState(() => {
		const now = new Date();
		return `${now.getMonth() + 1}`;
	});
	const [selectedYear, setSelectedYear] = useState(() => {
		const now = new Date();
		return `${now.getFullYear()}`;
	});
	const [additionalDeductions, setAdditionalDeductions] = useState(0);

	// Redux selectors
	const currentUser = useSelector(selectCurrentUser);
	const branchId = useSelector(selectActiveBranch);
	const transactions = useSelector(selectAllTransactions);
	const summary = useSelector(selectTransactionSummary);
	const loading = useSelector(selectTransactionsLoading);

	// Fetch transactions when component mounts or when dependencies change
	const fetchTransactions = useCallback(() => {
		if (!branchId?.id || !empId) return;

		dispatch(
			fetchEmployeeTransactions({
				branchId: branchId.id,
				employeeId: empId,
			})
		);
	}, [dispatch, branchId, empId]);

	useEffect(() => {
		fetchTransactions();
	}, [fetchTransactions]);

	// Memoize filtered transactions to prevent unnecessary calculations
	const filteredTransactions = useMemo(() => {
		return activeTab === "all"
			? transactions
			: transactions.filter((transaction) => transaction.type === activeTab);
	}, [transactions, activeTab]);

	// Reset form fields
	const resetForm = useCallback(() => {
		setTransactionType("advance");
		setTransactionAmount("");
		setTransactionDescription("");
	}, []);

	// Handle transaction submission
	const handleSubmitTransaction = useCallback(
		async (e) => {
			e.preventDefault();

			if (
				!transactionAmount ||
				isNaN(parseFloat(transactionAmount)) ||
				parseFloat(transactionAmount) <= 0
			) {
				toast.error("Please enter a valid amount");
				return;
			}

			const transactionData = {
				employeeId: empId,
				type: transactionType,
				amount: parseFloat(transactionAmount),
				description:
					transactionDescription ||
					`${transactionType.charAt(0).toUpperCase() + transactionType.slice(1)} payment`,
				date: new Date().toISOString(),
				status: "completed",
				createdBy: `${currentUser.fullName} #${currentUser.id}`,
			};

			try {
				setIsSubmitting(true);
				await dispatch(
					createTransaction({
						branchId: branchId.id,
						employeeId: empId,
						transactionData,
					})
				).unwrap();

				toast.success("Transaction added successfully");
				setShowTransactionForm(false);
				resetForm();
			} catch (error) {
				console.error("Error adding transaction:", error);
				toast.error("Failed to add transaction");
			} finally {
				setIsSubmitting(false);
			}
		},
		[
			transactionAmount,
			transactionType,
			transactionDescription,
			empId,
			currentUser,
			branchId,
			dispatch,
			resetForm,
		]
	);

	// Handle salary generation
	const handleGenerateSalary = useCallback(
		async (e) => {
			e.preventDefault();

			if (!employee) {
				toast.error("Employee data is missing or incomplete");
				return;
			}

			// Check if a salary has already been generated for this month
			const salaryExists = transactions.some(
				(t) => t.type === "salary" && t.deductions?.period === `${selectedMonth}/${selectedYear}`
			);

			if (salaryExists) {
				const confirmRegenerate = window.confirm(
					`A salary payment already exists for ${selectedMonth}/${selectedYear}. Generate another?`
				);

				if (!confirmRegenerate) return;
			}

			try {
				setIsSubmitting(true);
				await dispatch(
					generateSalaryPayment({
						branchId: branchId.id,
						employee,
						month: selectedMonth,
						year: selectedYear,
						additionalDeductions: parseFloat(additionalDeductions) || 0,
					})
				).unwrap();

				toast.success(`Salary for ${selectedMonth}/${selectedYear} generated successfully`);
				setShowSalaryForm(false);
			} catch (error) {
				console.error("Error generating salary:", error);
				toast.error("Failed to generate salary payment");
			} finally {
				setIsSubmitting(false);
			}
		},
		[selectedMonth, selectedYear, additionalDeductions, employee, transactions, branchId, dispatch]
	);

	// Get attendance data for the selected month
	const getMonthAttendanceStats = useCallback(() => {
		const attendanceKey = `${selectedMonth}-${selectedYear}`;
		const monthAttendance = employee?.attendance?.[attendanceKey] || {};

		// Initialize counters
		let daysPresent = 0;
		let daysMissingPunch = 0;
		let daysAbsent = 0;
		let deductionDays = 0;

		Object.keys(monthAttendance).forEach((date) => {
			const dayData = monthAttendance[date];

			if (dayData.status === "On Time" || dayData.status === "Late") {
				daysPresent++;
			} else if (dayData.status === "Missing Punch") {
				daysMissingPunch++;
				deductionDays += dayData.deduction || 0;
			} else if (dayData.status === "Absent") {
				daysAbsent++;
				deductionDays += 1; // Full day deduction for absence
			}
		});

		return {
			daysPresent,
			daysMissingPunch,
			daysAbsent,
			deductionDays,
		};
	}, [employee, selectedMonth, selectedYear]);

	// Memoize table columns to prevent unnecessary re-renders
	const columns = useMemo(
		() => [
			{
				accessorKey: "date",
				header: "Date",
				cell: ({ row }) => {
					const date = row.original.date;
					return format(new Date(date), "dd MMM yyyy, h:mm a");
				},
			},
			{
				accessorKey: "type",
				header: "Type",
				cell: ({ row }) => {
					const type = row.original.type;
					const typeMap = {
						advance: "Advance",
						payment: "Payment",
						receiving: "Receiving",
						salary: "Salary Payment",
					};

					const iconMap = {
						advance: <ArrowDownCircle className="mr-2 h-4 w-4 text-orange-500" />,
						payment: <ArrowUpCircle className="mr-2 h-4 w-4 text-red-500" />,
						receiving: <ArrowUpCircle className="mr-2 h-4 w-4 text-blue-500" />,
						salary: <Calculator className="mr-2 h-4 w-4 text-green-500" />,
					};

					return (
						<div className="flex items-center">
							{iconMap[type]}
							<span>{typeMap[type] || type}</span>
						</div>
					);
				},
			},
			{
				accessorKey: "amount",
				header: "Amount",
				cell: ({ row }) => {
					const amount = row.original.amount;
					const type = row.original.type;
					const textColorClass =
						type === "payment"
							? "text-red-600"
							: type === "receiving"
							? "text-blue-600"
							: type === "salary"
							? "text-green-600"
							: "text-orange-600";

					return (
						<span className={`font-medium ${textColorClass}`}>
							₹{Math.abs(amount).toLocaleString("en-IN")}
						</span>
					);
				},
			},
			{
				accessorKey: "description",
				header: "Description",
				cell: ({ row }) => {
					// If it's a salary payment with deductions, add a tooltip or expanded info
					if (row.original.type === "salary" && row.original.deductions) {
						const deductions = row.original.deductions;
						return (
							<div>
								<div>{row.original.description}</div>
								<div className="text-xs text-gray-500 mt-1">
									Base: ₹{deductions.baseSalary.toLocaleString("en-IN")} | Deducted: ₹
									{deductions.deductionAmount.toLocaleString("en-IN")} (
									{deductions.totalDeductionDays} days)
								</div>
							</div>
						);
					}
					return <div>{row.original.description}</div>;
				},
			},
			{
				accessorKey: "status",
				header: "Status",
				cell: ({ row }) => {
					const status = row.original.status;
					const statusMap = {
						completed: "bg-green-100 text-green-800",
						pending: "bg-yellow-100 text-yellow-800",
						cancelled: "bg-red-100 text-red-800",
					};

					return (
						<span
							className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
								statusMap[status] || ""
							}`}
						>
							{status}
						</span>
					);
				},
			},
		],
		[]
	);

	// Memoize empty state component
	const emptyState = useMemo(
		() => (
			<tr>
				<td colSpan={5} className="h-32 text-center">
					<div className="flex flex-col items-center justify-center">
						<CreditCard className="h-8 w-8 text-muted-foreground mb-2" />
						<p className="text-muted-foreground">No transactions found</p>
						<Button
							variant="outline"
							size="sm"
							className="mt-4"
							onClick={() => setShowTransactionForm(true)}
						>
							<BadgePlus className="mr-2 h-4 w-4" />
							Add Transaction
						</Button>
					</div>
				</td>
			</tr>
		),
		[]
	);

	// Transaction form dialog
	const renderTransactionForm = () => (
		<Dialog open={showTransactionForm} onOpenChange={setShowTransactionForm}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Add New Transaction</DialogTitle>
				</DialogHeader>

				<form onSubmit={handleSubmitTransaction} className="space-y-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="transactionType">Transaction Type</Label>
						<Select id="transactionType" value={transactionType} onValueChange={setTransactionType}>
							<SelectTrigger>
								<SelectValue placeholder="Select type" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="advance">Advance Salary</SelectItem>
								<SelectItem value="payment">Payment to Employee</SelectItem>
								<SelectItem value="receiving">Received from Employee</SelectItem>
							</SelectContent>
						</Select>
						{transactionType === "receiving" && (
							<p className="text-xs text-blue-600">
								Note: Receiving transactions will be recorded as negative amounts
							</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="amount">Amount (₹)</Label>
						<Input
							id="amount"
							type="number"
							placeholder="Enter amount"
							value={transactionAmount}
							onChange={(e) => setTransactionAmount(e.target.value)}
							min="0"
							step="0.01"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Description</Label>
						<Input
							required
							id="description"
							placeholder="Enter description"
							value={transactionDescription}
							onChange={(e) => setTransactionDescription(e.target.value)}
						/>
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setShowTransactionForm(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting || !transactionAmount}>
							{isSubmitting ? "Processing..." : "Save Transaction"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);

	// Salary generation form dialog
	const renderSalaryForm = () => {
		const attendanceStats = getMonthAttendanceStats();
		const daysInMonth = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate();

		const baseSalary = employee?.employment?.salaryAmount || 0;
		const totalDeductions = attendanceStats.deductionDays + parseFloat(additionalDeductions || 0);
		const deductionAmount = (baseSalary / daysInMonth) * totalDeductions;
		const estimatedSalary = baseSalary - deductionAmount;

		return (
			<Dialog open={showSalaryForm} onOpenChange={setShowSalaryForm}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>Generate Monthly Salary</DialogTitle>
					</DialogHeader>

					<form onSubmit={handleGenerateSalary} className="space-y-4 py-4">
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="salaryMonth">Month</Label>
								<Select id="salaryMonth" value={selectedMonth} onValueChange={setSelectedMonth}>
									<SelectTrigger>
										<SelectValue placeholder="Select month" />
									</SelectTrigger>
									<SelectContent>
										{[...Array(12)].map((_, i) => (
											<SelectItem key={i + 1} value={`${i + 1}`}>
												{new Date(0, i).toLocaleString("default", { month: "long" })}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="salaryYear">Year</Label>
								<Select id="salaryYear" value={selectedYear} onValueChange={setSelectedYear}>
									<SelectTrigger>
										<SelectValue placeholder="Select year" />
									</SelectTrigger>
									<SelectContent>
										{[...Array(5)].map((_, i) => {
											const year = new Date().getFullYear() - 2 + i;
											return (
												<SelectItem key={year} value={`${year}`}>
													{year}
												</SelectItem>
											);
										})}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="additionalDeductions">Additional Deduction Days</Label>
							<Input
								id="additionalDeductions"
								type="number"
								placeholder="Enter additional deduction days"
								value={additionalDeductions}
								onChange={(e) => setAdditionalDeductions(e.target.value)}
								min="0"
								step="0.5"
							/>
							<p className="text-xs text-muted-foreground">
								Enter any additional days to deduct beyond attendance-based deductions
							</p>
						</div>

						<div className="p-4 bg-blue-50 rounded-md space-y-2">
							<h4 className="font-medium">Salary Information</h4>
							<p className="text-sm">Base Salary: ₹{baseSalary.toLocaleString("en-IN")}</p>
							<p className="text-sm">
								Attendance Period: {selectedMonth}/{selectedYear} ({daysInMonth} days)
							</p>

							<div className="mt-2 pt-2 border-t border-blue-100">
								<h5 className="font-medium text-sm">Attendance Summary</h5>
								<p className="text-xs mt-1">Days Present: {attendanceStats.daysPresent}</p>
								<p className="text-xs mt-1">
									Missing Punches: {attendanceStats.daysMissingPunch} (
									{attendanceStats.deductionDays} deduction days)
								</p>
								<p className="text-xs mt-1">Absences: {attendanceStats.daysAbsent}</p>
							</div>

							<div className="mt-2 pt-2 border-t border-blue-100">
								<h5 className="font-medium text-sm">Calculation Preview</h5>
								<p className="text-xs mt-1">Total Deduction Days: {totalDeductions.toFixed(1)}</p>
								<p className="text-xs mt-1">
									Deduction Amount: ₹
									{deductionAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
								</p>
								<p className="text-sm mt-1 font-medium">
									Estimated Salary: ₹
									{estimatedSalary.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
								</p>
							</div>
						</div>

						<DialogFooter>
							<Button type="button" variant="outline" onClick={() => setShowSalaryForm(false)}>
								Cancel
							</Button>
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? "Processing..." : "Generate Salary"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		);
	};

	// Get total balance (considering receiving as negative)
	const totalBalance = useMemo(() => {
		return (
			summary.totalAdvance + summary.totalReceiving - summary.totalPayments + summary.totalSalary
		);
	}, [summary]);

	// Summary cards
	const renderSummaryCards = () => (
		<div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
			<Card>
				<CardContent className="p-4">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-muted-foreground">Total Advances</p>
							<p className="text-2xl font-bold text-orange-600">
								₹{summary.totalAdvance.toLocaleString("en-IN")}
							</p>
						</div>
						<ArrowDownCircle className="h-8 w-8 text-orange-500" />
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="p-4">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-muted-foreground">Total Payments</p>
							<p className="text-2xl font-bold text-red-600">
								₹{summary.totalPayments.toLocaleString("en-IN")}
							</p>
						</div>
						<ArrowUpCircle className="h-8 w-8 text-red-500" />
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="p-4">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-muted-foreground">Total Received</p>
							<p className="text-2xl font-bold text-blue-600">
								₹{Math.abs(summary.totalReceiving).toLocaleString("en-IN")}
							</p>
						</div>
						<ArrowUpCircle className="h-8 w-8 text-blue-500" />
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="p-4">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-muted-foreground">Total Salary</p>
							<p className="text-2xl font-bold text-green-600">
								₹{summary.totalSalary.toLocaleString("en-IN")}
							</p>
						</div>
						<Calculator className="h-8 w-8 text-green-500" />
					</div>
				</CardContent>
			</Card>

			<Card className="md:col-span-2">
				<CardContent className="p-4">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-muted-foreground">Balance</p>
							<p
								className={`text-2xl font-bold ${
									totalBalance >= 0 ? "text-green-600" : "text-red-600"
								}`}
							>
								₹{Math.abs(totalBalance).toLocaleString("en-IN")}
								<span className="text-sm ml-2 font-normal">
									{totalBalance >= 0 ? "(Credit)" : "(Debit)"}
								</span>
							</p>
						</div>
						<div
							className={`h-12 w-12 rounded-full flex items-center justify-center ${
								totalBalance >= 0 ? "bg-green-100" : "bg-red-100"
							}`}
						>
							<span
								className={`text-xl font-bold ${
									totalBalance >= 0 ? "text-green-700" : "text-red-700"
								}`}
							>
								{totalBalance >= 0 ? "+" : "-"}
							</span>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);

	return (
		<div className="container mx-auto py-6">
			<div className="flex justify-between items-center mb-6">
				<h2 className="text-3xl font-bold">Financial Transactions</h2>
				<div className="flex space-x-2">
					<Button variant="outline" onClick={fetchTransactions} disabled={loading}>
						<RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
						Refresh
					</Button>

					<Button onClick={() => setShowSalaryForm(true)} disabled={loading}>
						<Calculator className="mr-2 h-4 w-4" />
						Generate Salary
					</Button>

					<Button onClick={() => setShowTransactionForm(true)} disabled={loading}>
						<BadgePlus className="mr-2 h-4 w-4" />
						Add Transaction
					</Button>
				</div>
			</div>

			{renderSummaryCards()}

			<Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
				<TabsList className="mb-6">
					<TabsTrigger value="all">All Transactions</TabsTrigger>
					<TabsTrigger value="advance">Advances</TabsTrigger>
					<TabsTrigger value="payment">Payments</TabsTrigger>
					<TabsTrigger value="receiving">Receivings</TabsTrigger>
					<TabsTrigger value="salary">Salary</TabsTrigger>
				</TabsList>

				<TabsContent value={activeTab} className="mt-0">
					<Card>
						<CardHeader>
							<CardTitle>
								{activeTab === "all"
									? "All Transactions"
									: `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Transactions`}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<DataTable
								columns={columns}
								data={filteredTransactions}
								loading={loading}
								emptyState={emptyState}
							/>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			{renderTransactionForm()}
			{renderSalaryForm()}
		</div>
	);
};

export default SalaryTransactions;
