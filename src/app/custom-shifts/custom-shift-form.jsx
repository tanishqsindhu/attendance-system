import { useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { addOrganizationItem } from "@/store/orgaznization-settings/organization-settings.reducer.js";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Trash2 } from "lucide-react";

const ShiftScheduleForm = () => {
	const dispatch = useDispatch();
	const [loading, setLoading] = useState(false);
	const [formState, setFormState] = useState({
		name: "",
		defaultTimes: {
			start: "08:00",
			end: "16:00",
		},
		flexibleTime: {
			enabled: false,
			graceMinutes: 15,
		},
		dayOverrides: {},
		useDayOverrides: false,
		dateOverrides: {}, // New field for date-specific overrides
	});

	const [selectedDate, setSelectedDate] = useState(null);
	const [activeTab, setActiveTab] = useState("general");

	const daysOfWeek = [
		{ key: "monday", label: "Monday" },
		{ key: "tuesday", label: "Tuesday" },
		{ key: "wednesday", label: "Wednesday" },
		{ key: "thursday", label: "Thursday" },
		{ key: "friday", label: "Friday" },
		{ key: "saturday", label: "Saturday" },
		{ key: "sunday", label: "Sunday" },
	];

	const handleChange = (e) => {
		const { name, value, type, checked } = e.target;
		if (name === "name") {
			setFormState({ ...formState, name: value });
		} else if (name === "flexibleTime.enabled") {
			setFormState({
				...formState,
				flexibleTime: {
					...formState.flexibleTime,
					enabled: checked,
				},
			});
		} else if (name === "flexibleTime.graceMinutes") {
			setFormState({
				...formState,
				flexibleTime: {
					...formState.flexibleTime,
					graceMinutes: parseInt(value),
				},
			});
		} else if (name === "useDayOverrides") {
			setFormState({
				...formState,
				useDayOverrides: checked,
			});
		} else if (name.startsWith("defaultTimes.")) {
			const field = name.split(".")[1];
			setFormState({
				...formState,
				defaultTimes: {
					...formState.defaultTimes,
					[field]: value,
				},
			});
		} else if (name.includes(".")) {
			const [day, field] = name.split(".");
			setFormState({
				...formState,
				dayOverrides: {
					...formState.dayOverrides,
					[day]: {
						...(formState.dayOverrides[day] || {}),
						[field]: value,
					},
				},
			});
		}
	};

	// Handle adding a date override
	const handleAddDateOverride = () => {
		if (!selectedDate) return;

		const dateStr = format(selectedDate, "yyyy-MM-dd");

		// If we already have this date, don't add it again
		if (formState.dateOverrides[dateStr]) {
			toast.info("This date already has an override");
			return;
		}

		setFormState({
			...formState,
			dateOverrides: {
				...formState.dateOverrides,
				[dateStr]: {
					start: formState.defaultTimes.start,
					end: formState.defaultTimes.end,
					isHoliday: false,
				},
			},
		});

		setSelectedDate(null);
		toast.success(`Added override for ${format(selectedDate, "PPP")}`);
	};

	// Handle date override field changes
	const handleDateOverrideChange = (date, field, value) => {
		setFormState({
			...formState,
			dateOverrides: {
				...formState.dateOverrides,
				[date]: {
					...formState.dateOverrides[date],
					[field]: value,
				},
			},
		});
	};

	// Remove a date override
	const handleRemoveDateOverride = (date) => {
		const newDateOverrides = { ...formState.dateOverrides };
		delete newDateOverrides[date];

		setFormState({
			...formState,
			dateOverrides: newDateOverrides,
		});

		toast.success("Date override removed");
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!formState.name) {
			toast.error("Schedule name is required");
			return;
		}
		setLoading(true);

		// Only include day overrides if the checkbox is enabled
		const scheduleData = {
			...formState,
			dayOverrides: formState.useDayOverrides ? formState.dayOverrides : {},
		};

		// Remove the checkbox control state before saving
		delete scheduleData.useDayOverrides;

		try {
			await dispatch(
				addOrganizationItem({
					itemType: "shiftSchedules",
					newItem: scheduleData,
				})
			).unwrap();

			toast.success("Shift schedule added successfully");

			// Reset form
			setFormState({
				name: "",
				defaultTimes: {
					start: "08:00",
					end: "16:00",
				},
				flexibleTime: {
					enabled: false,
					graceMinutes: 15,
				},
				dayOverrides: {},
				useDayOverrides: false,
				dateOverrides: {},
			});
		} catch (error) {
			toast.error(`Failed to add shift schedule: ${error.message}`);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<h3 className="text-xl font-bold">Add Shift Schedule</h3>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-4">
					<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
						<TabsList className="mb-4">
							<TabsTrigger value="general">General</TabsTrigger>
							<TabsTrigger value="dayOverrides">Day Overrides</TabsTrigger>
							<TabsTrigger value="dateOverrides">Date Overrides</TabsTrigger>
						</TabsList>

						<TabsContent value="general" className="space-y-4">
							<div>
								<Label htmlFor="scheduleName">Schedule Name</Label>
								<Input
									id="scheduleName"
									name="name"
									value={formState.name}
									onChange={handleChange}
									placeholder="e.g., Standard School Hours"
									className="mt-1"
									required
								/>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<Label htmlFor="defaultStartTime">Default Start Time</Label>
									<Input
										id="defaultStartTime"
										type="time"
										name="defaultTimes.start"
										value={formState.defaultTimes.start}
										onChange={handleChange}
										className="mt-1"
									/>
								</div>
								<div>
									<Label htmlFor="defaultEndTime">Default End Time</Label>
									<Input
										id="defaultEndTime"
										type="time"
										name="defaultTimes.end"
										value={formState.defaultTimes.end}
										onChange={handleChange}
										className="mt-1"
									/>
								</div>
							</div>

							<div className="flex items-center space-x-2">
								<Switch
									id="flexibleTimeEnabled"
									name="flexibleTime.enabled"
									checked={formState.flexibleTime.enabled}
									onCheckedChange={(checked) =>
										setFormState({
											...formState,
											flexibleTime: {
												...formState.flexibleTime,
												enabled: checked,
											},
										})
									}
								/>
								<Label htmlFor="flexibleTimeEnabled">Allow Flexible Timing</Label>
							</div>

							{formState.flexibleTime.enabled && (
								<div>
									<Label htmlFor="graceMinutes">Grace Period (minutes)</Label>
									<Input
										id="graceMinutes"
										type="number"
										name="flexibleTime.graceMinutes"
										value={formState.flexibleTime.graceMinutes}
										onChange={handleChange}
										min="0"
										max="60"
										className="mt-1"
									/>
								</div>
							)}
						</TabsContent>

						<TabsContent value="dayOverrides" className="space-y-4">
							<div className="flex items-center space-x-2 mb-4">
								<Checkbox
									id="useDayOverrides"
									name="useDayOverrides"
									checked={formState.useDayOverrides}
									onCheckedChange={(checked) =>
										setFormState({
											...formState,
											useDayOverrides: checked,
										})
									}
								/>
								<Label htmlFor="useDayOverrides">Use different schedules for specific days</Label>
							</div>

							{formState.useDayOverrides && (
								<div className="space-y-6">
									{daysOfWeek.map((day) => (
										<div key={day.key} className="border p-4 rounded-md">
											<h4 className="font-medium mb-2">{day.label}</h4>
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												<div>
													<Label htmlFor={`${day.key}.start`}>Start Time</Label>
													<Input
														id={`${day.key}.start`}
														type="time"
														name={`${day.key}.start`}
														value={
															formState.dayOverrides[day.key]?.start || formState.defaultTimes.start
														}
														onChange={handleChange}
														className="mt-1"
													/>
												</div>
												<div>
													<Label htmlFor={`${day.key}.end`}>End Time</Label>
													<Input
														id={`${day.key}.end`}
														type="time"
														name={`${day.key}.end`}
														value={
															formState.dayOverrides[day.key]?.end || formState.defaultTimes.end
														}
														onChange={handleChange}
														className="mt-1"
													/>
												</div>
											</div>

											<div className="mt-2">
												<div className="flex items-center space-x-2">
													<Checkbox
														id={`${day.key}.isHoliday`}
														checked={formState.dayOverrides[day.key]?.isHoliday || false}
														onCheckedChange={(checked) => {
															const newOverrides = {
																...formState.dayOverrides,
																[day.key]: {
																	...(formState.dayOverrides[day.key] || {
																		start: formState.defaultTimes.start,
																		end: formState.defaultTimes.end,
																	}),
																	isHoliday: checked,
																},
															};
															setFormState({
																...formState,
																dayOverrides: newOverrides,
															});
														}}
													/>
													<Label htmlFor={`${day.key}.isHoliday`}>Weekly Holiday</Label>
												</div>
											</div>
										</div>
									))}
								</div>
							)}
						</TabsContent>

						<TabsContent value="dateOverrides" className="space-y-4">
							<div className="border p-4 rounded-md">
								<h4 className="font-medium mb-2">Add Date-Specific Override</h4>
								<div className="flex items-center space-x-2 mb-4">
									<Popover>
										<PopoverTrigger asChild>
											<Button
												variant="outline"
												className="w-full md:w-auto justify-start text-left font-normal"
											>
												<CalendarIcon className="mr-2 h-4 w-4" />
												{selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-auto p-0" align="start">
											<Calendar
												mode="single"
												selected={selectedDate}
												onSelect={setSelectedDate}
												initialFocus
											/>
										</PopoverContent>
									</Popover>

									<Button type="button" onClick={handleAddDateOverride} disabled={!selectedDate}>
										Add Override
									</Button>
								</div>

								<div className="mt-4">
									<h4 className="font-medium mb-2">Date Overrides</h4>
									{Object.keys(formState.dateOverrides).length === 0 ? (
										<p className="text-sm text-gray-500">No date overrides added yet</p>
									) : (
										<div className="space-y-4">
											{Object.entries(formState.dateOverrides).map(([date, override]) => (
												<div key={date} className="border p-4 rounded-md">
													<div className="flex justify-between items-center mb-2">
														<h5 className="font-medium">{format(new Date(date), "PPP")}</h5>
														<Button
															variant="ghost"
															size="sm"
															onClick={() => handleRemoveDateOverride(date)}
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													</div>

													<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
														<div>
															<Label htmlFor={`${date}.start`}>Start Time</Label>
															<Input
																id={`${date}.start`}
																type="time"
																value={override.start}
																onChange={(e) =>
																	handleDateOverrideChange(date, "start", e.target.value)
																}
																className="mt-1"
															/>
														</div>
														<div>
															<Label htmlFor={`${date}.end`}>End Time</Label>
															<Input
																id={`${date}.end`}
																type="time"
																value={override.end}
																onChange={(e) =>
																	handleDateOverrideChange(date, "end", e.target.value)
																}
																className="mt-1"
															/>
														</div>
													</div>

													<div className="mt-2">
														<div className="flex items-center space-x-2">
															<Checkbox
																id={`${date}.isHoliday`}
																checked={override.isHoliday || false}
																onCheckedChange={(checked) =>
																	handleDateOverrideChange(date, "isHoliday", checked)
																}
															/>
															<Label htmlFor={`${date}.isHoliday`}>Holiday</Label>
														</div>
													</div>
												</div>
											))}
										</div>
									)}
								</div>
							</div>
						</TabsContent>
					</Tabs>
				</form>
			</CardContent>
			<CardFooter className="flex justify-end">
				<Button type="submit" onClick={handleSubmit} disabled={loading}>
					{loading ? "Adding..." : "Add Schedule"}
				</Button>
			</CardFooter>
		</Card>
	);
};

export default ShiftScheduleForm;
