"use client";
import React, { useState, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { selectAllPositions, deleteOrganizationItem } from "@/store/organization-settings/organization-settings.slice.js";
import { DataTable } from "@/components/data-table.component";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit, Trash2, Plus } from "lucide-react";
import AddItemDialog from "@/components/AddItemDialog.component";
import AddItemForm from "@/components/AddItemForm.component";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const PositionsTab = () => {
	const dispatch = useDispatch();
	const positions = useSelector(selectAllPositions);
	const [editingPosition, setEditingPosition] = useState(null);
	const [deletingPositionId, setDeletingPositionId] = useState(null);

	const handleDeleteInitiation = useCallback((positionId) => {
		setDeletingPositionId(positionId);
	}, []);

	const handleDeleteConfirmation = useCallback(async () => {
		if (!deletingPositionId) return;

		try {
			await dispatch(
				deleteOrganizationItem({
					itemType: "positions",
					itemId: deletingPositionId,
				})
			).unwrap();

			toast.success("Position Deleted", {
				description: "The position has been successfully removed.",
			});
		} catch (error) {
			toast.error("Deletion Failed", {
				description: error.message || "An unexpected error occurred",
				variant: "destructive",
			});
		} finally {
			setDeletingPositionId(null);
		}
	}, [deletingPositionId, dispatch]);

	const handleEditSuccess = useCallback(() => {
		toast.success("Position Updated", {
			description: "The position has been successfully updated.",
		});
		setEditingPosition(null);
	}, []);

	const ActionButtons = useCallback(
		({ position }) => (
			<div className="flex items-center space-x-2">
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setEditingPosition(position)}>
								<Edit className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Edit position details</p>
						</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteInitiation(position.id)}>
								<Trash2 className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Delete position</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
		),
		[handleDeleteInitiation]
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
			id: "actions",
			header: "Actions",
			cell: ({ row }) => <ActionButtons position={row.original} />,
		},
	];

	return (
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
												<Plus className="h-4 w-4 mr-2" />
												Add Position
											</>
										}
										itemType="positions"
									>
										<AddItemForm itemType="positions" />
									</AddItemDialog>
								</div>
							</TooltipTrigger>
							<TooltipContent>
								<p>Create a new position</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				}
				data={positions || []}
				columns={columns}
				filterableColumns={["name"]}
				filterPlaceholder="Filter positions..."
				pagination
				initialPageSize={10}
				pageSizeOptions={[5, 10, 20, 50, 100]}
			/>

			{/* Edit Dialog */}
			{editingPosition && (
				<Dialog open={!!editingPosition} onOpenChange={(open) => !open && setEditingPosition(null)}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Edit Position</DialogTitle>
						</DialogHeader>
						<AddItemForm itemType="positions" initialData={editingPosition} mode="edit" onSuccess={handleEditSuccess} />
					</DialogContent>
				</Dialog>
			)}

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={!!deletingPositionId} onOpenChange={(open) => !open && setDeletingPositionId(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
						<AlertDialogDescription>This action cannot be undone. This will permanently delete the position from your organization.</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleDeleteConfirmation}>Delete</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};

export default PositionsTab;
