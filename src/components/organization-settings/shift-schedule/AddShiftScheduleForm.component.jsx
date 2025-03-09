import { useState, useMemo, useEffect } from "react";
import { useDispatch } from "react-redux";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { addOrganizationItem, updateOrganizationItem, addShiftScheduleDateOverride, removeShiftScheduleDateOverride, addShiftScheduleDayOverride, removeShiftScheduleDayOverride } from "@/store/organization-settings/organization-settings.slice";
import { Days } from "@/lib/constants";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Define Zod schema for validation
const shiftScheduleSchema = z.object({
	name: z.string().min(1, "Shift name is required"),
	startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
	endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
	days: z.array(z.string()).min(1, "At least one day must be selected"),
	flexibleTime: z.object({
		enabled: z.boolean(),
		graceMinutes: z.number().min(0).max(120),
	}),
	dateOverrides: z
		.record(
			z.string(),
			z.object({
				start: z.string(),
				end: z.string(),
				isWorkDay: z.boolean(),
				description: z.string(),
			})
		)
		.optional(),
	dayOverrides: z
		.record(
			z.string(),
			z.object({
				start: z.string(),
				end: z.string(),
				isWorkDay: z.boolean(),
				description: z.string(),
			})
		)
		.optional(),
});

const ShiftScheduleForm = ({ onClose, scheduleId = null, scheduleData = null }) => {
	const dispatch = useDispatch();
	const [activeTab, setActiveTab] = useState("basic");
	const [isAddingDateOverride, setIsAddingDateOverride] = useState(false);
	const [isAddingDayOverride, setIsAddingDayOverride] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const isEditMode = Boolean(scheduleData);

	// Set up default values based on whether we're editing or creating
	const defaultValues = useMemo(() => {
		if (scheduleData) {
			return {
				name: scheduleData.name || "",
				startTime: scheduleData.startTime || "",
				endTime: scheduleData.endTime || "",

				days: scheduleData.days || [],
				flexibleTime: {
					enabled: scheduleData.flexibleTime?.enabled || false,
					graceMinutes: scheduleData.flexibleTime?.graceMinutes || 15,
				},
				dateOverrides: scheduleData.dateOverrides || {},
				dayOverrides: scheduleData.dayOverrides || {},
			};
		}

		return {
			name: "",
			startTime: "00:00",
			endTime: "00:00",
			days: [],
			flexibleTime: {
				enabled: false,
				graceMinutes: 15,
			},
			dateOverrides: {},
			dayOverrides: {},
		};
	}, [scheduleData]);

	const form = useForm({
		resolver: zodResolver(shiftScheduleSchema),
		defaultValues,
	});

	// Reset form when the existing schedule changes
	useEffect(() => {
		form.reset(defaultValues);
	}, [defaultValues, form]);

	const [newDateOverride, setNewDateOverride] = useState({
		date: null,
		start: "",
		end: "",
		isWorkDay: true,
		description: "",
	});

	const [newDayOverride, setNewDayOverride] = useState({
		day: "",
		start: "",
		end: "",
		isWorkDay: true,
		description: "",
	});

	const handleDayToggle = (day) => {
		const currentDays = form.getValues("days");
		const updatedDays = currentDays.includes(day) ? currentDays.filter((d) => d !== day) : [...currentDays, day];

		form.setValue("days", updatedDays, { shouldValidate: true });
	};

	const handleAddDateOverride = () => {
		if (!newDateOverride.date) {
			toast.error("Date Required", {
				description: "Please select a date for the override.",
			});
			return;
		}

		const formattedDate = format(newDateOverride.date, "yyyy-MM-dd");
		setIsAddingDateOverride(true);

		if (isEditMode) {
			const dateOverrideData = {
				date: formattedDate,
				start: newDateOverride.start || form.getValues("defaultTimes.start"),
				end: newDateOverride.end || form.getValues("defaultTimes.end"),
				isWorkDay: newDateOverride.isWorkDay,
				description: newDateOverride.description,
			};

			dispatch(
				addShiftScheduleDateOverride({
					scheduleId,
					dateOverride: dateOverrideData,
				})
			).then((result) => {
				setIsAddingDateOverride(false);

				if (!result.error) {
					resetDateOverrideForm();
					toast.success("Date override added successfully");
				} else {
					toast.error("Failed to add date override", {
						description: result.error.message,
					});
				}
			});
		} else {
			// For new schedules, update the local form state
			setTimeout(() => {
				const currentOverrides = form.getValues("dateOverrides") || {};
				form.setValue("dateOverrides", {
					...currentOverrides,
					[formattedDate]: {
						start: newDateOverride.start || form.getValues("defaultTimes.start"),
						end: newDateOverride.end || form.getValues("defaultTimes.end"),
						isWorkDay: newDateOverride.isWorkDay,
						description: newDateOverride.description,
					},
				});

				resetDateOverrideForm();
				setIsAddingDateOverride(false);
				toast.success("Date override added successfully");
			}, 300);
		}
	};

	const resetDateOverrideForm = () => {
		setNewDateOverride({
			date: null,
			start: "",
			end: "",
			isWorkDay: true,
			description: "",
		});
	};

	const handleRemoveDateOverride = (date) => {
		if (isEditMode) {
			dispatch(
				removeShiftScheduleDateOverride({
					scheduleId,
					date,
				})
			).then((result) => {
				if (!result.error) {
					toast.success("Date override removed successfully");
				} else {
					toast.error("Failed to remove date override", {
						description: result.error.message,
					});
				}
			});
		} else {
			const currentOverrides = form.getValues("dateOverrides") || {};
			const updatedOverrides = { ...currentOverrides };
			delete updatedOverrides[date];
			form.setValue("dateOverrides", updatedOverrides);
			toast.success("Date override removed successfully");
		}
	};

	const handleAddDayOverride = () => {
		if (!newDayOverride.day) {
			toast.error("Day Required", {
				description: "Please select a day for the override.",
			});
			return;
		}

		setIsAddingDayOverride(true);

		if (isEditMode) {
			const dayOverrideData = {
				day: newDayOverride.day,
				start: newDayOverride.start || form.getValues("defaultTimes.start"),
				end: newDayOverride.end || form.getValues("defaultTimes.end"),
				isWorkDay: newDayOverride.isWorkDay,
				description: newDayOverride.description,
			};

			dispatch(
				addShiftScheduleDayOverride({
					scheduleId,
					dayOverride: dayOverrideData,
				})
			).then((result) => {
				setIsAddingDayOverride(false);

				if (!result.error) {
					resetDayOverrideForm();
					toast.success("Day override added successfully");
				} else {
					toast.error("Failed to add day override", {
						description: result.error.message,
					});
				}
			});
		} else {
			// For new schedules, update the local form state
			setTimeout(() => {
				const currentDayOverrides = form.getValues("dayOverrides") || {};
				form.setValue("dayOverrides", {
					...currentDayOverrides,
					[newDayOverride.day]: {
						start: newDayOverride.start || form.getValues("defaultTimes.start"),
						end: newDayOverride.end || form.getValues("defaultTimes.end"),
						isWorkDay: newDayOverride.isWorkDay,
						description: newDayOverride.description,
					},
				});

				resetDayOverrideForm();
				setIsAddingDayOverride(false);
				toast.success("Day override added successfully");
			}, 300);
		}
	};

	const resetDayOverrideForm = () => {
		setNewDayOverride({
			day: "",
			start: "",
			end: "",
			isWorkDay: true,
			description: "",
		});
	};

	const handleRemoveDayOverride = (day) => {
		if (isEditMode) {
			dispatch(
				removeShiftScheduleDayOverride({
					scheduleId,
					day,
				})
			).then((result) => {
				if (!result.error) {
					toast.success("Day override removed successfully");
				} else {
					toast.error("Failed to remove day override", {
						description: result.error.message,
					});
				}
			});
		} else {
			const currentOverrides = form.getValues("dayOverrides") || {};
			const updatedOverrides = { ...currentOverrides };
			delete updatedOverrides[day];
			form.setValue("dayOverrides", updatedOverrides);
			toast.success("Day override removed successfully");
		}
	};

	const onSubmit = (data) => {
		setIsSubmitting(true);
		const schedulePayload = {
			name: data.name,
			startTime: data.startTime,
			endTime: data.endTime,
			days: data.days,
			flexibleTime: data.flexibleTime,
			dateOverrides: data.dateOverrides || {},
			dayOverrides: data.dayOverrides || {},
		};

		if (isEditMode) {
			dispatch(
				updateOrganizationItem({
					itemType: "shiftSchedules",
					itemId: scheduleId,
					updatedItem: schedulePayload,
				})
			).then((result) => {
				setIsSubmitting(false);
				if (!result.error) {
					toast.success("Shift schedule updated successfully");
					onClose();
				} else {
					toast.error("Failed to update shift schedule", {
						description: result.error.message,
					});
				}
			});
		} else {
			dispatch(
				addOrganizationItem({
					itemType: "shiftSchedules",
					newItem: schedulePayload,
				})
			).then((result) => {
				setIsSubmitting(false);
				if (!result.error) {
					toast.success("Shift schedule added successfully");
					onClose();
				} else {
					toast.error("Failed to add shift schedule", {
						description: result.error.message,
					});
				}
			});
		}
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
					<TabsList className="grid w-full grid-cols-3">
						<TabsTrigger value="basic">Schedule Info</TabsTrigger>
						<TabsTrigger value="dayOverrides">Day Overrides</TabsTrigger>
						<TabsTrigger value="dateOverrides">Date Overrides</TabsTrigger>
					</TabsList>

					{/* Basic Shift Information Tab */}
					<TabsContent value="basic">
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Shift Name</FormLabel>
										<FormControl>
											<Input {...field} placeholder="Morning Shift" />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="startTime"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Default Start Time</FormLabel>
											<FormControl>
												<Input type="time" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="endTime"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Default End Time</FormLabel>
											<FormControl>
												<Input type="time" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div>
								<FormField
									control={form.control}
									name="flexibleTime.enabled"
									render={({ field }) => (
										<FormItem className="flex flex-row items-start space-x-3 space-y-0 mb-2">
											<FormControl>
												<Checkbox checked={field.value} onCheckedChange={field.onChange} />
											</FormControl>
											<div className="space-y-1 leading-none">
												<FormLabel>Enable Flexible Time</FormLabel>
											</div>
										</FormItem>
									)}
								/>

								{form.watch("flexibleTime.enabled") && (
									<FormField
										control={form.control}
										name="flexibleTime.graceMinutes"
										render={({ field }) => (
											<FormItem className="mt-2">
												<FormLabel>Grace Minutes</FormLabel>
												<FormControl>
													<Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value, 10))} />
												</FormControl>
												<FormDescription>Allowed minutes before/after shift start time</FormDescription>
												<FormMessage />
											</FormItem>
										)}
									/>
								)}
							</div>

							<div>
								<FormField
									control={form.control}
									name="days"
									render={() => (
										<FormItem>
											<FormLabel className="mb-2 block">Working Days</FormLabel>
											<div className="grid grid-cols-3 gap-2">
												{Days.map((day) => (
													<div key={day} className="flex items-center space-x-2">
														<Checkbox checked={form.watch("days").includes(day)} onCheckedChange={() => handleDayToggle(day)} id={`day-${day}`} />
														<Label htmlFor={`day-${day}`}>{day.substring(0, 3)}</Label>
													</div>
												))}
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</div>
					</TabsContent>

					{/* Day Overrides Tab */}
					<TabsContent value="dayOverrides" className="overflow-y-auto">
						<div className="space-y-4">
							{/* New Day Override Form */}
							<div className="grid grid-cols-1 gap-4">
								<div>
									<Label className="mb-2 block">Select Day</Label>
									<Select value={newDayOverride.day} onValueChange={(value) => setNewDayOverride((prev) => ({ ...prev, day: value }))}>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Select a day" />
										</SelectTrigger>
										<SelectContent>
											{Days.map((day) => (
												<SelectItem key={day} value={day}>
													{day}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-3">
									<div>
										<Label className="mb-2 block">Override Start Time</Label>
										<Input
											type="time"
											value={newDayOverride.start}
											onChange={(e) =>
												setNewDayOverride((prev) => ({
													...prev,
													start: e.target.value,
												}))
											}
											placeholder="Leave blank for default"
										/>
									</div>
									<div>
										<Label className="mb-2 block">Override End Time</Label>
										<Input
											type="time"
											value={newDayOverride.end}
											onChange={(e) =>
												setNewDayOverride((prev) => ({
													...prev,
													end: e.target.value,
												}))
											}
											placeholder="Leave blank for default"
										/>
									</div>
									<div className="flex items-center space-x-2 mb-2">
										<Checkbox
											id="day-override-is-workday"
											checked={newDayOverride.isWorkDay}
											onCheckedChange={(checked) =>
												setNewDayOverride((prev) => ({
													...prev,
													isWorkDay: checked,
												}))
											}
										/>
										<Label htmlFor="day-override-is-workday">Is Work Day</Label>
									</div>
									<div>
										<Label className="mb-2 block">Description</Label>
										<Input
											value={newDayOverride.description}
											onChange={(e) =>
												setNewDayOverride((prev) => ({
													...prev,
													description: e.target.value,
												}))
											}
											placeholder="Special hours for Fridays, etc."
										/>
									</div>
									<Button className="w-full" type="button" variant="outline" onClick={handleAddDayOverride} disabled={!newDayOverride.day || isAddingDayOverride}>
										{isAddingDayOverride ? (
											<>
												<svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
													<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
													<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
												</svg>
												Adding...
											</>
										) : (
											<>
												<Plus className="mr-2 h-4 w-4" /> Add Day Override
											</>
										)}
									</Button>
								</div>
							</div>

							{/* Existing Day Overrides List */}
							{Object.keys(form.watch("dayOverrides") || {}).length > 0 && (
								<div className="border rounded-md p-4 mt-4">
									<h4 className="text-md font-semibold mb-3">Existing Day Overrides</h4>
									{Object.entries(form.watch("dayOverrides")).map(([day, override]) => (
										<div key={day} className="flex justify-between items-center p-2 border-b last:border-b-0">
											<div>
												<span className="font-medium">{day}</span>
												<span className="ml-2 text-muted-foreground">
													{override.start} - {override.end}
													{!override.isWorkDay && " (Non-Working Day)"}
													{override.description && ` - ${override.description}`}
												</span>
											</div>
											<Button variant="destructive" size="icon" type="button" onClick={() => handleRemoveDayOverride(day)}>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									))}
								</div>
							)}
						</div>
					</TabsContent>

					{/* Date Overrides Tab */}
					<TabsContent value="dateOverrides" className="overflow-y-auto">
						<div className="space-y-4">
							{/* New Date Override Form */}
							<div className="grid grid-cols-1 gap-4">
								<div>
									<Label className="mb-2 block">Select Date</Label>
									<Calendar fromYear={2000} toYear={2030} mode="single" selected={newDateOverride.date} onSelect={(date) => setNewDateOverride((prev) => ({ ...prev, date }))} className="rounded-md border w-full flex justify-center" />
								</div>
								<div className="space-y-3">
									<div>
										<Label className="mb-2 block">Override Start Time</Label>
										<Input
											type="time"
											value={newDateOverride.start}
											onChange={(e) =>
												setNewDateOverride((prev) => ({
													...prev,
													start: e.target.value,
												}))
											}
											placeholder="Leave blank for default"
										/>
									</div>
									<div>
										<Label className="mb-2 block">Override End Time</Label>
										<Input
											type="time"
											value={newDateOverride.end}
											onChange={(e) =>
												setNewDateOverride((prev) => ({
													...prev,
													end: e.target.value,
												}))
											}
											placeholder="Leave blank for default"
										/>
									</div>
									<div className="flex items-center space-x-2 mb-2">
										<Checkbox
											id="date-override-is-workday"
											checked={newDateOverride.isWorkDay}
											onCheckedChange={(checked) =>
												setNewDateOverride((prev) => ({
													...prev,
													isWorkDay: checked,
												}))
											}
										/>
										<Label htmlFor="date-override-is-workday">Is Work Day</Label>
									</div>
									<div>
										<Label className="mb-2 block">Description</Label>
										<Input
											value={newDateOverride.description}
											onChange={(e) =>
												setNewDateOverride((prev) => ({
													...prev,
													description: e.target.value,
												}))
											}
											placeholder="Holiday, Special Event, etc."
										/>
									</div>
									<Button className="w-full" type="button" variant="outline" onClick={handleAddDateOverride} disabled={!newDateOverride.date || isAddingDateOverride}>
										{isAddingDateOverride ? (
											<>
												<svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
													<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
													<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
												</svg>
												Adding...
											</>
										) : (
											<>
												<Plus className="mr-2 h-4 w-4" /> Add Date Override
											</>
										)}
									</Button>
								</div>
							</div>

							{/* Existing Date Overrides List */}
							{Object.keys(form.watch("dateOverrides") || {}).length > 0 && (
								<div className="border rounded-md p-4 mt-4">
									<h4 className="text-md font-semibold mb-3">Existing Date Overrides</h4>
									{Object.entries(form.watch("dateOverrides")).map(([date, override]) => (
										<div key={date} className="flex justify-between items-center p-2 border-b last:border-b-0">
											<div>
												<span className="font-medium">{date}</span>
												<span className="ml-2 text-muted-foreground">
													{override.start} - {override.end}
													{!override.isWorkDay && " (Non-Working Day)"}
													{override.description && ` - ${override.description}`}
												</span>
											</div>
											<Button variant="destructive" size="icon" type="button" onClick={() => handleRemoveDateOverride(date)}>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									))}
								</div>
							)}
						</div>
					</TabsContent>
				</Tabs>

				{/* Form Actions */}
				<div className="flex justify-end space-x-2 mt-4 w-full">
					<Button className="w-full" type="button" variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button className="w-full" type="submit" disabled={isSubmitting}>
						{isSubmitting ? (
							<>
								<svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
									<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
									<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								{isEditMode ? "Updating..." : "Adding..."}
							</>
						) : (
							<>{isEditMode ? "Update Shift Schedule" : "Add Shift Schedule"}</>
						)}
					</Button>
				</div>
			</form>
		</Form>
	);
};

export default ShiftScheduleForm;
