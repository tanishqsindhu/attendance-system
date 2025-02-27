import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Zod Schema Definitions
const personalSchema = z.object({
	firstName: z.string().min(1, "First name is required"),
	lastName: z.string().min(1, "Last name is required"),
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

const EmployeeAddForm = () => {
	const [loading, setLoading] = useState(false);
	const [activeTab, setActiveTab] = useState("personal");

	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
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
				description: "Employee added successfully to the payroll system",
			});
		}, 1500);
	};

	return (
		<div className="w-full max-w-5xl mx-auto p-4">
			<Card>
				<CardHeader className="bg-slate-50">
					<CardTitle className="text-2xl">Add New Employee</CardTitle>
					<CardDescription>Enter employee details for the school payroll system</CardDescription>
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
												<FormLabel>First Name*</FormLabel>
												<FormControl>
													<Input {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="personal.lastName"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Last Name*</FormLabel>
												<FormControl>
													<Input {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="personal.email"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Email*</FormLabel>
												<FormControl>
													<Input type="email" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="personal.phone"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Phone Number*</FormLabel>
												<FormControl>
													<Input type="tel" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="personal.dob"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Date of Birth*</FormLabel>
												<FormControl>
													<Input type="date" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="personal.aadhar"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Aadhar Number*</FormLabel>
												<FormControl>
													<Input {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="personal.pan"
										render={({ field }) => (
											<FormItem>
												<FormLabel>PAN Number*</FormLabel>
												<FormControl>
													<Input {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="personal.address"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Address*</FormLabel>
												<FormControl>
													<Input {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="personal.city"
										render={({ field }) => (
											<FormItem>
												<FormLabel>City*</FormLabel>
												<FormControl>
													<Input {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="personal.state"
										render={({ field }) => (
											<FormItem>
												<FormLabel>State*</FormLabel>
												<FormControl>
													<Input {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="personal.pincode"
										render={({ field }) => (
											<FormItem>
												<FormLabel>PIN Code*</FormLabel>
												<FormControl>
													<Input {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
							</TabsContent>

							{/* Employment Tab */}
							<TabsContent value="employment" className="space-y-4 p-6">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<FormField
										control={form.control}
										name="employment.employeeId"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Employee ID*</FormLabel>
												<FormControl>
													<Input {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="employment.joiningDate"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Joining Date*</FormLabel>
												<FormControl>
													<Input type="date" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="employment.department"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Department*</FormLabel>
												<FormControl>
													<Input {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="employment.position"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Position*</FormLabel>
												<FormControl>
													<Input {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="employment.employmentType"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Employment Type*</FormLabel>
												<FormControl>
													<Select onValueChange={field.onChange} value={field.value}>
														<SelectTrigger>
															<SelectValue placeholder="Select employment type" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="full-time">Full-time</SelectItem>
															<SelectItem value="part-time">Part-time</SelectItem>
															<SelectItem value="contract">Contract</SelectItem>
														</SelectContent>
													</Select>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="employment.scheduleType"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Schedule Type*</FormLabel>
												<FormControl>
													<Select onValueChange={field.onChange} value={field.value}>
														<SelectTrigger>
															<SelectValue placeholder="Select schedule type" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="fixed">Fixed</SelectItem>
															<SelectItem value="flexible">Flexible</SelectItem>
														</SelectContent>
													</Select>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="employment.supervisor"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Reporting Manager*</FormLabel>
												<FormControl>
													<Input {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="employment.workLocation"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Work Location*</FormLabel>
												<FormControl>
													<Input {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="employment.salaryAmount"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Salary Amount*</FormLabel>
												<FormControl>
													<Input type="number" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="employment.payType"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Pay Type*</FormLabel>
												<FormControl>
													<Select onValueChange={field.onChange} value={field.value}>
														<SelectTrigger>
															<SelectValue placeholder="Select pay type" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="monthly">Monthly</SelectItem>
															<SelectItem value="hourly">Hourly</SelectItem>
														</SelectContent>
													</Select>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="employment.paySchedule"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Pay Schedule*</FormLabel>
												<FormControl>
													<Select onValueChange={field.onChange} value={field.value}>
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
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
							</TabsContent>

							{/* Banking Tab */}
							<TabsContent value="banking" className="space-y-4 p-6">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<FormField
										control={form.control}
										name="banking.bankName"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Bank Name*</FormLabel>
												<FormControl>
													<Input {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="banking.ifscCode"
										render={({ field }) => (
											<FormItem>
												<FormLabel>IFSC Code*</FormLabel>
												<FormControl>
													<Input {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="banking.accountNumber"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Account Number*</FormLabel>
												<FormControl>
													<Input {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="banking.accountType"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Account Type*</FormLabel>
												<FormControl>
													<Select onValueChange={field.onChange} value={field.value}>
														<SelectTrigger>
															<SelectValue placeholder="Select account type" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="savings">Savings</SelectItem>
															<SelectItem value="current">Current</SelectItem>
														</SelectContent>
													</Select>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
							</TabsContent>
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
									<Button type="button" onClick={() => handleTabChange("employment")}>
										Next
									</Button>
								) : (
									<Button type="submit" disabled={loading}>
										{loading ? "Submitting..." : "Add Employee"}
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
