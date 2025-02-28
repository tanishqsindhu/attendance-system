import React, { useState, useMemo, useEffect, useCallback } from "react";
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
import { FileWarning, Info, Plus, Clock } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

// Validation schemas
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

const employmentSchema = z.object({
	employeeId: z.string().min(1, "Employee ID is required"),
	joiningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Joining date must be in YYYY-MM-DD format"),
	department: z.string().min(1, "Department is required"),
	position: z.string().min(1, "Position is required"),
	employmentType: z.enum(["full-time", "part-time", "contract", "internship"]),
	shiftId: z.string().min(1, "Shift is required"),
	supervisor: z.string().optional(),
	branch: z.string().min(1, "Branch is required"),
	salaryAmount: z.number().min(1, "Salary amount must be a positive number"),
	paySchedule: z.enum(["weekly", "bi-weekly", "monthly"]),
});

const bankingSchema = z.object({
	bankName: z.string().min(1, "Bank name is required"),
	ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC format (e.g., SBIN0123456)"),
	accountNumber: z.string().min(1, "Account number is required"),
	accountType: z.string().min(1, "Account type is required"),
	pan: z.string().optional(),
});

// Combined schema
const formSchema = z.object({
	personal: personalSchema,
	employment: employmentSchema,
	banking: bankingSchema,
});

// Get default form values
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
		shiftId: "",
		supervisor: "",
		branch: "",
		salaryAmount: 0,
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

// Firebase service
const OrganizationSettingsService = {
	async getSettings() {
		try {
			const db = getFirestore();
			const settingsRef = doc(db, "settings", "organizationSettings");
			const docSnap = await getDoc(settingsRef);

			if (docSnap.exists()) {
				return docSnap.data();
			}

			return {
				departments: [],
				positions: [],
				branches: [],
				shiftSchedules: [],
			};
		} catch (error) {
			console.error("Error fetching organization settings:", error);
			toast("Error", {
				description: "Failed to load organization settings",
				variant: "destructive",
			});
			return {
				departments: [],
				positions: [],
				branches: [],
				shiftSchedules: [],
			};
		}
	},

	async addItem(itemType, newItem) {
		const db = getFirestore();
		const settingsRef = doc(db, "settings", "organizationSettings");

		try {
			const docSnap = await getDoc(settingsRef);
			if (docSnap.exists()) {
				const settings = docSnap.data();
				const updatedItems = [...(settings[itemType] || [])];

				// Handle shift schedules differently
				if (itemType === "shiftSchedules") {
					updatedItems.push(newItem);
				} else {
					// For simple string arrays
					updatedItems.push(newItem);
				}

				await setDoc(
					settingsRef,
					{
						...settings,
						[itemType]: updatedItems,
					},
					{ merge: true }
				);

				return updatedItems;
			}
			return [];
		} catch (error) {
			console.error(`Error adding ${itemType}:`, error);
			toast("Error", {
				description: `Failed to add new ${itemType.slice(0, -1)}`,
				variant: "destructive",
			});
			return null;
		}
	},
};

// Simple Modal Component
const SimpleModal = ({ isOpen, onClose, onSave, title, label, placeholder }) => {
	const [value, setValue] = useState("");

	const handleSubmit = (e) => {
		e.preventDefault();
		if (!value) {
			toast("Validation Error", {
				description: `Please enter a ${label.toLowerCase()}`,
				variant: "destructive",
			});
			return;
		}

		onSave(value);
		setValue("");
		onClose();
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>
						Create a new {label.toLowerCase()} that will be available for all employees.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4 py-4">
					<div className="grid gap-2">
						<Label htmlFor="value">
							{label}
							<span className="text-red-600 ml-1">*</span>
						</Label>
						<Input
							id="value"
							name="value"
							value={value}
							onChange={(e) => setValue(e.target.value)}
							placeholder={placeholder}
							required
						/>
					</div>

					<DialogFooter className="pt-4">
						<Button variant="outline" type="button" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit">Save</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
};

// Shift Schedule Modal
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

// FormField Wrapper Component
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
								if (name === "employment.salaryAmount") {
									const numValue = e.target.value === "" ? "" : Number(e.target.value);
									field.onChange(numValue);
								} else {
									field.onChange(e);
								}
								onChange && onChange(name);
							}}
							value={name === "employment.salaryAmount" && field.value === 0 ? "" : field.value}
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

// Main Component
const EmployeeAddForm = ({ mode = "add", initialValues = null }) => {
	const [loading, setLoading] = useState(false);
	const [activeTab, setActiveTab] = useState("personal");
	const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
	const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
	const [isPositionModalOpen, setIsPositionModalOpen] = useState(false);
	const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
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

	// Handle adding a new item (unified handler)
	const handleAddItem = useCallback(async (itemType, newItem) => {
		const updatedItems = await OrganizationSettingsService.addItem(itemType, newItem);
		if (updatedItems) {
			setOrganizationSettings((prev) => ({
				...prev,
				[itemType]: updatedItems,
			}));

			const itemName = itemType === "shiftSchedules" ? newItem.name : newItem;
			const itemTypeLabel =
				itemType === "shiftSchedules" ? "shift schedule" : itemType.slice(0, -1); // Remove trailing 's'

			toast("Success", {
				description: `New ${itemTypeLabel} "${itemName}" added successfully`,
			});
		}
	}, []);

	// Create select field with "Add New" button
	const createCustomSelectField = useCallback(
		(
			field,
			fieldState,
			onChange,
			options,
			placeholder,
			itemType,
			setModalOpen,
			showIcon = false
		) => (
			<div className="space-y-2">
				<Select
					onValueChange={(value) => {
						field.onChange(value);
						onChange && onChange(field.name, value);
					}}
					value={field.value}
				>
					<SelectTrigger className={fieldState.error ? "border-red-500" : ""}>
						<SelectValue placeholder={placeholder} />
					</SelectTrigger>
					<SelectContent>
						{options.map((item) => (
							<SelectItem
								key={typeof item === "object" ? item.id : item}
								value={typeof item === "object" ? item.id : item}
							>
								{showIcon && <Clock className="h-4 w-4 mr-2 opacity-70" />}
								{typeof item === "object"
									? `${item.name} (${item.startTime}-${item.endTime})`
									: item}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => setModalOpen(true)}
					className="h-8 px-2 text-xs"
				>
					<Plus className="h-3 w-3 mr-1" /> Add New
				</Button>
			</div>
		),
		[]
	);

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
					renderCustomField: (field, fieldState, onChange) =>
						createCustomSelectField(
							field,
							fieldState,
							onChange,
							organizationSettings.departments,
							"Select department",
							"departments",
							setIsDepartmentModalOpen
						),
				},
				{
					name: "employment.position",
					label: "Position",
					required: true,
					renderCustomField: (field, fieldState, onChange) =>
						createCustomSelectField(
							field,
							fieldState,
							onChange,
							organizationSettings.positions,
							"Select position",
							"positions",
							setIsPositionModalOpen
						),
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
					name: "employment.shiftId",
					label: "Shift Schedule",
					required: true,
					renderCustomField: (field, fieldState, onChange) =>
						createCustomSelectField(
							field,
							fieldState,
							onChange,
							organizationSettings.shiftSchedules,
							"Select shift schedule",
							"shiftSchedules",
							setIsShiftModalOpen,
							true
						),
				},
				{
					name: "employment.branch",
					label: "Branch",
					required: true,
					renderCustomField: (field, fieldState, onChange) =>
						createCustomSelectField(
							field,
							fieldState,
							onChange,
							organizationSettings.branches,
							"Select branch",
							"branches",
							setIsBranchModalOpen
						),
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
		[organizationSettings, createCustomSelectField]
	);

	// Tab navigation with validation
	const handleTabChange = async (newTab) => {
		if (newTab === activeTab) return;

		// Get required fields for current tab
		const requiredFields = formConfig[activeTab]
			.filter((field) => field.required)
			.map((field) => field.name);

		// Validate required fields
		if (requiredFields.length > 0) {
			const results = await Promise.all(requiredFields.map((field) => trigger(field)));
			const isCurrentTabValid = results.every(Boolean);

			if (!isCurrentTabValid) {
				setActiveTab(newTab);

				toast("Validation Error", {
					description: "Please complete all required fields before proceeding",
					variant: "destructive",
					icon: <Info />,
				});
				return;
			}
		}
	};

	// Form submission
	const onSubmit = async (data) => {
		try {
			setLoading(true);

			// Simulate API call
			await new Promise((resolve) => setTimeout(resolve, 1000));
			console.log("Employee data:", data);

			toast("Success", {
				description: `Employee ${mode === "add" ? "added" : "updated"} successfully`,
			});
		} catch (error) {
			console.error("Form submission error:", error);
			toast("Error", {
				description: `Failed to ${mode === "add" ? "add" : "update"} employee`,
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	// CSS fix for validation styling
	useEffect(() => {
		const style = document.createElement("style");
		style.innerHTML = `
			[data-error="true"] { color: var(--destructive) !important; }
			.form-message { color: var(--destructive) !important; }
		`;
		document.head.appendChild(style);

		return () => {
			document.head.removeChild(style);
		};
	}, []);

	// Tab ordering for navigation
	const tabOrder = ["personal", "employment", "banking"];

	// Check if the tab has errors
	const hasTabErrors = useCallback(
		(tabId) => {
			return Object.keys(errors).some((key) => key.startsWith(tabId));
		},
		[errors]
	);

	return (
		<div className="w-full max-w-5xl mx-auto p-4">
			{/* Modals */}
			<ShiftScheduleModal
				isOpen={isShiftModalOpen}
				onClose={() => setIsShiftModalOpen(false)}
				onSave={(shift) => handleAddItem("shiftSchedules", shift)}
			/>

			<SimpleModal
				isOpen={isDepartmentModalOpen}
				onClose={() => setIsDepartmentModalOpen(false)}
				onSave={(dept) => handleAddItem("departments", dept)}
				title="Add New Department"
				label="Department Name"
				placeholder="e.g., Human Resources"
			/>

			<SimpleModal
				isOpen={isPositionModalOpen}
				onClose={() => setIsPositionModalOpen(false)}
				onSave={(pos) => handleAddItem("positions", pos)}
				title="Add New Position"
				label="Position Name"
				placeholder="e.g., Science Teacher"
			/>

			<SimpleModal
				isOpen={isBranchModalOpen}
				onClose={() => setIsBranchModalOpen(false)}
				onSave={(branch) => handleAddItem("branches", branch)}
				title="Add New Branch"
				label="Branch Name"
				placeholder="e.g., Main Campus"
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
										{hasTabErrors(tabId) && (
											<span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
										)}
									</TabsTrigger>
								))}
							</TabsList>

							{/* Tab contents */}
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
