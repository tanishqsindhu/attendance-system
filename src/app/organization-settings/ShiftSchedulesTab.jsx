import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { deleteShiftSchedule } from "@/store/organization-settings/organization-settings.slice.js";
import { DataTable } from "@/components/data-table.component";
import AddItemDialog from "@/components/AddItemDialog.component";
import ShiftScheduleDialog from "@/components/organization-settings/shift-schedule/ShiftScheduleDialog";
import ShiftScheduleForm from "@/components/organization-settings/shift-schedule/AddShiftScheduleForm.component";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trash2, SquarePen, Plus } from "lucide-react";
import { ShiftScheduleUtils } from "@/firebase/shift-schedule.service.js";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const ShiftSchedulesTab = () => {
	const dispatch = useDispatch();
	const [deletionTarget, setDeletionTarget] = useState(null);
	const [isDeletionDialogOpen, setIsDeletionDialogOpen] = useState(false);
	const shiftSchedules = useSelector((state) => state.organization.shiftSchedules);

	// Convert 24-hour time to AM/PM format
	const formatTime = (time) => {
		if (!time) return "";

		const [hours, minutes] = time.split(":");
		const hour = parseInt(hours, 10);
		const period = hour >= 12 ? "PM" : "AM";
		const formattedHour = hour % 12 || 12;

		return `${formattedHour}:${minutes} ${period}`;
	};

	const handleDeleteInitiation = async (scheduleId) => {
		try {
			const validationResult = await ShiftScheduleUtils.validateShiftScheduleDeletion(scheduleId);

			if (!validationResult.canDelete) {
				toast.error("Cannot Delete Shift Schedule", {
					description: validationResult.reason,
					variant: "destructive",
				});
				return;
			}

			setDeletionTarget(scheduleId);
			setIsDeletionDialogOpen(true);
		} catch (error) {
			toast.error("Validation Error", {
				description: "An error occurred while validating the deletion.",
				variant: "destructive",
			});
		}
	};

	const confirmDeletion = async () => {
		if (!deletionTarget) return;

		try {
			await dispatch(deleteShiftSchedule(deletionTarget)).unwrap();
			toast.success("Shift Schedule Deleted", {
				description: "The shift schedule has been successfully removed.",
			});
		} catch (error) {
			console.log(error);
			toast.error("Deletion Failed", {
				description: error || "An unexpected error occurred",
				variant: "destructive",
			});
		} finally {
			setIsDeletionDialogOpen(false);
			setDeletionTarget(null);
		}
	};

	// Memoized days of the week order
	const dayOrder = {
		Monday: 1,
		Tuesday: 2,
		Wednesday: 3,
		Thursday: 4,
		Friday: 5,
		Saturday: 6,
		Sunday: 7,
	};

	// Function to sort days of the week
	const sortDays = (days) => {
		return [...days].sort((a, b) => dayOrder[a] - dayOrder[b]);
	};

	const ActionButtons = ({ row }) => (
		<div className="flex space-x-2">
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<div>
							<ShiftScheduleDialog scheduleId={row.original.id} triggerText="View" />
						</div>
					</TooltipTrigger>
					<TooltipContent>
						<p>View shift schedule details</p>
					</TooltipContent>
				</Tooltip>

				<Tooltip>
					<TooltipTrigger asChild>
						<div>
							<ShiftScheduleDialog scheduleId={row.original.id} triggerText={<SquarePen className="h-4 w-4" />} editState={true} variantType="warning" />
						</div>
					</TooltipTrigger>
					<TooltipContent>
						<p>Edit shift schedule</p>
					</TooltipContent>
				</Tooltip>

				<Tooltip>
					<TooltipTrigger asChild>
						<Button variant="destructive" size="icon" onClick={() => handleDeleteInitiation(row.original.id)} className="h-8 w-8">
							<Trash2 className="h-4 w-4" />
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>Delete shift schedule</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		</div>
	);

	const columns = [
		{
			accessorKey: "id",
			header: "ID",
		},
		{
			accessorKey: "name",
			header: "Name",
		},
		{
			accessorKey: "startTime",
			header: "Start Time",
			cell: ({ row }) => formatTime(row.original.startTime),
		},
		{
			accessorKey: "endTime",
			header: "End Time",
			cell: ({ row }) => formatTime(row.original.endTime),
		},
		{
			accessorKey: "days",
			header: "Working Days",
			cell: ({ row }) => sortDays(row.original.days).join(", "),
		},
		{
			accessorKey: "overrideDays",
			header: "Override Days",
			cell: ({ row }) => (Object.keys(row.original.dayOverrides).length != 0 ? "Yes" : "No"),
		},
		{
			accessorKey: "overrideDates",
			header: "Override Dates",
			cell: ({ row }) => (Object.keys(row.original.dateOverrides).length != 0 ? "Yes" : "No"),
		},
		{
			id: "actions",
			header: "Actions",
			cell: ({ row }) => <ActionButtons row={row} />,
		},
	];

	return (
		<>
			<div>
				<DataTable
					tableActions={
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<div>
										<AddItemDialog
											triggerText={
												<>
													<Plus className="mr-2" />
													Add Shift Schedule
												</>
											}
											itemType="shiftSchedules"
										>
											<ShiftScheduleForm itemType="shiftSchedules" />
										</AddItemDialog>
									</div>
								</TooltipTrigger>
								<TooltipContent>
									<p>Create a new shift schedule</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					}
					data={shiftSchedules || []}
					columns={columns}
					filterableColumns={["id", "name"]}
					filterPlaceholder="Filter shift schedules..."
					pagination
					initialPageSize={10}
					pageSizeOptions={[5, 10, 20, 50, 100]}
				/>
			</div>

			<AlertDialog open={isDeletionDialogOpen} onOpenChange={setIsDeletionDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
						<AlertDialogDescription>This action cannot be undone. This will permanently delete the shift schedule.</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={confirmDeletion}>Continue</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
};

export default ShiftSchedulesTab;
