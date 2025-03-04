import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
	addShiftScheduleDateOverride,
	removeShiftScheduleDateOverride,
} from "@/store/organization-settings/organization-settings.slice";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { toast } from "@/components/ui/use-toast";

const DateOverrideForm = ({ scheduleId, existingOverrides = {} }) => {
	const dispatch = useDispatch();
	const [selectedDate, setSelectedDate] = useState(null);
	const [overrideData, setOverrideData] = useState({
		start: "",
		end: "",
		isWorkDay: true,
		description: "",
	});

	const handleAddDateOverride = () => {
		if (!selectedDate) {
			toast({
				title: "Date Required",
				description: "Please select a date for the override.",
				variant: "destructive",
			});
			return;
		}

		const formattedDate = format(selectedDate, "yyyy-MM-dd");

		dispatch(
			addShiftScheduleDateOverride({
				scheduleId,
				dateOverride: {
					date: formattedDate,
					...overrideData,
				},
			})
		).then(() => {
			toast({
				title: "Date Override Added",
				description: `Override added for ${formattedDate}`,
			});
			// Reset form
			setSelectedDate(null);
			setOverrideData({
				start: "",
				end: "",
				isWorkDay: true,
				description: "",
			});
		});
	};

	const handleRemoveDateOverride = (date) => {
		dispatch(
			removeShiftScheduleDateOverride({
				scheduleId,
				date,
			})
		).then(() => {
			toast({
				title: "Date Override Removed",
				description: `Override removed for ${date}`,
			});
		});
	};

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="outline">Manage Date Overrides</Button>
			</DialogTrigger>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Manage Date Overrides</DialogTitle>
				</DialogHeader>

				<div className="grid grid-cols-2 gap-4">
					{/* Date Selection */}
					<div>
						<Label>Select Date</Label>
						<Calendar
							mode="single"
							selected={selectedDate}
							onSelect={setSelectedDate}
							className="rounded-md border"
						/>
					</div>

					{/* Override Form */}
					<div className="space-y-4">
						<div>
							<Label>Start Time</Label>
							<Input
								type="time"
								value={overrideData.start}
								onChange={(e) =>
									setOverrideData((prev) => ({
										...prev,
										start: e.target.value,
									}))
								}
							/>
						</div>
						<div>
							<Label>End Time</Label>
							<Input
								type="time"
								value={overrideData.end}
								onChange={(e) =>
									setOverrideData((prev) => ({
										...prev,
										end: e.target.value,
									}))
								}
							/>
						</div>
						<div className="flex items-center space-x-2">
							<Checkbox
								checked={overrideData.isWorkDay}
								onCheckedChange={(checked) =>
									setOverrideData((prev) => ({
										...prev,
										isWorkDay: checked,
									}))
								}
							/>
							<Label>Is Work Day</Label>
						</div>
						<div>
							<Label>Description (Optional)</Label>
							<Input
								value={overrideData.description}
								onChange={(e) =>
									setOverrideData((prev) => ({
										...prev,
										description: e.target.value,
									}))
								}
								placeholder="Holiday, Special Event, etc."
							/>
						</div>
						<Button onClick={handleAddDateOverride} disabled={!selectedDate}>
							Add Date Override
						</Button>
					</div>
				</div>

				{/* Existing Overrides */}
				<div className="mt-4">
					<h3 className="text-lg font-semibold mb-2">Existing Date Overrides</h3>
					{Object.entries(existingOverrides).length === 0 ? (
						<p className="text-muted-foreground">No date overrides exist.</p>
					) : (
						<div className="space-y-2">
							{Object.entries(existingOverrides).map(([date, override]) => (
								<div key={date} className="flex justify-between items-center p-2 border rounded">
									<div>
										<span className="font-medium">{date}</span>
										<span className="ml-2 text-muted-foreground">
											{override.start} - {override.end}
											{!override.isWorkDay && " (Non-Working Day)"}
										</span>
									</div>
									<Button
										variant="destructive"
										size="sm"
										onClick={() => handleRemoveDateOverride(date)}
									>
										Remove
									</Button>
								</div>
							))}
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default DateOverrideForm;
