import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { format } from "date-fns";

// UI Components
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table.component";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/date-picker";

// Redux actions
import { fetchAllTransactions } from "@/store/employeeTransactions/employeeTransactions.reducer.js";
import {
	selectAllTransactions,
	selectIsTransactionsLoading,
	selectTransactionsError,
} from "../store/employeeTransactions/employeeTransactions.selector";

const AllTransactions = () => {
	const dispatch = useDispatch();

	// Local state for filtering
	const [dateRange, setDateRange] = useState({ from: null, to: null });
	const [filteredTransactions, setFilteredTransactions] = useState([]);

	// Get transaction data from Redux
	const transactions = useSelector(selectAllTransactions);
	const isLoading = useSelector(selectIsTransactionsLoading);
	const error = useSelector(selectTransactionsError);

	// Load transactions data
	useEffect(() => {
		dispatch(fetchAllTransactions());
	}, [dispatch]);

	// Apply filters when transactions or date range changes
	useEffect(() => {
		let filtered = [...transactions];

		// Apply date range filter if both from and to dates are set
		if (dateRange.from && dateRange.to) {
			filtered = filtered.filter((transaction) => {
				const transactionDate = new Date(transaction.date.seconds * 1000);
				return transactionDate >= dateRange.from && transactionDate <= dateRange.to;
			});
		}

		setFilteredTransactions(filtered);
	}, [transactions, dateRange]);

	// Handle refreshing transactions data
	const handleRefresh = () => {
		dispatch(fetchAllTransactions());
	};

	// Transaction table columns
	const transactionColumns = [
		{
			accessorKey: "date",
			header: "Date",
			cell: ({ row }) => {
				const date = new Date(row.original.date.seconds * 1000);
				return format(date, "dd MMM yyyy");
			},
		},
		{
			accessorKey: "employeeName",
			header: "Employee",
		},
		{
			accessorKey: "type",
			header: "Type",
			cell: ({ row }) => {
				return (
					<Badge variant="outline" className="capitalize">
						{row.original.type}
					</Badge>
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
				const statusMap = {
					pending: "warning",
					completed: "success",
					failed: "destructive",
					cancelled: "secondary",
				};
				return (
					<Badge variant={statusMap[row.original.status] || "default"} className="capitalize">
						{row.original.status}
					</Badge>
				);
			},
		},
		{
			accessorKey: "description",
			header: "Description",
		},
	];

	return (
		<div className="p-6">
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold">All Payroll Transactions</h1>
			</div>

			<Card className="mb-6">
				<CardHeader>
					<CardTitle>Transaction Summary</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						<div className="bg-blue-50 p-4 rounded-lg">
							<p className="text-sm text-muted-foreground">Total Transactions</p>
							<p className="text-2xl font-bold">{filteredTransactions.length}</p>
						</div>
						<div className="bg-green-50 p-4 rounded-lg">
							<p className="text-sm text-muted-foreground">Total Amount</p>
							<p className="text-2xl font-bold">
								₹
								{filteredTransactions.reduce((sum, t) => sum + t.amount, 0).toLocaleString("en-IN")}
							</p>
						</div>
						<div className="bg-amber-50 p-4 rounded-lg">
							<p className="text-sm text-muted-foreground">Pending Transactions</p>
							<p className="text-2xl font-bold">
								{filteredTransactions.filter((t) => t.status === "pending").length}
							</p>
						</div>
						<div className="bg-indigo-50 p-4 rounded-lg">
							<p className="text-sm text-muted-foreground">Employees Paid</p>
							<p className="text-2xl font-bold">
								{new Set(filteredTransactions.map((t) => t.employeeId)).size}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<div className="bg-white p-4 rounded-md shadow mb-6">
				<div className="flex flex-col md:flex-row gap-4 items-end">
					<div className="flex-1">
						<p className="mb-2 text-sm font-medium">Date Range</p>
						<DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
					</div>
					<div>
						<Button variant="outline" onClick={() => setDateRange({ from: null, to: null })}>
							Clear Filters
						</Button>
					</div>
					<div>
						<Button onClick={handleRefresh} disabled={isLoading}>
							Refresh Data
						</Button>
					</div>
				</div>
			</div>

			{error && (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
					Error: {error}
				</div>
			)}

			<DataTable
				data={filteredTransactions}
				columns={transactionColumns}
				filterableColumns={["type", "status", "employeeName"]}
				searchableColumns={["employeeName", "description"]}
				initialPageSize={15}
				loading={isLoading}
				emptyState={
					<div className="text-center p-6">
						<p className="text-muted-foreground">No transactions found.</p>
						<p className="text-sm text-muted-foreground mt-2">
							Try adjusting your filters or add new transactions.
						</p>
					</div>
				}
			/>
		</div>
	);
};

export default AllTransactions;
