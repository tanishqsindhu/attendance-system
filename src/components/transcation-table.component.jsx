import { useMemo } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table.component";
import { Badge } from "@/components/ui/badge";

const TransactionTable = ({ transactions, loading, error, onAddTransaction, onRefresh }) => {
	// Transaction table columns
	const transactionColumns = useMemo(
		() => [
			{
				accessorKey: "date",
				header: "Date",
				cell: ({ row }) => {
					const date = new Date(row.original.date.seconds * 1000);
					return format(date, "dd MMM yyyy");
				},
			},
			{
				accessorKey: "type",
				header: "Type",
				cell: ({ row }) => {
					const transactionStatus = row.original;
					return transactionStatus?.type ? (
						<GetTransactionStatusBadge status={transactionStatus.type} />
					) : (
						<div>-</div>
					);
				},
			},
			{
				accessorKey: "amount",
				header: "Amount",
				cell: ({ row }) => `₹${row.original.amount.toLocaleString("en-IN")}`,
			},
			{
				accessorKey: "status",
				header: "Status",
				cell: ({ row }) => {
					const transactionStatus = row.original;
					return transactionStatus?.type ? (
						<GetTransactionStatusBadge status={transactionStatus.status} />
					) : (
						<div>-</div>
					);
				},
			},
			{
				accessorKey: "description",
				header: "Description",
			},
			{
				accessorKey: "actions",
				header: "Actions",
				cell: ({ row }) => (
					<Button
						variant="outline"
						size="sm"
						onClick={(e) => {
							e.stopPropagation();
							// Handle view transaction details
							console.log("View transaction:", row.original);
						}}
					>
						View
					</Button>
				),
			},
		],
		[]
	);

	// Format Transaction status
	const GetTransactionStatusBadge = ({ status }) => {
		const statusMap = {
			active: "success",
			"Missing Punch": "destructive",
			MissingPunch: "warning",
			probation: "secondary",
		};
		return (
			<Badge variant={statusMap[status] || "secondary"} className="capitalize w-30">
				{status}
			</Badge>
		);
	};

	return (
		<>
			{error && (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
					Error: {error}
				</div>
			)}

			<DataTable
				data={transactions}
				columns={transactionColumns}
				filterableColumns={["type", "status", "date"]}
				initialPageSize={10}
				loading={loading}
				tableActions={
					<Button variant="outline" onClick={onRefresh} disabled={loading}>
						Refresh
					</Button>
				}
				emptyState={
					<div className="text-center p-6">
						<p className="text-muted-foreground">No transactions found for this employee.</p>
					</div>
				}
			/>
		</>
	);
};

export default TransactionTable;
