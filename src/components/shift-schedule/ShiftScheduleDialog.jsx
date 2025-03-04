import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	selectShiftScheduleById,
	removeShiftScheduleDateOverride,
} from "@/store/orgaznization-settings/organization-settings.slice.js";
import ShiftScheduleForm from "@/components/shift-schedule/AddShiftScheduleForm.component";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2, Edit } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Days } from "@/lib/constants";

const ShiftScheduleDialog = ({
	scheduleId,
	triggerText = "View",
	editState = false,
	variantType = "outline",
}) => {
	const dispatch = useDispatch();
	const [isEditing, setIsEditing] = useState(editState);
	const [activeTab, setActiveTab] = useState("general");
	const schedule = useSelector((state) => selectShiftScheduleById(state, scheduleId));

	const handleRemoveDateOverride = (date) => {
		dispatch(
			removeShiftScheduleDateOverride({
				scheduleId,
				date,
			})
		);
	};

	if (!schedule) return null;

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant={variantType}>{triggerText}</Button>
			</DialogTrigger>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>{isEditing ? "Edit Shift Schedule" : schedule.name}</DialogTitle>
				</DialogHeader>

				{isEditing ? (
					<ShiftScheduleForm initialData={schedule} onClose={() => setIsEditing(false)} />
				) : (
					<div>
						<div className="flex space-x-4 mb-4">
							<Button
								variant={activeTab === "general" ? "default" : "outline"}
								onClick={() => setActiveTab("general")}
							>
								General Info
							</Button>
							<Button
								variant={activeTab === "dateOverrides" ? "default" : "outline"}
								onClick={() => setActiveTab("dateOverrides")}
							>
								Date Overrides
							</Button>
						</div>

						{activeTab === "general" && (
							<div className="space-y-4">
								<div>
									<strong>Shift ID:</strong> {schedule.id}
								</div>
								<div>
									<strong>Start Time:</strong> {schedule.startTime}
								</div>
								<div>
									<strong>End Time:</strong> {schedule.endTime}
								</div>
								<div>
									<strong>Working Days:</strong> {schedule.days.join(", ")}
								</div>
								{schedule.flexibleTime?.enabled && (
									<div>
										<strong>Flexible Time:</strong>
										{schedule.flexibleTime.graceMinutes} minutes grace
									</div>
								)}
							</div>
						)}

						{activeTab === "dateOverrides" && (
							<div>
								{Object.keys(schedule.dateOverrides || {}).length === 0 ? (
									<Alert>
										<AlertDescription>
											No date overrides exist for this shift schedule.
										</AlertDescription>
									</Alert>
								) : (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Date</TableHead>
												<TableHead>Start Time</TableHead>
												<TableHead>End Time</TableHead>
												<TableHead>Is Work Day</TableHead>
												<TableHead>Actions</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{Object.entries(schedule.dateOverrides).map(([date, override]) => (
												<TableRow key={date}>
													<TableCell>{date}</TableCell>
													<TableCell>{override.start}</TableCell>
													<TableCell>{override.end}</TableCell>
													<TableCell>{override.isWorkDay ? "Yes" : "No"}</TableCell>
													<TableCell>
														<DropdownMenu>
															<DropdownMenuTrigger asChild>
																<Button variant="ghost" size="icon">
																	<MoreHorizontal className="h-4 w-4" />
																</Button>
															</DropdownMenuTrigger>
															<DropdownMenuContent>
																<DropdownMenuItem
																	className="text-red-600"
																	onSelect={() => handleRemoveDateOverride(date)}
																>
																	<Trash2 className="mr-2 h-4 w-4" /> Remove Override
																</DropdownMenuItem>
															</DropdownMenuContent>
														</DropdownMenu>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								)}
							</div>
						)}

						<div className="flex justify-end space-x-2 mt-4">
							<Button onClick={() => setIsEditing(true)}>
								<Edit className="mr-2 h-4 w-4" /> Edit Schedule
							</Button>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
};

export default ShiftScheduleDialog;
