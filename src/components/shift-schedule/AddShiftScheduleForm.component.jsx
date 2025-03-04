import React, { useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { addOrganizationItem } from "@/store/orgaznization-settings/organization-settings.slice.js";
import { Days } from "@/lib/constants";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

const ShiftScheduleForm = ({ onClose, initialData = null }) => {
	const dispatch = useDispatch();
	const [formData, setFormData] = useState(
		initialData || {
			name: "",
			startTime: "08:00",
			endTime: "16:00",
			days: [],
			flexibleTime: {
				enabled: false,
				graceMinutes: 15,
			},
			dateOverrides: {},
		}
	);

	const [newOverride, setNewOverride] = useState({
		date: null,
		start: "",
		end: "",
		isWorkDay: true,
		description: "",
	});

	const [activeTab, setActiveTab] = useState("basic");

	const handleInputChange = useCallback((e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	}, []);

	const handleDayToggle = useCallback((day) => {
		setFormData((prev) => ({
			...prev,
			days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day],
		}));
	}, []);

	const handleFlexibleTimeToggle = useCallback(() => {
		setFormData((prev) => ({
			...prev,
			flexibleTime: {
				...prev.flexibleTime,
				enabled: !prev.flexibleTime.enabled,
			},
		}));
	}, []);

	const handleAddDateOverride = useCallback(() => {
		if (!newOverride.date) {
			toast("Date Required", {
				description: "Please select a date for the override.",
				variant: "destructive",
			});
			return;
		}

		const formattedDate = format(newOverride.date, "yyyy-MM-dd");

		setFormData((prev) => ({
			...prev,
			dateOverrides: {
				...prev.dateOverrides,
				[formattedDate]: {
					start: newOverride.start || prev.startTime,
					end: newOverride.end || prev.endTime,
					isWorkDay: newOverride.isWorkDay,
					description: newOverride.description,
				},
			},
		}));

		// Reset new override form
		setNewOverride({
			date: null,
			start: "",
			end: "",
			isWorkDay: true,
			description: "",
		});
	}, [newOverride, formData.startTime, formData.endTime]);

	const handleRemoveDateOverride = useCallback((date) => {
		setFormData((prev) => {
			const { [date]: removedOverride, ...remainingOverrides } = prev.dateOverrides;
			return {
				...prev,
				dateOverrides: remainingOverrides,
			};
		});
	}, []);

	const handleSubmit = useCallback(
		(e) => {
			e.preventDefault();

			// Basic validation
			if (
				!formData.name ||
				!formData.startTime ||
				!formData.endTime ||
				formData.days.length === 0
			) {
				toast("Validation Error", {
					description: "Please fill all required fields",
					variant: "destructive",
				});
				return;
			}

			dispatch(
				addOrganizationItem({
					itemType: "shiftSchedules",
					newItem: formData,
				})
			);

			onClose();
		},
		[formData, dispatch, onClose]
	);

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="basic">Schedule Info</TabsTrigger>
					<TabsTrigger value="overrides">Date Overrides</TabsTrigger>
				</TabsList>

				{/* Basic Shift Information Tab */}
				<TabsContent value="basic">
					<div className="space-y-4">
						<div>
							<Label className="mb-2 block">Shift Name</Label>
							<Input
								name="name"
								value={formData.name}
								onChange={handleInputChange}
								placeholder="Morning Shift"
							/>
						</div>
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label className="mb-2 block">Default Start Time</Label>
									<Input
										type="time"
										name="startTime"
										value={formData.startTime}
										onChange={handleInputChange}
									/>
								</div>
								<div>
									<Label className="mb-2 block">Default End Time</Label>
									<Input
										type="time"
										name="endTime"
										value={formData.endTime}
										onChange={handleInputChange}
									/>
								</div>
							</div>

							<div>
								<div className="flex items-center space-x-2 mb-2">
									<Checkbox
										checked={formData.flexibleTime.enabled}
										onCheckedChange={handleFlexibleTimeToggle}
									/>
									<Label>Enable Flexible Time</Label>
								</div>
								{formData.flexibleTime.enabled && (
									<div className="mt-2">
										<Label className="mb-2 block">Grace Minutes</Label>
										<Input
											type="number"
											name="flexibleTime.graceMinutes"
											value={formData.flexibleTime.graceMinutes}
											onChange={(e) =>
												setFormData((prev) => ({
													...prev,
													flexibleTime: {
														...prev.flexibleTime,
														graceMinutes: parseInt(e.target.value),
													},
												}))
											}
										/>
									</div>
								)}
							</div>
						</div>
						<div>
							<Label className="mb-2 block">Working Days</Label>
							<div className="grid grid-cols-3 gap-2">
								{Days.map((day) => (
									<div key={day} className="flex items-center space-x-2">
										<Checkbox
											checked={formData.days.includes(day)}
											onCheckedChange={() => handleDayToggle(day)}
										/>
										<Label>{day.substring(0, 3)}</Label>
									</div>
								))}
							</div>
						</div>
					</div>
				</TabsContent>

				{/* Date Overrides Tab */}
				<TabsContent value="overrides overflow-y-auto">
					<div className="space-y-4">
						{/* New Date Override Form */}
						<div className="grid grid-cols-1 gap-4">
							<div>
								<Label className="mb-2 block">Select Date</Label>
								<Calendar
									mode="single"
									selected={newOverride.date}
									onSelect={(date) => setNewOverride((prev) => ({ ...prev, date }))}
									className="rounded-md border w-full flex justify-center"
								/>
							</div>
							<div className="space-y-3">
								<div>
									<Label className="mb-2 block">Override Start Time</Label>
									<Input
										type="time"
										value={newOverride.start}
										onChange={(e) =>
											setNewOverride((prev) => ({
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
										value={newOverride.end}
										onChange={(e) =>
											setNewOverride((prev) => ({
												...prev,
												end: e.target.value,
											}))
										}
										placeholder="Leave blank for default"
									/>
								</div>
								<div className="flex items-center space-x-2 mb-2">
									<Checkbox
										checked={newOverride.isWorkDay}
										onCheckedChange={(checked) =>
											setNewOverride((prev) => ({
												...prev,
												isWorkDay: checked,
											}))
										}
									/>
									<Label>Is Work Day</Label>
								</div>
								<div>
									<Label className="mb-2 block">Description (Optional)</Label>
									<Input
										value={newOverride.description}
										onChange={(e) =>
											setNewOverride((prev) => ({
												...prev,
												description: e.target.value,
											}))
										}
										placeholder="Holiday, Special Event, etc."
									/>
								</div>
								<Button
									type="button"
									variant="outline"
									onClick={handleAddDateOverride}
									disabled={!newOverride.date}
								>
									<Plus className="mr-2 h-4 w-4" /> Add Date Override
								</Button>
							</div>
						</div>

						{/* Existing Date Overrides List */}
						{Object.keys(formData.dateOverrides).length > 0 && (
							<div className="border rounded-md p-4 mt-4">
								<h4 className="text-md font-semibold mb-3">Existing Date Overrides</h4>
								{Object.entries(formData.dateOverrides).map(([date, override]) => (
									<div
										key={date}
										className="flex justify-between items-center p-2 border-b last:border-b-0"
									>
										<div>
											<span className="font-medium">{date}</span>
											<span className="ml-2 text-muted-foreground">
												{override.start} - {override.end}
												{!override.isWorkDay && " (Non-Working Day)"}
												{override.description && ` - ${override.description}`}
											</span>
										</div>
										<Button
											variant="destructive"
											size="icon"
											type="button"
											onClick={() => handleRemoveDateOverride(date)}
										>
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
			<div className="flex justify-end space-x-2 mt-4">
				<Button type="button" variant="outline" onClick={onClose}>
					Cancel
				</Button>
				<Button type="submit">
					{initialData ? "Update Shift Schedule" : "Add Shift Schedule"}
				</Button>
			</div>
		</form>
	);
};

export default ShiftScheduleForm;
