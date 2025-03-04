import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { format } from "date-fns";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import TransactionTable from "@/components/transcation-table.component";
import AddTransactionDialog from "@/components/AddTransactionDialog";

// Redux actions
import {
	fetchEmployeesByBranch,
	selectEmployeesByBranch,
} from "@/store/employees/employees.slice.js";
import {
	fetchEmployeeTransactions,
	addTransaction,
	selectTransactionsByEmployee,
	selectIsTransactionsLoading,
	selectTransactionsError,
} from "@/store/employeeTransactions/employeeTransactions.slice.js";

const EmployeePayroll = ({ branchId, employeeId }) => {
	const dispatch = useDispatch();
	// const { branchId, employeeId } = useParams();
	// console.log(branchId, employeeId);
	const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);

	// Get employee data from Redux store
	const employees = useSelector((state) => selectEmployeesByBranch(state, branchId));
	const employee = employees.find((emp) => emp.id === employeeId);

	// Get transaction data from Redux store
	const transactions = useSelector((state) => selectTransactionsByEmployee(state, employeeId));
	const isLoading = useSelector(selectIsTransactionsLoading);
	const error = useSelector(selectTransactionsError);

	// Load employee and transaction data
	useEffect(() => {
		if (branchId && !employees.length) {
			dispatch(fetchEmployeesByBranch(branchId));
		}

		if (branchId && employeeId) {
			dispatch(fetchEmployeeTransactions({ branchId, employeeId }));
		}
	}, [dispatch, branchId, employeeId, employees.length]);

	// Handle adding a new transaction
	const handleAddTransaction = (transactionData) => {
		const fullTransactionData = {
			...transactionData,
			branchId,
			employeeId,
			employeeName: employee?.name || "Unknown",
		};

		dispatch(addTransaction(fullTransactionData))
			.unwrap()
			.then(() => {
				setIsAddTransactionOpen(false);
			})
			.catch((error) => {
				console.error("Failed to add transaction:", error);
			});
	};

	// Handle refreshing transactions
	const handleRefresh = () => {
		dispatch(fetchEmployeeTransactions({ branchId, employeeId }));
	};

	if (!employee) {
		return (
			<div className="p-6">
				<h1 className="text-2xl font-bold mb-4">Employee Payroll</h1>
				<p>Loading employee data...</p>
			</div>
		);
	}

	return (
		<div className="p-6">
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold">Employee Payroll</h1>
				<Button onClick={() => setIsAddTransactionOpen(true)}>Add Transaction</Button>
			</div>

			<Card className="mb-6">
				<CardHeader>
					<CardTitle>Employee Details</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<p className="text-muted-foreground">Name</p>
							<p className="font-medium">{employee.name}</p>
						</div>
						<div>
							<p className="text-muted-foreground">Employee ID</p>
							<p className="font-medium">{employee.id}</p>
						</div>
						<div>
							<p className="text-muted-foreground">Job Title</p>
							<p className="font-medium">{employee.jobTitle || "N/A"}</p>
						</div>
						<div>
							<p className="text-muted-foreground">Status</p>
							<p className="font-medium capitalize">{employee.status || "Active"}</p>
						</div>
						<div>
							<p className="text-muted-foreground">Department</p>
							<p className="font-medium">{employee.department || "N/A"}</p>
						</div>
						<div>
							<p className="text-muted-foreground">Start Date</p>
							<p className="font-medium">
								{employee.startDate
									? format(new Date(employee.startDate.seconds * 1000), "dd MMM yyyy")
									: "N/A"}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<Tabs defaultValue="transactions" className="mt-6">
				<TabsList>
					<TabsTrigger value="transactions">Transactions</TabsTrigger>
					<TabsTrigger value="summary">Summary</TabsTrigger>
				</TabsList>

				<TabsContent value="transactions" className="mt-4">
					<TransactionTable
						transactions={transactions}
						loading={isLoading}
						error={error}
						onAddTransaction={() => setIsAddTransactionOpen(true)}
						onRefresh={handleRefresh}
					/>
				</TabsContent>

				<TabsContent value="summary" className="mt-4">
					<Card>
						<CardHeader>
							<CardTitle>Payroll Summary</CardTitle>
						</CardHeader>
						<CardContent>
							{transactions.length > 0 ? (
								<div className="space-y-4">
									<div>
										<h3 className="text-lg font-medium mb-2">Total Payments</h3>
										<p className="text-3xl font-bold">
											₹
											{transactions
												.filter((t) => t.type === "salary" || t.type === "bonus")
												.reduce((sum, t) => sum + t.amount, 0)
												.toLocaleString("en-IN")}
										</p>
									</div>

									<Separator />

									<div>
										<h3 className="text-lg font-medium mb-2">Transaction Breakdown</h3>
										<div className="space-y-2">
											{Object.entries(
												transactions.reduce((acc, t) => {
													if (!acc[t.type]) acc[t.type] = { count: 0, amount: 0 };
													acc[t.type].count += 1;
													acc[t.type].amount += t.amount;
													return acc;
												}, {})
											).map(([type, data]) => (
												<div key={type} className="flex justify-between">
													<span className="capitalize">
														{type} ({data.count})
													</span>
													<span>₹{data.amount.toLocaleString("en-IN")}</span>
												</div>
											))}
										</div>
									</div>
								</div>
							) : (
								<p>No transaction data available.</p>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			{isAddTransactionOpen && (
				<AddTransactionDialog
					open={isAddTransactionOpen}
					onClose={() => setIsAddTransactionOpen(false)}
					onSubmit={handleAddTransaction}
					employeeName={employee.name}
				/>
			)}
		</div>
	);
};

export default EmployeePayroll;
