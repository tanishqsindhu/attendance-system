// TransactionSummaryCards.jsx
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowDownCircle, ArrowUpCircle, Calculator } from "lucide-react";
import { selectTransactionSummary } from "@/store/transactions/transaction.slice";

const TransactionSummaryCards = () => {
	const summary = useSelector(selectTransactionSummary);
	const totalBalance = summary.balance;

	return (
		<div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
			<Card>
				<CardContent className="p-4">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-muted-foreground">Total Advances</p>
							<p className="text-2xl font-bold text-orange-600">₹{summary.totalAdvance.toLocaleString("en-IN")}</p>
						</div>
						<ArrowUpCircle className="h-8 w-8 text-orange-500" />

					</div>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="p-4">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-muted-foreground">Total Payments</p>
							<p className="text-2xl font-bold text-red-600">₹{summary.totalPayments.toLocaleString("en-IN")}</p>
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
							<p className="text-2xl font-bold text-blue-600">₹{Math.abs(summary.totalReceiving).toLocaleString("en-IN")}</p>
						</div>
						<ArrowDownCircle className="h-8 w-8 text-blue-500" />
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="p-4">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-muted-foreground">Total Salary</p>
							<p className="text-2xl font-bold text-green-600">₹{summary.totalSalary.toLocaleString("en-IN")}</p>
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
							<p className={`text-2xl font-bold ${totalBalance >= 0 ? "text-red-600" : "text-green-600"}`}>
								₹{Math.abs(totalBalance).toLocaleString("en-IN")}
								<span className="text-sm ml-2 font-normal">{totalBalance <= 0 ? "(Credit)" : "(Debit)"}</span>
							</p>
						</div>
						<div className={`h-12 w-12 rounded-full flex items-center justify-center ${totalBalance >= 0 ? "bg-red-100" : "bg-green-100"}`}>
							<span className={`text-xl font-bold ${totalBalance >= 0 ? "text-red-700" : "text-green-700"}`}>{totalBalance >= 0 ? "+" : "-"}</span>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

export default TransactionSummaryCards;
