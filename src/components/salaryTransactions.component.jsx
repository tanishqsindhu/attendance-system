// SalaryTransactions.jsx - Main Component
import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { RefreshCw, BadgePlus, Calculator } from "lucide-react";
import { fetchEmployeeTransactions } from "@/store/transactions/transaction.slice";
import { selectActiveBranch } from "@/store/organization-settings/organization-settings.slice";
import { selectTransactionsLoading } from "@/store/transactions/transaction.slice";

// Import our components
import TransactionSummaryCards from "@/components/salary Transactions/TransactionSummaryCards.component";
import TransactionTable from "@/components/salary Transactions/TransactionTable.component";
import TransactionFormDialog from "@/components/salary Transactions/TransactionFormDialog.component";
import SalaryFormDialog from "@/components/salary Transactions/salaryFormDialog.component";

const SalaryTransactions = ({ employee }) => {
	const { empId } = useParams();
	const dispatch = useDispatch();
	const [activeTab, setActiveTab] = useState("all");
	const [showTransactionForm, setShowTransactionForm] = useState(false);
	const [showSalaryForm, setShowSalaryForm] = useState(false);

	// Redux selectors
	const branchId = useSelector(selectActiveBranch);
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

	// Handler for opening transaction form from child components
	const handleOpenTransactionForm = useCallback(() => {
		setShowTransactionForm(true);
	}, []);

	// Handler for tab changes
	const handleTabChange = useCallback((value) => {
		setActiveTab(value);
	}, []);

	// Prepare tab title based on active tab
	const getTabTitle = useCallback((tab) => {
		return tab === "all" ? "All Transactions" : `${tab.charAt(0).toUpperCase() + tab.slice(1)} Transactions`;
	}, []);

	return (
		<Card className="w-full">
			<CardHeader>
				<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
					<CardTitle>Financial Transactions</CardTitle>
					<div className="flex space-x-2">
						<Button variant="outline" onClick={fetchTransactions} disabled={loading}>
							<RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
							Refresh
						</Button>
						<Button onClick={() => setShowSalaryForm(true)} disabled={loading}>
							<Calculator className="mr-2 h-4 w-4" />
							Generate Salary
						</Button>
						<Button onClick={handleOpenTransactionForm} disabled={loading}>
							<BadgePlus className="mr-2 h-4 w-4" />
							Add Transaction
						</Button>
					</div>
				</div>
			</CardHeader>

			<CardContent>
				{/* Transaction summary cards */}
				<TransactionSummaryCards />

				{/* Transaction tabs and table */}
				<Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange}>
					<TabsList className="w-full">
						<TabsTrigger className="w-full" value="all">
							All Transactions
						</TabsTrigger>
						<TabsTrigger className="w-full" value="advance">
							Advances
						</TabsTrigger>
						<TabsTrigger className="w-full" value="payment">
							Payments
						</TabsTrigger>
						<TabsTrigger className="w-full" value="receiving">
							Receivings
						</TabsTrigger>
						<TabsTrigger className="w-full" value="salary">
							Salary
						</TabsTrigger>
					</TabsList>

					<TabsContent value={activeTab} className="mt-0">
						<TransactionTable activeTab={activeTab} onAddTransaction={handleOpenTransactionForm} />
					</TabsContent>
				</Tabs>
			</CardContent>
			{/* Dialogs */}
			<TransactionFormDialog open={showTransactionForm} onOpenChange={setShowTransactionForm} employeeId={empId} />
			<SalaryFormDialog open={showSalaryForm} onOpenChange={setShowSalaryForm} employee={employee} />
		</Card>
	);
};

export default SalaryTransactions;
