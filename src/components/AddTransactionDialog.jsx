import React, { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import {
	Form,
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";

// Note: For implementation purposes, I'm assuming you have zod and react-hook-form installed.
// If not, you'll need to install these packages.

const transactionSchema = z.object({
	type: z.string().min(1, "Transaction type is required"),
	amount: z.coerce.number().positive("Amount must be positive"),
	date: z.string().min(1, "Date is required"),
	description: z.string().optional(),
	status: z.string().min(1, "Status is required"),
});

const AddTransactionDialog = ({ open, onClose, onSubmit, employeeName }) => {
	const form = useForm({
		resolver: zodResolver(transactionSchema),
		defaultValues: {
			type: "salary",
			amount: "",
			date: format(new Date(), "yyyy-MM-dd"),
			description: "",
			status: "completed",
		},
	});

	const handleSubmit = (data) => {
		// Convert date string to Date object
		const transactionData = {
			...data,
			date: new Date(data.date),
			amount: Number(data.amount),
		};

		onSubmit(transactionData);
	};

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Add Transaction for {employeeName}</DialogTitle>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="type"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Transaction Type</FormLabel>
									<Select onValueChange={field.onChange} defaultValue={field.value}>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select transaction type" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="salary">Salary</SelectItem>
											<SelectItem value="bonus">Bonus</SelectItem>
											<SelectItem value="reimbursement">Reimbursement</SelectItem>
											<SelectItem value="deduction">Deduction</SelectItem>
											<SelectItem value="advance">Advance</SelectItem>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="amount"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Amount (₹)</FormLabel>
									<FormControl>
										<Input {...field} type="number" placeholder="0.00" />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="date"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Transaction Date</FormLabel>
									<FormControl>
										<Input {...field} type="date" />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="status"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Status</FormLabel>
									<Select onValueChange={field.onChange} defaultValue={field.value}>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select status" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="pending">Pending</SelectItem>
											<SelectItem value="completed">Completed</SelectItem>
											<SelectItem value="failed">Failed</SelectItem>
											<SelectItem value="cancelled">Cancelled</SelectItem>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Description</FormLabel>
									<FormControl>
										<Textarea {...field} placeholder="Transaction details..." />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter>
							<Button type="button" variant="outline" onClick={onClose}>
								Cancel
							</Button>
							<Button type="submit">Add Transaction</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
};

export default AddTransactionDialog;
