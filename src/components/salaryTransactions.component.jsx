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
import { BadgePlus, CreditCard, RefreshCw, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { selectCurrentUser } from "../store/user/user.selector";
import { selectActiveBranch } from "@/store/organization-settings/organization-settings.slice";
import {
	fetchEmployeeTransactions,
	createTransaction,
	selectAllTransactions,
	selectTransactionSummary,
	selectTransactionsLoading,
} from "@/store/transactions/transaction.slice";

const SalaryTransactions = ({ employee }) => {
	const { empId } = useParams();
	const dispatch = useDispatch();
	const [activeTab, setActiveTab] = useState("all");
	const [showTransactionForm, setShowTransactionForm] = useState(false);
	const [transactionType, setTransactionType] = useState("advance");
	const [transactionAmount, setTransactionAmount] = useState("");
	const [transactionDescription, setTransactionDescription] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

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
						receiving: "receiving",
					};

					const iconMap = {
						advance: <ArrowDownCircle className="mr-2 h-4 w-4 text-orange-500" />,
						payment: <ArrowUpCircle className="mr-2 h-4 w-4 text-red-500" />,
						receiving: <ArrowDownCircle className="mr-2 h-4 w-4 text-green-500" />,
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
							? "text-green-600"
							: "text-orange-600";

					return (
						<span className={`font-medium ${textColorClass}`}>
							₹{amount.toLocaleString("en-IN")}
						</span>
					);
				},
			},
			{
				accessorKey: "description",
				header: "Description",
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

	// Summary cards
	const renderSummaryCards = () => (
		<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
							<p className="text-sm text-muted-foreground">Total Receiving</p>
							<p className="text-2xl font-bold text-green-600">
								₹{summary.totalReceiving.toLocaleString("en-IN")}
							</p>
						</div>
						<ArrowDownCircle className="h-8 w-8 text-green-500" />
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="p-4">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-muted-foreground">Current Balance</p>
							<p
								className={`text-2xl font-bold ${
									summary.balance >= 0 ? "text-green-600" : "text-red-600"
								}`}
							>
								₹{summary.balance.toLocaleString("en-IN")}
							</p>
						</div>
						<RefreshCw className="h-8 w-8 text-blue-500" />
					</div>
				</CardContent>
			</Card>
		</div>
	);

	return (
		<Card className="w-full">
			<CardHeader>
				<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
					<CardTitle>Salary Transactions</CardTitle>
					<Button onClick={() => setShowTransactionForm(true)}>
						<BadgePlus className="mr-2 h-4 w-4" />
						New Transaction
					</Button>
				</div>
			</CardHeader>

			<CardContent>
				{/* Summary Cards */}
				{renderSummaryCards()}

				{/* Transaction Tabs */}
				<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
					<TabsList className="grid grid-cols-4 mb-4 w-full">
						<TabsTrigger value="all">All</TabsTrigger>
						<TabsTrigger value="advance">Advances</TabsTrigger>
						<TabsTrigger value="payment">Payments</TabsTrigger>
						<TabsTrigger value="receiving">Receiving</TabsTrigger>
					</TabsList>

					<TabsContent value={activeTab}>
						<DataTable
							data={filteredTransactions}
							columns={columns}
							filterableColumns={["description", "status"]}
							filterPlaceholder="Search transactions..."
							pagination={true}
							initialPageSize={10}
							emptyState={emptyState}
							initialSorting={[{ id: "date", desc: true }]}
							loading={loading}
						/>
					</TabsContent>
				</Tabs>
			</CardContent>

			{/* Transaction Form Dialog */}
			{renderTransactionForm()}
		</Card>
	);
};

export default SalaryTransactions;
