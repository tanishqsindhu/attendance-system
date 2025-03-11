import { useMemo, useCallback } from "react";
import { useSelector } from "react-redux";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table.component";
import { ArrowDownCircle, ArrowUpCircle, Calculator, CreditCard, BadgePlus } from "lucide-react";
import { selectAllTransactions, selectTransactionsLoading } from "@/store/transactions/transaction.slice";

const TransactionTable = ({ activeTab, onAddTransaction }) => {
	const transactions = useSelector(selectAllTransactions);
	const loading = useSelector(selectTransactionsLoading);

	// Memoize filtered transactions to prevent unnecessary calculations
	const filteredTransactions = useMemo(() => {
		return activeTab === "all" ? transactions : transactions.filter((transaction) => transaction.type === activeTab);
	}, [transactions, activeTab]);

	// Columns configuration
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
						advance: <ArrowUpCircle className="mr-2 h-4 w-4 text-orange-500" />,
						payment: <ArrowUpCircle className="mr-2 h-4 w-4 text-red-500" />,
						receiving: <ArrowDownCircle className="mr-2 h-4 w-4 text-blue-500" />,
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
					const textColorClass = type === "payment" ? "text-red-600" : type === "receiving" ? "text-blue-600" : type === "salary" ? "text-green-600" : "text-orange-600";

					return <span className={`font-medium ${textColorClass}`}>₹{Math.abs(amount).toLocaleString("en-IN")}</span>;
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
									Base: ₹{deductions.baseSalary.toLocaleString("en-IN")} | Deducted: ₹{deductions.deductionAmount.toLocaleString("en-IN")} ({deductions.totalDeductionDays} days)
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

					return <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusMap[status] || ""}`}>{status}</span>;
				},
			},
		],
		[]
	);

	// Empty state component with callback for adding new transaction
	const renderEmptyState = useCallback(
		() => (
			<tr>
				<td colSpan={5} className="h-32 text-center">
					<div className="flex flex-col items-center justify-center">
						<CreditCard className="h-8 w-8 text-muted-foreground mb-2" />
						<p className="text-muted-foreground">No transactions found</p>
						<Button variant="outline" size="sm" className="mt-4" onClick={onAddTransaction}>
							<BadgePlus className="mr-2 h-4 w-4" />
							Add Transaction
						</Button>
					</div>
				</td>
			</tr>
		),
		[onAddTransaction]
	);

	return <DataTable columns={columns} data={filteredTransactions} loading={loading} emptyState={renderEmptyState()} />;
};

export default TransactionTable;
