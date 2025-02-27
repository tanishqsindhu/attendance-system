import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";

// Zod Schema Definitions (same as before)
const personalSchema = z.object({
	firstName: z.string().min(1, "First name is required"),
	lastName: z.string(),
	email: z.string().email("Invalid email format"),
	phone: z.string().regex(/^\d{10}$/, "Phone must be 10 digits"),
	dob: z.string().min(1, "Date of birth is required"),
	aadhar: z.string().regex(/^\d{12}$/, "Aadhar must be 12 digits"),
	pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format (e.g., ABCDE1234F)"),
	address: z.string().min(1, "Address is required"),
	city: z.string().min(1, "City is required"),
	state: z.string().min(1, "State is required"),
	pincode: z.string().regex(/^\d{6}$/, "PIN code must be 6 digits"),
});

const employmentSchema = z.object({
	employeeId: z.string().min(1, "Employee ID is required"),
	joiningDate: z.string().min(1, "Joining date is required"),
	department: z.string().min(1, "Department is required"),
	position: z.string().min(1, "Position is required"),
	employmentType: z.string().min(1, "Employment type is required"),
	scheduleType: z.string().min(1, "Schedule type is required"),
	supervisor: z.string().min(1, "Reporting manager is required"),
	workLocation: z.string().min(1, "Work location is required"),
	salaryAmount: z.string().min(1, "Salary amount is required"),
	payType: z.string().min(1, "Pay type is required"),
	paySchedule: z.string().min(1, "Pay schedule is required"),
});

const bankingSchema = z.object({
	bankName: z.string().min(1, "Bank name is required"),
	ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC format (e.g., SBIN0123456)"),
	accountNumber: z.string().min(1, "Account number is required"),
	accountType: z.string().min(1, "Account type is required"),
});

const taxSchema = z.object({
	uan: z
		.string()
		.regex(/^\d{12}$/, "UAN must be 12 digits")
		.optional(),
	pfNumber: z.string().min(1, "PF number is required"),
	esiNumber: z.string().optional(),
	taxRegime: z.string().min(1, "Tax regime is required"),
});

// Combined Schema
const formSchema = z.object({
	personal: personalSchema,
	employment: employmentSchema,
	banking: bankingSchema,
	tax: taxSchema,
});

const EmployeeAddForm = ({ mode = "add", initialValues }) => {
	const [loading, setLoading] = useState(false);
	const [activeTab, setActiveTab] = useState("personal");

	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: initialValues || {
			personal: {
				firstName: "",
				lastName: "",
				email: "",
				phone: "",
				dob: "",
				aadhar: "",
				pan: "",
				address: "",
				city: "",
				state: "",
				pincode: "",
			},
			employment: {
				employeeId: "",
				joiningDate: "",
				department: "",
				position: "",
				employmentType: "",
				scheduleType: "",
				supervisor: "",
				workLocation: "",
				salaryAmount: "",
				payType: "",
				paySchedule: "",
			},
			banking: {
				bankName: "",
				ifscCode: "",
				accountNumber: "",
				accountType: "",
			},
			tax: {
				uan: "",
				pfNumber: "",
				esiNumber: "",
				taxRegime: "",
			},
		},
	});

	const { handleSubmit, trigger, watch } = form;

	const handleTabChange = async (newTab) => {
		const isCurrentTabValid = await trigger(activeTab);
		if (isCurrentTabValid) {
			setActiveTab(newTab);
		} else {
			toast("Validation Error", {
				description: "Please complete all required fields before proceeding",
				variant: "destructive",
			});
		}
	};

	const onSubmit = async (data) => {
		setLoading(true);

		// Simulate API call
		setTimeout(() => {
			setLoading(false);
			toast("Success", {
				description: `Employee ${mode === "add" ? "added" : "updated"} successfully`,
			});
		}, 1500);
	};

	return (
		<div className="w-full max-w-5xl mx-auto p-4">
			<Card className="p-7">
				<CardHeader>
					<CardTitle className="text-2xl">
						{mode === "add" ? "Add New Employee" : "Edit Employee Details"}
					</CardTitle>
					<CardDescription>
						{mode === "add"
							? "Enter employee details for the school payroll system"
							: "Update employee details for the school payroll system"}
					</CardDescription>
				</CardHeader>

				<Form {...form}>
					<form onSubmit={handleSubmit(onSubmit)}>
						<Tabs value={activeTab} onValueChange={handleTabChange}>
							<TabsList className="grid grid-cols-4 w-full">
								<TabsTrigger value="personal">Personal Details</TabsTrigger>
								<TabsTrigger value="employment">Employment</TabsTrigger>
								<TabsTrigger value="banking">Banking</TabsTrigger>
								<TabsTrigger value="tax">PF & Tax</TabsTrigger>
							</TabsList>

							{/* Personal Details Tab */}
							<TabsContent value="personal" className="space-y-4 p-6">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<FormField
										control={form.control}
										name="personal.firstName"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">
													First Name*
												</FormLabel>
												<FormControl>
													<Input
														{...field}
														onChange={(e) => {
															field.onChange(e);
															trigger("personal.firstName");
														}}
													/>
												</FormControl>
												<FormMessage className="text-red-600 dark:text-red-400" />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="personal.lastName"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">
													Last Name
												</FormLabel>
												<FormControl>
													<Input
														{...field}
														onChange={(e) => {
															field.onChange(e);
															trigger("personal.lastName");
														}}
													/>
												</FormControl>
												<FormMessage className="text-red-600 dark:text-red-400" />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="personal.email"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300 ">Email*</FormLabel>
												<FormControl>
													<Input
														type="email"
														{...field}
														onChange={(e) => {
															field.onChange(e);
															trigger("personal.email");
														}}
													/>
												</FormControl>
												<FormMessage className="text-red-600 dark:text-red-400" />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="personal.phone"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">
													Phone Number*
												</FormLabel>
												<FormControl>
													<Input
														type="tel"
														{...field}
														onChange={(e) => {
															field.onChange(e);
															trigger("personal.phone");
														}}
													/>
												</FormControl>
												<FormMessage className="text-red-600 dark:text-red-400" />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="personal.dob"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">
													Date of Birth*
												</FormLabel>
												<FormControl>
													<Input
														type="date"
														{...field}
														onChange={(e) => {
															field.onChange(e);
															trigger("personal.dob");
														}}
													/>
												</FormControl>
												<FormMessage className="text-red-600 dark:text-red-400" />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="personal.aadhar"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">
													Aadhar Number*
												</FormLabel>
												<FormControl>
													<Input
														{...field}
														onChange={(e) => {
															field.onChange(e);
															trigger("personal.aadhar");
														}}
													/>
												</FormControl>
												<FormMessage className="text-red-600 dark:text-red-400" />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="personal.pan"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">
													PAN Number*
												</FormLabel>
												<FormControl>
													<Input
														{...field}
														onChange={(e) => {
															field.onChange(e);
															trigger("personal.pan");
														}}
													/>
												</FormControl>
												<FormMessage className="text-red-600 dark:text-red-400" />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="personal.address"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">Address*</FormLabel>
												<FormControl>
													<Input
														{...field}
														onChange={(e) => {
															field.onChange(e);
															trigger("personal.address");
														}}
													/>
												</FormControl>
												<FormMessage className="text-red-600 dark:text-red-400" />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="personal.city"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">City*</FormLabel>
												<FormControl>
													<Input
														{...field}
														onChange={(e) => {
															field.onChange(e);
															trigger("personal.city");
														}}
													/>
												</FormControl>
												<FormMessage className="text-red-600 dark:text-red-400" />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="personal.state"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">State*</FormLabel>
												<FormControl>
													<Input
														{...field}
														onChange={(e) => {
															field.onChange(e);
															trigger("personal.state");
														}}
													/>
												</FormControl>
												<FormMessage className="text-red-600 dark:text-red-400" />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="personal.pincode"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">
													PIN Code*
												</FormLabel>
												<FormControl>
													<Input
														{...field}
														onChange={(e) => {
															field.onChange(e);
															trigger("personal.pincode");
														}}
													/>
												</FormControl>
												<FormMessage className="text-red-600 dark:text-red-400" />
											</FormItem>
										)}
									/>
								</div>
							</TabsContent>

							{/* Employment Details Tab */}
							<TabsContent value="employment" className="space-y-4 p-6">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<FormField
										control={form.control}
										name="employment.employeeId"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">
													Employee ID*
												</FormLabel>
												<FormControl>
													<Input
														{...field}
														onChange={(e) => {
															field.onChange(e);
															trigger("employment.employeeId");
														}}
													/>
												</FormControl>
												<FormMessage className="text-red-600 dark:text-red-400" />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="employment.joiningDate"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">
													Joining Date*
												</FormLabel>
												<FormControl>
													<Input
														type="date"
														{...field}
														onChange={(e) => {
															field.onChange(e);
															trigger("employment.joiningDate");
														}}
													/>
												</FormControl>
												<FormMessage className="text-red-600 dark:text-red-400" />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="employment.department"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">
													Department*
												</FormLabel>
												<FormControl>
													<Input
														{...field}
														onChange={(e) => {
															field.onChange(e);
															trigger("employment.department");
														}}
													/>
												</FormControl>
												<FormMessage className="text-red-600 dark:text-red-400" />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="employment.position"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">
													Position*
												</FormLabel>
												<FormControl>
													<Input
														{...field}
														onChange={(e) => {
															field.onChange(e);
															trigger("employment.position");
														}}
													/>
												</FormControl>
												<FormMessage className="text-red-600 dark:text-red-400" />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="employment.employmentType"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">
													Employment Type*
												</FormLabel>
												<FormControl>
													<Select
														onValueChange={(value) => {
															field.onChange(value);
															trigger("employment.employmentType");
														}}
														defaultValue={field.value}
													>
														<SelectTrigger>
															<SelectValue placeholder="Select employment type" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="full-time">Full-time</SelectItem>
															<SelectItem value="part-time">Part-time</SelectItem>
															<SelectItem value="contract">Contract</SelectItem>
															<SelectItem value="internship">Internship</SelectItem>
														</SelectContent>
													</Select>
												</FormControl>
												<FormMessage className="text-red-600 dark:text-red-400" />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="employment.scheduleType"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">
													Schedule Type*
												</FormLabel>
												<FormControl>
													<Select
														onValueChange={(value) => {
															field.onChange(value);
															trigger("employment.scheduleType");
														}}
														defaultValue={field.value}
													>
														<SelectTrigger>
															<SelectValue placeholder="Select schedule type" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="fixed">Fixed</SelectItem>
															<SelectItem value="flexible">Flexible</SelectItem>
															<SelectItem value="shift">Shift</SelectItem>
														</SelectContent>
													</Select>
												</FormControl>
												<FormMessage className="text-red-600 dark:text-red-400" />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="employment.supervisor"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">
													Reporting Manager*
												</FormLabel>
												<FormControl>
													<Input
														{...field}
														onChange={(e) => {
															field.onChange(e);
															trigger("employment.supervisor");
														}}
													/>
												</FormControl>
												<FormMessage className="text-red-600 dark:text-red-400" />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="employment.workLocation"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">
													Work Location*
												</FormLabel>
												<FormControl>
													<Input
														{...field}
														onChange={(e) => {
															field.onChange(e);
															trigger("employment.workLocation");
														}}
													/>
												</FormControl>
												<FormMessage className="text-red-600 dark:text-red-400" />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="employment.salaryAmount"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">
													Salary Amount*
												</FormLabel>
												<FormControl>
													<Input
														type="number"
														{...field}
														onChange={(e) => {
															field.onChange(e);
															trigger("employment.salaryAmount");
														}}
													/>
												</FormControl>
												<FormMessage className="text-red-600 dark:text-red-400" />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="employment.payType"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">
													Pay Type*
												</FormLabel>
												<FormControl>
													<Select
														onValueChange={(value) => {
															field.onChange(value);
															trigger("employment.payType");
														}}
														defaultValue={field.value}
													>
														<SelectTrigger>
															<SelectValue placeholder="Select pay type" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="hourly">Hourly</SelectItem>
															<SelectItem value="salary">Salary</SelectItem>
															<SelectItem value="commission">Commission</SelectItem>
														</SelectContent>
													</Select>
												</FormControl>
												<FormMessage className="text-red-600 dark:text-red-400" />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="employment.paySchedule"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">
													Pay Schedule*
												</FormLabel>
												<FormControl>
													<Select
														onValueChange={(value) => {
															field.onChange(value);
															trigger("employment.paySchedule");
														}}
														defaultValue={field.value}
													>
														<SelectTrigger>
															<SelectValue placeholder="Select pay schedule" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="weekly">Weekly</SelectItem>
															<SelectItem value="bi-weekly">Bi-weekly</SelectItem>
															<SelectItem value="monthly">Monthly</SelectItem>
														</SelectContent>
													</Select>
												</FormControl>
												<FormMessage className="text-red-600 dark:text-red-400" />
											</FormItem>
										)}
									/>
								</div>
							</TabsContent>

							{/* Banking Details Tab */}
							<TabsContent value="banking" className="space-y-4 p-6">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<FormField
										control={form.control}
										name="banking.bankName"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">
													Bank Name*
												</FormLabel>
												<FormControl>
													<Input
														{...field}
														onChange={(e) => {
															field.onChange(e);
															trigger("banking.bankName");
														}}
													/>
												</FormControl>
												<FormMessage className="text-red-600 dark:text-red-400" />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="banking.ifscCode"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">
													IFSC Code*
												</FormLabel>
												<FormControl>
													<Input
														{...field}
														onChange={(e) => {
															field.onChange(e);
															trigger("banking.ifscCode");
														}}
													/>
												</FormControl>
												<FormMessage className="text-red-600 dark:text-red-400" />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="banking.accountNumber"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">
													Account Number*
												</FormLabel>
												<FormControl>
													<Input
														{...field}
														onChange={(e) => {
															field.onChange(e);
															trigger("banking.accountNumber");
														}}
													/>
												</FormControl>
												<FormMessage className="text-red-600 dark:text-red-400" />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="banking.accountType"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">
													Account Type*
												</FormLabel>
												<FormControl>
													<Select
														onValueChange={(value) => {
															field.onChange(value);
															trigger("banking.accountType");
														}}
														defaultValue={field.value}
													>
														<SelectTrigger>
															<SelectValue placeholder="Select account type" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="savings">Savings</SelectItem>
															<SelectItem value="current">Current</SelectItem>
															<SelectItem value="salary">Salary</SelectItem>
														</SelectContent>
													</Select>
												</FormControl>
												<FormMessage className="text-red-600 dark:text-red-400" />
											</FormItem>
										)}
									/>
								</div>
							</TabsContent>

							{/* Tax & PF Details Tab */}
							<TabsContent value="tax" className="space-y-4 p-6">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<FormField
										control={form.control}
										name="tax.uan"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">UAN</FormLabel>
												<FormControl>
													<Input
														{...field}
														onChange={(e) => {
															field.onChange(e);
															trigger("tax.uan");
														}}
													/>
												</FormControl>
												<FormMessage className="text-red-600 dark:text-red-400" />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="tax.pfNumber"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">
													PF Number*
												</FormLabel>
												<FormControl>
													<Input
														{...field}
														onChange={(e) => {
															field.onChange(e);
															trigger("tax.pfNumber");
														}}
													/>
												</FormControl>
												<FormMessage className="text-red-600 dark:text-red-400" />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="tax.esiNumber"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">
													ESI Number
												</FormLabel>
												<FormControl>
													<Input
														{...field}
														onChange={(e) => {
															field.onChange(e);
															trigger("tax.esiNumber");
														}}
													/>
												</FormControl>
												<FormMessage className="text-red-600 dark:text-red-400" />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="tax.taxRegime"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">
													Tax Regime*
												</FormLabel>
												<FormControl>
													<Select
														onValueChange={(value) => {
															field.onChange(value);
															trigger("tax.taxRegime");
														}}
														defaultValue={field.value}
													>
														<SelectTrigger>
															<SelectValue placeholder="Select tax regime" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="old">Old Regime</SelectItem>
															<SelectItem value="new">New Regime</SelectItem>
														</SelectContent>
													</Select>
												</FormControl>
												<FormMessage className="text-red-600 dark:text-red-400" />
											</FormItem>
										)}
									/>
								</div>
							</TabsContent>

							{/* Footer Buttons */}
							<CardFooter className="flex justify-between p-6 border-t">
								<Button
									variant="outline"
									type="button"
									onClick={() => {
										if (activeTab === "personal") return;
										const tabs = ["personal", "employment", "banking", "tax"];
										const currentIndex = tabs.indexOf(activeTab);
										setActiveTab(tabs[currentIndex - 1]);
									}}
									disabled={activeTab === "personal"}
								>
									Previous
								</Button>
								{activeTab !== "tax" ? (
									<Button
										type="button"
										onClick={() => {
											const tabs = ["personal", "employment", "banking", "tax"];
											const currentIndex = tabs.indexOf(activeTab);
											const nextTab = tabs[currentIndex + 1]; // Calculate the next tab
											handleTabChange(nextTab); // Navigate to the next tab
										}}
									>
										Next
									</Button>
								) : (
									<Button type="submit" disabled={loading}>
										{loading
											? "Submitting..."
											: mode === "add"
											? "Add Employee"
											: "Update Employee"}
									</Button>
								)}
							</CardFooter>
						</Tabs>
					</form>
				</Form>
			</Card>
		</div>
	);
};

export default EmployeeAddForm;
