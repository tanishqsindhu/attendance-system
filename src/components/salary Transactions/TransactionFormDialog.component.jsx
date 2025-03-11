// TransactionFormDialog.jsx
import { useState, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { selectCurrentUser } from "@/store/user/user.selector.js";
import { selectActiveBranch } from "@/store/organization-settings/organization-settings.slice";
import { createTransaction } from "@/store/transactions/transaction.slice";

const TransactionFormDialog = ({ open, onOpenChange, employeeId }) => {
	const dispatch = useDispatch();
	const [formState, setFormState] = useState({
		transactionType: "advance",
		transactionAmount: "",
		transactionDescription: "",
	});
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Redux selectors
	const currentUser = useSelector(selectCurrentUser);
	const branchId = useSelector(selectActiveBranch);

	// Handle form field changes
	const handleChange = useCallback((field, value) => {
		setFormState((prev) => ({ ...prev, [field]: value }));
	}, []);

	// Reset form fields
	const resetForm = useCallback(() => {
		setFormState({
			transactionType: "advance",
			transactionAmount: "",
			transactionDescription: "",
		});
	}, []);

	// Handle transaction submission
	const handleSubmitTransaction = useCallback(
		async (e) => {
			e.preventDefault();
			const { transactionType, transactionAmount, transactionDescription } = formState;

			if (!transactionAmount || isNaN(parseFloat(transactionAmount)) || parseFloat(transactionAmount) <= 0) {
				toast.error("Please enter a valid amount");
				return;
			}

			const transactionData = {
				employeeId,
				type: transactionType,
				amount: parseFloat(transactionAmount),
				description: transactionDescription || `${transactionType.charAt(0).toUpperCase() + transactionType.slice(1)} payment`,
				date: new Date().toISOString(),
				status: "completed",
				createdBy: `${currentUser.fullName} #${currentUser.id}`,
			};

			try {
				setIsSubmitting(true);
				await dispatch(
					createTransaction({
						branchId: branchId.id,
						employeeId,
						transactionData,
					})
				).unwrap();

				toast.success("Transaction added successfully");
				onOpenChange(false);
				resetForm();
			} catch (error) {
				console.error("Error adding transaction:", error);
				toast.error("Failed to add transaction");
			} finally {
				setIsSubmitting(false);
			}
		},
		[formState, employeeId, currentUser, branchId, dispatch, onOpenChange, resetForm]
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Add New Transaction</DialogTitle>
				</DialogHeader>

				<form onSubmit={handleSubmitTransaction} className="space-y-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="transactionType">Transaction Type</Label>
						<Select id="transactionType" value={formState.transactionType} onValueChange={(value) => handleChange("transactionType", value)}>
							<SelectTrigger>
								<SelectValue placeholder="Select type" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="advance">Advance Salary</SelectItem>
								<SelectItem value="payment">Payment to Employee</SelectItem>
								<SelectItem value="receiving">Received from Employee</SelectItem>
							</SelectContent>
						</Select>
						{formState.transactionType === "receiving" && <p className="text-xs text-blue-600">Note: Receiving transactions will be recorded as negative amounts</p>}
					</div>

					<div className="space-y-2">
						<Label htmlFor="amount">Amount (₹)</Label>
						<Input id="amount" type="number" placeholder="Enter amount" value={formState.transactionAmount} onChange={(e) => handleChange("transactionAmount", e.target.value)} min="0" step="0.01" required />
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Description</Label>
						<Input required id="description" placeholder="Enter description" value={formState.transactionDescription} onChange={(e) => handleChange("transactionDescription", e.target.value)} />
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting || !formState.transactionAmount}>
							{isSubmitting ? "Processing..." : "Save Transaction"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
};

export default TransactionFormDialog;
