import { useState, useMemo, useCallback, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { addOrganizationItem } from "../store/orgaznization-settings/organization-settings.reducer";
import { toast } from "sonner";
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
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Info, Plus, Clock } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { addEmployeeToBranch } from "@/store/employees/employees.reducer.js";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { selectCurrentUser } from "@/store/user/user.selector";

// Validation schemas
const personalSchema = z.object({
	firstName: z.string().min(1, "First name is required"),
	lastName: z.string().optional(),
	gender: z.enum(["male", "female"]).transform((val) => val.toLowerCase()),
	bloodGroup: z.string().optional(),
	email: z.string().email("Invalid email format"),
	phone: z.string().regex(/^\d{10}$/, "Phone must be exactly 10 digits"),
	dob: z.coerce.date().refine((date) => date <= new Date(), {
		message: "Date of birth must be a valid past date",
	}),
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
	employmentStatus: z.enum(["active", "non-active", "terminated", "resigned"]),
	employmentType: z.enum(["full-time", "part-time", "contract", "internship"]),
	shiftId: z.string().min(1, "Shift is required"),
	supervisor: z.string().optional(),
	branchId: z.string().min(1, "Branch is required"),
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

const advanceSettingsSchema = z.object({
	skipLateFines: z.boolean().default(false),
	skipLeaveFines: z.boolean().default(false),
});

// Combined schema
const formSchema = z.object({
	personal: personalSchema,
	employment: employmentSchema,
	banking: bankingSchema,
	advanceSettings: advanceSettingsSchema,
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
		employmentStatus: "",
		shiftId: "",
		supervisor: "",
		branchId: "",
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
	advanceSettings: {
		skipLateFines: false,
		skipLeaveFines: false,
	},
});

// Simple Modal Component
const SimpleModal = ({ isOpen, onClose, onSave, title, label, placeholder, itemType }) => {
	const [value, setValue] = useState("");

	const handleSubmit = (e) => {
		e.preventDefault();
		if (!value.trim()) {
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
						Create a new {itemType.slice(0, -1)} that will be available for all employees. A unique
						ID will be automatically assigned.
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

// Branch Modal Component
const BranchModal = ({ isOpen, onClose, onSave }) => {
	const [branch, setBranch] = useState({ name: "" });

	const handleSubmit = (e) => {
		e.preventDefault();
		if (!branch.name) {
			toast("Validation Error", {
				description: "Please enter a branch name",
				variant: "destructive",
			});
			return;
		}

		onSave({ name: branch.name });
		setBranch({ name: "" });
		onClose();
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Add New Branch</DialogTitle>
					<DialogDescription>
						Create a new branch that will be available for all employees. A unique ID will be
						automatically assigned.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4 py-4">
					<div className="grid gap-2">
						<Label htmlFor="name">
							Branch Name<span className="text-red-600 ml-1">*</span>
						</Label>
						<Input
							id="name"
							name="name"
							value={branch.name}
							onChange={(e) => setBranch({ name: e.target.value })}
							placeholder="e.g., Main Campus"
							required
						/>
					</div>
					<DialogFooter className="pt-4">
						<Button variant="outline" type="button" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit">Save Branch</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
};

// Shift Schedule Modal
const ShiftScheduleModal = ({ isOpen, onClose, onSave }) => {
	const [shift, setShift] = useState({
		name: "",
		startTime: "08:00",
		endTime: "17:00",
		days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
	});

	const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

	const handleChange = (e) => {
		const { name, value } = e.target;
		setShift((prev) => ({ ...prev, [name]: value }));
	};

	const handleDayToggle = (day) => {
		setShift((prev) => {
			const days = [...prev.days];
			if (days.includes(day)) {
				return { ...prev, days: days.filter((d) => d !== day) };
			} else {
				return { ...prev, days: [...days, day] };
			}
		});
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		if (!shift.name) {
			toast("Validation Error", {
				description: "Please enter a shift name",
				variant: "destructive",
			});
			return;
		}

		if (shift.days.length === 0) {
			toast("Validation Error", {
				description: "Please select at least one day",
				variant: "destructive",
			});
			return;
		}

		onSave({
			name: shift.name,
			startTime: shift.startTime,
			endTime: shift.endTime,
			days: [...shift.days].sort((a, b) => daysOfWeek.indexOf(a) - daysOfWeek.indexOf(b)),
		});

		setShift({
			name: "",
			startTime: "08:00",
			endTime: "17:00",
			days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
		});
		onClose();
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Add New Shift Schedule</DialogTitle>
					<DialogDescription>
						Create a new shift schedule that will be available for all employees. A unique ID will
						be automatically assigned.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4 py-4">
					<div className="grid gap-2">
						<Label htmlFor="name">
							Shift Name<span className="text-red-600 ml-1">*</span>
						</Label>
						<Input
							id="name"
							name="name"
							value={shift.name}
							onChange={handleChange}
							placeholder="e.g., Morning Shift"
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
								value={shift.startTime}
								onChange={handleChange}
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
								value={shift.endTime}
								onChange={handleChange}
								required
							/>
						</div>
					</div>
					<div className="grid gap-2">
						<Label>
							Days<span className="text-red-600 ml-1">*</span>
						</Label>
						<div className="flex flex-wrap gap-2">
							{daysOfWeek.map((day) => (
								<Button
									key={day}
									type="button"
									variant={shift.days.includes(day) ? "default" : "outline"}
									size="sm"
									onClick={() => handleDayToggle(day)}
									className="h-8 py-1 px-3 text-xs"
								>
									{day.substring(0, 3)}
								</Button>
							))}
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
	const dispatch = useDispatch();
	const { departments, positions, branches, shiftSchedules, loading } = useSelector(
		(state) => state.organization
	);
	const currentUser = useSelector(selectCurrentUser);
	const userPermissions = currentUser.roles;

	const [activeTab, setActiveTab] = useState("personal");
	const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
	const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
	const [isPositionModalOpen, setIsPositionModalOpen] = useState(false);
	const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
	const [alertState, setAlertState] = useState({
		open: false,
		title: "",
		description: "",
		variant: "default",
	});

	const defaultValues = useMemo(() => initialValues || getDefaultValues(), [initialValues]);

	// Initialize the form
	const form = useForm({
		defaultValues,
		resolver: zodResolver(formSchema),
		mode: "onChange",
	});

	const {
		handleSubmit,
		trigger,
		watch,
		setValue, // Destructure setValue here
		formState: { errors },
	} = form;

	// Use useEffect AFTER setValue is initialized
	useEffect(() => {
		if (initialValues && mode === "edit") {
			// Handle timestamp conversions
			if (initialValues.personal?.dob && typeof initialValues.personal.dob !== "string") {
				const dobDate = new Date(initialValues.personal.dob.seconds * 1000);
				setValue("personal.dob", dobDate);
			}

			if (
				initialValues.employment?.joiningDate &&
				!initialValues.employment.joiningDate.match(/^\d{4}-\d{2}-\d{2}$/)
			) {
				const joiningDate = initialValues.employment.joiningDate.seconds
					? new Date(initialValues.employment.joiningDate.seconds * 1000)
					: new Date(initialValues.employment.joiningDate);

				setValue("employment.joiningDate", joiningDate.toISOString().split("T")[0]);
			}

			// Set employment values
			Object.entries(initialValues.employment || {}).forEach(([key, value]) => {
				if (key !== "joiningDate" && key !== "createdAt") {
					setValue(`employment.${key}`, value);
				}
			});

			// Set personal values
			Object.entries(initialValues.personal || {}).forEach(([key, value]) => {
				if (key !== "dob") {
					setValue(`personal.${key}`, value);
				}
			});

			// Set banking values
			Object.entries(initialValues.banking || {}).forEach(([key, value]) => {
				setValue(`banking.${key}`, value);
			});

			// Set advanceSettings with defaults if not present
			setValue(
				"advanceSettings.skipLateFines",
				initialValues.advanceSettings?.skipLateFines || false
			);
			setValue(
				"advanceSettings.skipLeaveFines",
				initialValues.advanceSettings?.skipLeaveFines || false
			);
		}
	}, [initialValues, mode, setValue]);

	const handleAddItem = useCallback(
		async (itemType, newItem) => {
			dispatch(addOrganizationItem({ itemType, newItem }))
				.unwrap()
				.then(() => {
					const itemName =
						typeof newItem === "object" && newItem.name
							? newItem.name
							: typeof newItem === "string"
							? newItem
							: itemType === "shiftSchedules"
							? newItem.name
							: newItem;

					const itemTypeLabel =
						itemType === "shiftSchedules" ? "shift schedule" : itemType.slice(0, -1);

					toast("Success", {
						description: `New ${itemTypeLabel} "${itemName}" added successfully`,
					});
				})
				.catch((error) => {
					toast("Error", {
						description: `Failed to add new ${itemType.slice(0, -1)}`,
						variant: "destructive",
					});
				});
		},
		[dispatch]
	);

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
			<div className="relative">
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
						{options.map((item) => {
							const itemId = typeof item === "object" ? item.id : item;
							const displayValue =
								typeof item === "object"
									? itemType === "shiftSchedules"
										? `${item.name} (${item.startTime}-${item.endTime})`
										: item.name
									: item;

							return (
								<SelectItem key={itemId} value={itemId}>
									{showIcon && <Clock className="h-4 w-4 mr-2 opacity-70" />}
									{displayValue}
								</SelectItem>
							);
						})}

						<div
							className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 border-t border-slate-200 dark:border-slate-700 mt-1"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								setModalOpen(true);
							}}
						>
							<Plus className="h-3.5 w-3.5 opacity-70" />
							<span>Add New {itemType === "shiftSchedules" ? "Shift" : itemType.slice(0, -1)}</span>
						</div>
					</SelectContent>
				</Select>
			</div>
		),
		[]
	);

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
							departments,
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
							positions,
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
					name: "employment.employmentStatus",
					label: "Employment Status",
					required: true,
					options: [
						{ value: "active", label: "Active" },
						{ value: "non-active", label: "Non-Active" },
						{ value: "terminated", label: "Terminated" },
						{ value: "resigned", label: "Resigned" },
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
							shiftSchedules,
							"Select shift schedule",
							"shiftSchedules",
							setIsShiftModalOpen,
							true
						),
				},
				{
					name: "employment.branchId",
					label: "Branch",
					required: true,
					renderCustomField: (field, fieldState, onChange) =>
						createCustomSelectField(
							field,
							fieldState,
							onChange,
							branches,
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
			advanceSettings: [
				{
					name: "advanceSettings.skipLateFines",
					label: "Skip Late Fines",
					renderCustomField: (field, fieldState) => (
						<div className="flex items-center space-x-2">
							<input
								type="checkbox"
								id="skipLateFines"
								checked={field.value}
								onChange={(e) => field.onChange(e.target.checked)}
								className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
							/>
							<FormLabel className="text-gray-700 dark:text-gray-300" htmlFor="skipLateFines">
								Skip Late Fines
							</FormLabel>
						</div>
					),
				},
				{
					name: "advanceSettings.skipLeaveFines",
					label: "Skip Leave Fines",
					renderCustomField: (field, fieldState) => (
						<div className="flex items-center space-x-2">
							<input
								type="checkbox"
								id="skipLeaveFines"
								checked={field.value}
								onChange={(e) => field.onChange(e.target.checked)}
								className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
							/>
							<FormLabel className="text-gray-700 dark:text-gray-300" htmlFor="skipLeaveFines">
								Skip Leave Fines
							</FormLabel>
						</div>
					),
				},
			],
		}),
		[branches, departments, positions, shiftSchedules, createCustomSelectField]
	);

	const handleTabChange = async (newTab) => {
		if (newTab === activeTab) return;

		const requiredFields = formConfig[activeTab]
			.filter((field) => field.required)
			.map((field) => field.name);

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
		setActiveTab(newTab);
	};

	const onSubmit = async (data) => {
		try {
			const branchId = data.employment.branchId;

			const employeeData = {
				personal: data.personal,
				employment: { ...data.employment, createdAt: new Date() },
				banking: data.banking,
				advanceSettings: data.advanceSettings,
			};

			dispatch(addEmployeeToBranch({ branchId, employeeData }))
				.unwrap()
				.then(() => {
					toast("Success", {
						description: `Employee ${mode === "add" ? "added" : "updated"} successfully`,
					});
					form.reset(getDefaultValues());
					setActiveTab("personal");
					setAlertState({ open: false });
				})
				.catch((error) => {
					if (error.code === "DUPLICATE_EMPLOYEE_ID") {
						setAlertState({
							open: true,
							title: "Employee ID Error",
							description: "This employee ID already exists. Please use a unique ID.",
							variant: "destructive",
						});
					} else {
						setAlertState({
							open: true,
							title: "Error",
							description: `Failed to ${mode === "add" ? "add" : "update"} employee: ${
								error.message || error
							}`,
							variant: "destructive",
						});
						toast("Error", {
							description: `Failed to ${mode === "add" ? "add" : "update"} employee: ${
								error.message || error
							}`,
							variant: "destructive",
						});
					}
				});
		} catch (error) {
			console.error("Form submission error:", error);
			toast("Error", {
				description: `Failed to ${mode === "add" ? "add" : "update"} employee`,
				variant: "destructive",
			});
		}
	};

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

	const tabOrder = ["personal", "employment", "banking", "advanceSettings"];

	const hasTabErrors = useCallback(
		(tabId) => {
			return Object.keys(errors).some((key) => key.startsWith(tabId));
		},
		[errors]
	);

	const shouldShowAdvanceSettings = userPermissions.includes("employee_advance_setting");

	return (
		<div className="w-full max-w-5xl mx-auto p-4">
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
				itemType="departments"
			/>
			<SimpleModal
				isOpen={isPositionModalOpen}
				onClose={() => setIsPositionModalOpen(false)}
				onSave={(pos) => handleAddItem("positions", pos)}
				title="Add New Position"
				label="Position Name"
				placeholder="e.g., Science Teacher"
				itemType="positions"
			/>
			<BranchModal
				isOpen={isBranchModalOpen}
				onClose={() => setIsBranchModalOpen(false)}
				onSave={(branch) => handleAddItem("branches", branch)}
			/>

			<AlertDialog
				open={alertState.open}
				onOpenChange={(open) => setAlertState((prev) => ({ ...prev, open }))}
			>
				<AlertDialogContent
					className={alertState.variant === "destructive" ? "border-red-500" : ""}
				>
					<AlertDialogHeader>
						<AlertDialogTitle
							className={alertState.variant === "destructive" ? "text-red-500" : ""}
						>
							{alertState.title}
						</AlertDialogTitle>
						<AlertDialogDescription>{alertState.description}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogAction>Close</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

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
							<TabsList
								className={`grid ${
									shouldShowAdvanceSettings ? "grid-cols-4" : "grid-cols-3"
								} w-full`}
							>
								{tabOrder.map((tabId) => {
									if (tabId === "advanceSettings" && !shouldShowAdvanceSettings) {
										return null;
									}
									return (
										<TabsTrigger key={tabId} value={tabId} className="relative">
											{tabId.charAt(0).toUpperCase() + tabId.slice(1)} Details
											{hasTabErrors(tabId) && (
												<span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
											)}
										</TabsTrigger>
									);
								})}
							</TabsList>
							{tabOrder.map((tabId) => {
								if (tabId === "advanceSettings" && !shouldShowAdvanceSettings) {
									return null;
								}
								return (
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
								);
							})}

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

								{activeTab !== tabOrder[tabOrder.length - 2] ? (
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
