import { useState, useCallback, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { selectActiveBranch } from "@/store/organization-settings/organization-settings.slice";
import { generateSalaryPayment } from "@/store/transactions/transaction.slice";

// Define form schema with Zod
const salaryFormSchema = z.object({
	month: z.string().min(1, { message: "Month is required" }),
	year: z.string().min(1, { message: "Year is required" }),
});

const SalaryFormDialog = ({ open, onOpenChange, employee }) => {
	const dispatch = useDispatch();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const branchId = useSelector(selectActiveBranch);

	// Initialize the form with react-hook-form and zod validation
	const form = useForm({
		resolver: zodResolver(salaryFormSchema),
		defaultValues: {
			month: new Date().getMonth() + 1 + "",
			year: new Date().getFullYear() + "",
		},
	});

	// Get form values
	const selectedMonth = form.watch("month");
	const selectedYear = form.watch("year");
	const additionalDeductions = form.watch("additionalDeductions");

	// Check if attendance data exists for the selected period
	const attendanceKey = `${selectedMonth}-${selectedYear}`;
	const hasAttendanceData = useMemo(() => {
		return employee?.attendance && employee.attendance[attendanceKey] && Object.keys(employee.attendance[attendanceKey]).length > 0;
	}, [employee, attendanceKey]);

	// Memoized attendance stats calculation
	const attendanceStats = useMemo(() => {
		if (!hasAttendanceData) {
			return { daysPresent: 0, daysMissingPunch: 0, daysAbsent: 0, deductionDays: 0 };
		}

		const monthAttendance = employee.attendance[attendanceKey];

		// Initialize counters
		let daysPresent = 0;
		let daysMissingPunch = 0;
		let daysAbsent = 0;
		let deductionDays = 0;

		Object.keys(monthAttendance).forEach((date) => {
			const dayData = monthAttendance[date];

			if (dayData.status === "On Time" || dayData.status === "Late" || dayData.status?.includes("Late In")) {
				daysPresent++;
			} else if (dayData.status === "Missing Punch" || dayData.status?.includes("Missing")) {
				daysMissingPunch++;
				deductionDays += dayData.deduction || 0;
			} else if (dayData.status === "Absent" || dayData.status?.includes("Half Day")) {
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
	}, [employee, attendanceKey, hasAttendanceData]);

	// Memoized salary calculations
	const salaryCalculations = useMemo(() => {
		const daysInMonth = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate();
		const baseSalary = employee?.employment?.salaryAmount || 0;
		const totalDeductions = hasAttendanceData ? attendanceStats.deductionDays + (additionalDeductions || 0) : 0;
		const deductionAmount = (baseSalary / daysInMonth) * totalDeductions;
		const estimatedSalary = baseSalary - deductionAmount;

		return {
			daysInMonth,
			baseSalary,
			totalDeductions,
			deductionAmount,
			estimatedSalary,
		};
	}, [attendanceStats, selectedMonth, selectedYear, additionalDeductions, employee, hasAttendanceData]);

	// Handle salary generation
	const onSubmit = useCallback(
		async (data) => {
			if (!employee) {
				toast.error("Employee data is missing or incomplete");
				return;
			}

			if (!hasAttendanceData) {
				toast.error("No attendance data available for this period");
				return;
			}

			try {
				setIsSubmitting(true);
				await dispatch(
					generateSalaryPayment({
						branchId: branchId.id,
						employee,
						month: data.month,
						year: data.year,
					})
				).unwrap();

				toast.success(`Salary for ${data.month}/${data.year} generated successfully`);
				onOpenChange(false);
			} catch (error) {
				console.error("Error generating salary:", error);
				toast.error("Failed to generate salary payment");
			} finally {
				setIsSubmitting(false);
			}
		},
		[employee, branchId, dispatch, onOpenChange, hasAttendanceData]
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Generate Monthly Salary</DialogTitle>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="month"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Month</FormLabel>
										<Select onValueChange={field.onChange} defaultValue={field.value}>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select month" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												{[...Array(12)].map((_, i) => (
													<SelectItem key={i + 1} value={`${i + 1}`}>
														{new Date(0, i).toLocaleString("default", { month: "long" })}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="year"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Year</FormLabel>
										<Select onValueChange={field.onChange} defaultValue={field.value}>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select year" />
												</SelectTrigger>
											</FormControl>
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
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<div className="p-4 border border-blue-100 rounded-md space-y-2">
							<h4 className="font-medium">Salary Information</h4>
							<p className="text-sm">Base Salary: ₹{salaryCalculations.baseSalary.toLocaleString("en-IN")}</p>
							<p className="text-sm">
								Attendance Period: {selectedMonth}/{selectedYear} ({salaryCalculations.daysInMonth} days)
							</p>

							{!hasAttendanceData ? (
								<div className="mt-2 pt-2 border-t border-blue-100">
									<div className="bg-amber-50 text-amber-700 p-3 rounded-md text-sm">
										<p className="font-medium">No attendance data found for this period</p>
										<p className="text-xs mt-1">Please select a different month/year or ensure attendance records are available.</p>
									</div>
								</div>
							) : (
								<>
									<div className="mt-2 pt-2 border-t border-blue-100">
										<h5 className="font-medium text-sm">Attendance Summary</h5>
										<p className="text-xs mt-1">Days Present: {attendanceStats.daysPresent}</p>
										<p className="text-xs mt-1">
											Missing Punches: {attendanceStats.daysMissingPunch} ({attendanceStats.deductionDays} deduction days)
										</p>
										<p className="text-xs mt-1">Absences: {attendanceStats.daysAbsent}</p>
									</div>

									<div className="mt-2 pt-2 border-t border-blue-100">
										<h5 className="font-medium text-sm">Calculation Preview</h5>
										<p className="text-xs mt-1">Total Deduction Days: {salaryCalculations.totalDeductions.toFixed(1)}</p>
										<p className="text-xs mt-1">Deduction Amount: ₹{salaryCalculations.deductionAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p>
										<p className="text-sm mt-1 font-medium">Estimated Salary: ₹{salaryCalculations.estimatedSalary.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p>
									</div>
								</>
							)}
						</div>

						<DialogFooter>
							<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
								Cancel
							</Button>
							<Button type="submit" disabled={isSubmitting || !hasAttendanceData}>
								{isSubmitting ? "Processing..." : "Generate Salary"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
};

export default SalaryFormDialog;
