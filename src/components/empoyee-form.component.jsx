import React, { useState, useMemo } from "react";
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

// Zod Schema Definitions
const personalSchema = z.object({
	firstName: z.string().min(1, "First name is required"),
	lastName: z.string(),
	email: z.string().email("Invalid email format"),
	phone: z.string().regex(/^\d{10}$/, "Phone must be 10 digits"),
	dob: z.string().min(1, "Date of birth is required"),
	aadhar: z.string().regex(/^\d{12}$/, "Aadhar must be 12 digits"),
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
	pan: z.string(),
});

// Combined Schema
const formSchema = z.object({
	personal: personalSchema,
	employment: employmentSchema,
	banking: bankingSchema,
});

// Default Values
const getDefaultValues = () => ({
	personal: {
		firstName: "",
		lastName: "",
		email: "",
		phone: "",
		dob: "",
		aadhar: "",
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
		pan: "",
	},
});

// FormField Component
const FormFieldWrapper = ({
	control,
	name,
	label,
	type = "text",
	options = [],
	onChange,
	required = false,
}) => (
	<FormField
		control={control}
		name={name}
		render={({ field, fieldState }) => (
			<FormItem>
				<FormLabel
					className={`text-gray-700 dark:text-gray-300 ${
						fieldState.error ? "text-red-600 dark:text-red-500 !important" : ""
					}`}
				>
					{label}
					{required && <span className="text-red-600 ml-1">*</span>}
				</FormLabel>
				<FormControl>
					{options.length > 0 ? (
						<Select
							onValueChange={(value) => {
								field.onChange(value);
								onChange && onChange(name);
							}}
							defaultValue={field.value}
						>
							<SelectTrigger className={fieldState.error ? "border-red-500" : ""}>
								<SelectValue placeholder={`Select ${label.toLowerCase()}`} />
							</SelectTrigger>
							<SelectContent>
								{options.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					) : (
						<Input
							type={type}
							{...field}
							className={fieldState.error ? "border-red-500" : ""}
							onChange={(e) => {
								field.onChange(e);
								onChange && onChange(name);
							}}
						/>
					)}
				</FormControl>
				<FormMessage
					className="!text-red-600 !dark:text-red-500 font-medium"
					style={{ color: "var(--destructive)" }}
				/>
			</FormItem>
		)}
	/>
);

const EmployeeAddForm = ({ mode = "add", initialValues = null }) => {
	const [loading, setLoading] = useState(false);
	const [activeTab, setActiveTab] = useState("personal");

	// Form setup with memoized defaultValues
	const defaultValues = useMemo(() => initialValues || getDefaultValues(), [initialValues]);

	const form = useForm({
		defaultValues,
		resolver: zodResolver(formSchema),
		mode: "onChange",
	});

	const {
		handleSubmit,
		trigger,
		formState: { errors },
	} = form;

	// Schema field configuration for each tab
	const formConfig = useMemo(
		() => ({
			personal: [
				{ name: "personal.firstName", label: "First Name", required: true },
				{ name: "personal.lastName", label: "Last Name" },
				{ name: "personal.email", label: "Email", type: "email", required: true },
				{ name: "personal.phone", label: "Phone Number", type: "tel", required: true },
				{ name: "personal.dob", label: "Date of Birth", type: "date", required: true },
				{ name: "personal.aadhar", label: "Aadhar Number", required: true },
				{ name: "personal.address", label: "Address", required: true },
				{ name: "personal.city", label: "City", required: true },
				{ name: "personal.state", label: "State", required: true },
				{ name: "personal.pincode", label: "PIN Code", required: true },
			],
			employment: [
				{ name: "employment.employeeId", label: "Employee ID", required: true },
				{ name: "employment.joiningDate", label: "Joining Date", type: "date", required: true },
				{ name: "employment.department", label: "Department", required: true },
				{ name: "employment.position", label: "Position", required: true },
				{
					name: "employment.employmentType",
					label: "Employment Type",
					required: true,
					options: [
						{ value: "full-time", label: "Full-time" },
						{ value: "part-time", label: "Part-time" },
						{ value: "contract", label: "Contract" },
						{ value: "internship", label: "Internship" },
					],
				},
				{
					name: "employment.scheduleType",
					label: "Schedule Type",
					required: true,
					options: [
						{ value: "fixed", label: "Fixed" },
						{ value: "flexible", label: "Flexible" },
						{ value: "shift", label: "Shift" },
					],
				},
				{ name: "employment.supervisor", label: "Reporting Manager", required: true },
				{ name: "employment.workLocation", label: "Work Location", required: true },
				{ name: "employment.salaryAmount", label: "Salary Amount", type: "number", required: true },
				{
					name: "employment.payType",
					label: "Pay Type",
					required: true,
					options: [
						{ value: "hourly", label: "Hourly" },
						{ value: "salary", label: "Salary" },
						{ value: "commission", label: "Commission" },
					],
				},
				{
					name: "employment.paySchedule",
					label: "Pay Schedule",
					required: true,
					options: [
						{ value: "weekly", label: "Weekly" },
						{ value: "bi-weekly", label: "Bi-weekly" },
						{ value: "monthly", label: "Monthly" },
					],
				},
			],
			banking: [
				{ name: "banking.bankName", label: "Bank Name", required: true },
				{ name: "banking.ifscCode", label: "IFSC Code", required: true },
				{ name: "banking.accountNumber", label: "Account Number", required: true },
				{
					name: "banking.accountType",
					label: "Account Type",
					required: true,
					options: [
						{ value: "savings", label: "Savings" },
						{ value: "current", label: "Current" },
						{ value: "salary", label: "Salary" },
					],
				},
				{ name: "banking.pan", label: "PAN Number", required: true },
			],
		}),
		[]
	);

	// Tab navigation with validation
	const handleTabChange = async (newTab) => {
		// Only validate the current tab's fields
		let fieldsToValidate = [];

		if (activeTab === "personal") {
			fieldsToValidate = formConfig.personal.map((field) => field.name);
		} else if (activeTab === "employment") {
			fieldsToValidate = formConfig.employment.map((field) => field.name);
		} else if (activeTab === "banking") {
			fieldsToValidate = formConfig.banking.map((field) => field.name);
		}

		// Filter for only required fields
		const requiredFields = fieldsToValidate.filter((name) => {
			const category = activeTab;
			const field = formConfig[category].find((f) => f.name === name);
			return field && field.required;
		});

		// Validate only required fields in current tab
		const results = await Promise.all(requiredFields.map((field) => trigger(field)));

		const isCurrentTabValid = results.every(Boolean);

		if (isCurrentTabValid) {
			setActiveTab(newTab);
		} else {
			toast("Validation Error", {
				description: "Please complete all required fields before proceeding",
				variant: "destructive",
			});
		}
	};

	// Form submission
	const onSubmit = async (data) => {
		try {
			setLoading(true);

			// API call would go here
			// const response = await api.saveEmployee(data);

			// Simulated API call
			await new Promise((resolve) => setTimeout(resolve, 1000));

			toast("Success", {
				description: `Employee ${mode === "add" ? "added" : "updated"} successfully`,
			});
		} catch (error) {
			toast("Error", {
				description: `Failed to ${mode === "add" ? "add" : "update"} employee: ${error.message}`,
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	// Add custom CSS to override the problematic styles
	React.useEffect(() => {
		// Create a style element
		const style = document.createElement("style");
		// Add the CSS to override the data-error styles
		style.innerHTML = `
      [data-error="true"] {
        color: var(--destructive) !important;
      }
      .form-message {
        color: var(--destructive) !important;
      }
    `;
		// Append the style element to the head
		document.head.appendChild(style);

		// Clean up on component unmount
		return () => {
			document.head.removeChild(style);
		};
	}, []);

	// Tab ordering for navigation
	const tabOrder = ["personal", "employment", "banking"];

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
							<TabsList className="grid grid-cols-3 w-full">
								{tabOrder.map((tabId) => (
									<TabsTrigger key={tabId} value={tabId} className="relative">
										{tabId.charAt(0).toUpperCase() + tabId.slice(1)} Details
										{/* Show error indicator if tab has errors */}
										{Object.keys(errors).some((key) => key.startsWith(tabId)) && (
											<span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500" />
										)}
									</TabsTrigger>
								))}
							</TabsList>

							{/* Render tab content dynamically */}
							{tabOrder.map((tabId) => (
								<TabsContent key={tabId} value={tabId} className="space-y-4 p-6">
									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
										{formConfig[tabId].map((field) => (
											<FormFieldWrapper
												key={field.name}
												control={form.control}
												name={field.name}
												label={field.label}
												type={field.type || "text"}
												options={field.options || []}
												onChange={() => {}}
												required={field.required}
											/>
										))}
									</div>
								</TabsContent>
							))}

							{/* Footer Buttons */}
							<CardFooter className="flex justify-between p-6 border-t">
								<Button
									variant="outline"
									type="button"
									onClick={() => {
										const currentIndex = tabOrder.indexOf(activeTab);
										if (currentIndex > 0) {
											setActiveTab(tabOrder[currentIndex - 1]);
										}
									}}
									disabled={activeTab === tabOrder[0]}
								>
									Previous
								</Button>

								{activeTab !== tabOrder[tabOrder.length - 1] ? (
									<Button
										type="button"
										onClick={() => {
											const currentIndex = tabOrder.indexOf(activeTab);
											if (currentIndex < tabOrder.length - 1) {
												handleTabChange(tabOrder[currentIndex + 1]);
											}
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
