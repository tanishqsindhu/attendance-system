import React, { useState, useMemo, useEffect } from "react";
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
import { FileWarning, Info, Plus, X, Clock } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { getFirestore, doc, getDoc, setDoc, collection } from "firebase/firestore";

// Modified schema to include shift schedules
const employmentSchema = z.object({
	employeeId: z.string().min(1, "Employee ID is required"),
	joiningDate: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Joining date must be in YYYY-MM-DD format")
		.optional(),
	department: z.string().min(1, "Department is required"),
	position: z.string().min(1, "Position is required"),
	employmentType: z.enum(["full-time", "part-time", "contract", "internship"]).optional(),
	scheduleType: z.enum(["shift", "fixed", "flexible"]),
	shiftId: z.string().optional(),
	supervisor: z.string().optional(),
	branch: z.string().min(1, "Branch is required"),
	salaryAmount: z.number().min(1, "Salary amount must be a positive number"),
	paySchedule: z.enum(["weekly", "bi-weekly", "monthly"]),
});

// Rest of the schemas remain the same
const personalSchema = z.object({
	firstName: z.string().min(1, "First name is required"),
	lastName: z.string().min(1, "Last name is required"),
	gender: z.enum(["male", "female"]),
	bloodGroup: z.enum(["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]).optional(),
	email: z.string().email("Invalid email format"),
	phone: z.string().regex(/^\d{10}$/, "Phone must be exactly 10 digits"),
	dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be in YYYY-MM-DD format"),
	aadhar: z.string().optional(),
	address: z.string().optional(),
	city: z.string().optional(),
	state: z.string().optional(),
	pincode: z.string().optional(),
});

const bankingSchema = z.object({
	bankName: z.string().min(1, "Bank name is required"),
	ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC format (e.g., SBIN0123456)"),
	accountNumber: z.string().min(1, "Account number is required"),
	accountType: z.string().min(1, "Account type is required"),
	pan: z.string().optional(),
});

// Combined Schema
const formSchema = z.object({
	personal: personalSchema,
	employment: employmentSchema,
	banking: bankingSchema,
});

// Firebase service for fetching organization settings
const OrganizationSettingsService = {
	async getSettings() {
		const db = getFirestore();
		const settingsRef = doc(db, "settings", "organizationSettings");

		try {
			const docSnap = await getDoc(settingsRef);
			if (docSnap.exists()) {
				return docSnap.data();
			} else {
				// Initialize with default settings if none exist
				const defaultSettings = {
					departments: ["Admin", "Teaching", "Support Staff", "Management"],
					positions: ["Teacher", "Principal", "Accountant", "Clerk", "Peon"],
					branches: ["Main Campus", "Secondary Campus", "Primary Wing"],
					shiftSchedules: [
						{ id: "morning", name: "Morning Shift", startTime: "08:00", endTime: "14:00" },
						{ id: "afternoon", name: "Afternoon Shift", startTime: "14:00", endTime: "20:00" },
						{ id: "full-day", name: "Full Day", startTime: "09:00", endTime: "17:00" },
					],
				};

				await setDoc(settingsRef, defaultSettings);
				return defaultSettings;
			}
		} catch (error) {
			console.error("Error fetching organization settings:", error);
			toast("Error", {
				description: "Failed to load organization settings",
				variant: "destructive",
			});
			return null;
		}
	},

	async addShiftSchedule(newShift) {
		const db = getFirestore();
		const settingsRef = doc(db, "settings", "organizationSettings");

		try {
			const docSnap = await getDoc(settingsRef);
			if (docSnap.exists()) {
				const settings = docSnap.data();
				const updatedShifts = [...(settings.shiftSchedules || []), newShift];

				await setDoc(
					settingsRef,
					{
						...settings,
						shiftSchedules: updatedShifts,
					},
					{ merge: true }
				);

				return updatedShifts;
			}
			return [];
		} catch (error) {
			console.error("Error adding shift schedule:", error);
			toast("Error", {
				description: "Failed to add new shift schedule",
				variant: "destructive",
			});
			return null;
		}
	},
};

// Default Values
const getDefaultValues = () => ({
	personal: {
		firstName: "",
		lastName: "",
		gender: "",
		bloodGroup: "",
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
		shiftId: "",
		supervisor: "",
		branch: "",
		salaryAmount: "",
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
	renderCustomField = null,
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
					{renderCustomField ? (
						renderCustomField(field, fieldState, onChange)
					) : options.length > 0 ? (
						<Select
							onValueChange={(value) => {
								field.onChange(value);
								onChange && onChange(name, value);
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

// New Shift Schedule Modal Component
const ShiftScheduleModal = ({ isOpen, onClose, onSave }) => {
	const [newShift, setNewShift] = useState({
		id: "",
		name: "",
		startTime: "",
		endTime: "",
	});

	const generateId = (name) => {
		return name.toLowerCase().replace(/\s+/g, "-");
	};

	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setNewShift((prev) => {
			const updated = { ...prev, [name]: value };
			// Auto-generate ID from name
			if (name === "name") {
				updated.id = generateId(value);
			}
			return updated;
		});
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		if (!newShift.name || !newShift.startTime || !newShift.endTime) {
			toast("Validation Error", {
				description: "Please fill in all required fields",
				variant: "destructive",
			});
			return;
		}

		onSave(newShift);
		setNewShift({ id: "", name: "", startTime: "", endTime: "" });
		onClose();
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Add New Shift Schedule</DialogTitle>
					<DialogDescription>
						Create a new shift schedule that will be available for all employees.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4 py-4">
					<div className="grid gap-4">
						<div className="grid gap-2">
							<Label htmlFor="name">
								Shift Name<span className="text-red-600 ml-1">*</span>
							</Label>
							<Input
								id="name"
								name="name"
								value={newShift.name}
								onChange={handleInputChange}
								placeholder="e.g., Evening Shift"
								required
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="startTime">
									Start Time<span className="text-red-600 ml-1">*</span>
								</Label>
								<Input
									id="startTime"
									name="startTime"
									type="time"
									value={newShift.startTime}
									onChange={handleInputChange}
									required
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="endTime">
									End Time<span className="text-red-600 ml-1">*</span>
								</Label>
								<Input
									id="endTime"
									name="endTime"
									type="time"
									value={newShift.endTime}
									onChange={handleInputChange}
									required
								/>
							</div>
						</div>
					</div>

					<DialogFooter className="pt-4">
						<Button variant="outline" type="button" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit">Save Shift</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
};

const EmployeeAddForm = ({ mode = "add", initialValues = null }) => {
	const [loading, setLoading] = useState(false);
	const [activeTab, setActiveTab] = useState("personal");
	const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
	const [organizationSettings, setOrganizationSettings] = useState({
		departments: [],
		positions: [],
		branches: [],
		shiftSchedules: [],
	});

	// Fetch organization settings
	useEffect(() => {
		const fetchSettings = async () => {
			const settings = await OrganizationSettingsService.getSettings();
			if (settings) {
				setOrganizationSettings(settings);
			}
		};

		fetchSettings();
	}, []);

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
		watch,
		setValue,
		formState: { errors },
	} = form;

	// Watch scheduleType to conditionally show shift options
	const scheduleType = watch("employment.scheduleType");

	// Handle adding a new shift schedule
	const handleAddShift = async (newShift) => {
		const updatedShifts = await OrganizationSettingsService.addShiftSchedule(newShift);
		if (updatedShifts) {
			setOrganizationSettings((prev) => ({
				...prev,
				shiftSchedules: updatedShifts,
			}));

			toast("Success", {
				description: `New shift schedule "${newShift.name}" added successfully`,
			});
		}
	};

	// Custom field renderer for schedule type
	const renderScheduleTypeField = (field, fieldState, onChange) => {
		return (
			<div className="space-y-2">
				<Select
					onValueChange={(value) => {
						field.onChange(value);
						// Reset shift ID when schedule type changes
						if (value !== "shift") {
							setValue("employment.shiftId", "");
						}
						onChange && onChange("employment.scheduleType", value);
					}}
					defaultValue={field.value}
				>
					<SelectTrigger className={fieldState.error ? "border-red-500" : ""}>
						<SelectValue placeholder="Select schedule type" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="fixed">Fixed</SelectItem>
						<SelectItem value="flexible">Flexible</SelectItem>
						<SelectItem value="shift">Shift Based</SelectItem>
					</SelectContent>
				</Select>

				{field.value === "shift" && (
					<div className="pt-2">
						<div className="flex items-center justify-between mb-2">
							<Label htmlFor="shiftId" className="text-sm">
								Select Shift Schedule
							</Label>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setIsShiftModalOpen(true)}
								className="h-8 px-2 text-xs"
							>
								<Plus className="h-3 w-3 mr-1" /> Add New
							</Button>
						</div>

						<Select
							onValueChange={(value) => {
								setValue("employment.shiftId", value);
							}}
							value={watch("employment.shiftId") || ""}
						>
							<SelectTrigger className={errors.employment?.shiftId ? "border-red-500" : ""}>
								<SelectValue placeholder="Select shift schedule" />
							</SelectTrigger>
							<SelectContent>
								{organizationSettings.shiftSchedules.map((shift) => (
									<SelectItem key={shift.id} value={shift.id}>
										<div className="flex items-center">
											<Clock className="h-4 w-4 mr-2 opacity-70" />
											<span>
												{shift.name} ({shift.startTime}-{shift.endTime})
											</span>
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				)}
			</div>
		);
	};

	// Schema field configuration for each tab
	const formConfig = useMemo(
		() => ({
			personal: [
				{ name: "personal.firstName", label: "First Name", required: true },
				{ name: "personal.lastName", label: "Last Name" },
				{
					name: "personal.gender",
					label: "Gender",
					required: true,
					options: [
						{ value: "male", label: "Male" },
						{ value: "female", label: "Female" },
					],
				},
				{ name: "personal.email", label: "Email", type: "email", required: true },
				{ name: "personal.phone", label: "Phone Number", type: "tel", required: true },
				{ name: "personal.dob", label: "Date of Birth", type: "date", required: true },
				{
					name: "personal.bloodGroup",
					label: "Blood Group",
					options: [
						{ value: "O+", label: "O+" },
						{ value: "O-", label: "O-" },
						{ value: "AB+", label: "AB+" },
						{ value: "AB-", label: "AB-" },
						{ value: "A+", label: "A+" },
						{ value: "A-", label: "A-" },
						{ value: "B+", label: "B+" },
						{ value: "B-", label: "B-" },
					],
				},
				{ name: "personal.aadhar", label: "Aadhar Number" },
				{ name: "personal.address", label: "Address" },
				{ name: "personal.city", label: "City" },
				{ name: "personal.state", label: "State" },
				{ name: "personal.pincode", label: "PIN Code" },
			],
			employment: [
				{ name: "employment.employeeId", label: "Employee ID", required: true },
				{ name: "employment.joiningDate", label: "Joining Date", type: "date", required: true },
				{
					name: "employment.department",
					label: "Department",
					required: true,
					options: organizationSettings.departments.map((dept) => ({ value: dept, label: dept })),
				},
				{
					name: "employment.position",
					label: "Position",
					required: true,
					options: organizationSettings.positions.map((pos) => ({ value: pos, label: pos })),
				},
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
					renderCustomField: renderScheduleTypeField,
				},
				{
					name: "employment.branch",
					label: "Branch",
					required: true,
					options: organizationSettings.branches.map((branch) => ({
						value: branch,
						label: branch,
					})),
				},
				{ name: "employment.salaryAmount", label: "Salary Amount", type: "number", required: true },
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
				{ name: "banking.pan", label: "PAN Number" },
			],
		}),
		[organizationSettings]
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

		// Check specific conditions for the shift schedule
		if (
			activeTab === "employment" &&
			watch("employment.scheduleType") === "shift" &&
			!watch("employment.shiftId")
		) {
			toast("Validation Error", {
				description: "Please select a shift schedule",
				variant: "destructive",
				icon: <Info />,
			});
			return;
		}

		const isCurrentTabValid = results.every(Boolean);

		if (!isCurrentTabValid) {
			setActiveTab(newTab);
			toast("Validation Error", {
				description: "Please complete all required fields before proceeding",
				variant: "destructive",
				icon: <Info />,
			});
		}
	};

	// Form submission
	const onSubmit = async (data) => {
		try {
			setLoading(true);

			// Validate shift ID if schedule type is shift
			if (data.employment.scheduleType === "shift" && !data.employment.shiftId) {
				toast("Validation Error", {
					description: "Please select a shift schedule",
					variant: "destructive",
					icon: <Info />,
				});
				setLoading(false);
				return;
			}

			// API call would go here
			// const response = await api.saveEmployee(data);

			// Simulated API call
			await new Promise((resolve) => setTimeout(resolve, 1000));
			console.log(data);
			toast("Success", {
				description: `Employee ${mode === "add" ? "added" : "updated"} successfully`,
				icon: <Info />,
			});
		} catch (error) {
			toast("Error", {
				description: `Failed to ${mode === "add" ? "add" : "update"} employee: ${error.message}`,
				variant: "destructive",
				icon: <Info />,
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
			{/* New Shift Schedule Modal */}
			<ShiftScheduleModal
				isOpen={isShiftModalOpen}
				onClose={() => setIsShiftModalOpen(false)}
				onSave={handleAddShift}
			/>

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
												onChange={(name, value) => {
													if (name === "employment.scheduleType" && value !== "shift") {
														setValue("employment.shiftId", "");
													}
												}}
												required={field.required}
												renderCustomField={field.renderCustomField}
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
