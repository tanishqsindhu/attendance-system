import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { deleteShiftSchedule } from "@/store/orgaznization-settings/organization-settings.slice.js";
import { DataTable } from "@/components/data-table.component";
import AddItemDialog from "@/components/AddItemDialog.component";
import ShiftScheduleDialog from "@/components/organization-settings/shift-schedule/ShiftScheduleDialog";
import ShiftScheduleForm from "@/components/organization-settings/shift-schedule/AddShiftScheduleForm.component";
import { Button } from "@/components/ui/button";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, SquarePen } from "lucide-react";
import { ShiftScheduleUtils } from "@/firebase/shift-schedule.service.js";
import { toast } from "sonner";

const ShiftSchedulesTab = () => {
	const dispatch = useDispatch();
	const [deletionTarget, setDeletionTarget] = useState(null);
	const [isDeletionDialogOpen, setIsDeletionDialogOpen] = useState(false);
	const shiftSchedules = useSelector((state) => state.organization.shiftSchedules);

	const handleDeleteInitiation = async (scheduleId) => {
		const validationResult = await ShiftScheduleUtils.validateShiftScheduleDeletion(scheduleId);

		if (!validationResult.canDelete) {
			toast("Cannot Delete Shift Schedule", {
				description: validationResult.reason,
				variant: "destructive",
			});
			return;
		}

		setDeletionTarget(scheduleId);
		setIsDeletionDialogOpen(true);
	};

	const confirmDeletion = () => {
		if (deletionTarget) {
			dispatch(deleteShiftSchedule(deletionTarget))
				.then(() => {
					toast("Shift Schedule Deleted", {
						description: "The shift schedule has been successfully removed.",
					});
					setIsDeletionDialogOpen(false);
				})
				.catch((error) => {
					toast("Deletion Failed", {
						description: error.message,
						variant: "destructive",
					});
				});
		}
	};

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
		},
		{
			accessorKey: "endTime",
			header: "End Time",
		},
		{
			accessorKey: "days",
			header: "Working Days",
			cell: ({ row }) => row.original.days.join(", "),
		},
		{
			id: "actions",
			header: "Actions",
			cell: ({ row }) => (
				<div className="flex space-x-2">
					<ShiftScheduleDialog scheduleId={row.original.id} triggerText="View" />
					<ShiftScheduleDialog
						scheduleId={row.original.id}
						triggerText={<SquarePen />}
						editState={true}
						variantType="warning"
					/>
					<Button
						variant="destructive"
						size="icon"
						onClick={() => handleDeleteInitiation(row.original.id)}
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			),
		},
	];

	return (
		<>
			<div>
				<DataTable
					tableActions={
						<AddItemDialog triggerText="Add Shift Schedule" itemType="shiftSchedules">
							<ShiftScheduleForm itemType="shiftSchedules" />
						</AddItemDialog>
					}
					data={shiftSchedules}
					columns={columns}
					filterableColumns={["name"]}
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
						<AlertDialogDescription>
							This action cannot be undone. This will permanently delete the shift schedule.
						</AlertDialogDescription>
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
