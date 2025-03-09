"use client";

import React, { useState, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { selectAllBranches, deleteOrganizationItem } from "@/store/organization-settings/organization-settings.slice.js";
import { DataTable } from "@/components/data-table.component";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit, Trash2, Plus } from "lucide-react";
import AddItemDialog from "@/components/AddItemDialog.component";
import AddItemForm from "@/components/AddItemForm.component";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const BranchesTab = () => {
	const dispatch = useDispatch();
	const branches = useSelector(selectAllBranches);
	const [editingBranch, setEditingBranch] = useState(null);
	const [deletingBranchId, setDeletingBranchId] = useState(null);

	const handleDeleteInitiation = useCallback((branchId) => {
		setDeletingBranchId(branchId);
	}, []);

	const handleDeleteConfirmation = useCallback(async () => {
		if (!deletingBranchId) return;

		try {
			await dispatch(
				deleteOrganizationItem({
					itemType: "branches",
					itemId: deletingBranchId,
				})
			).unwrap();

			toast.success("Branch Deleted", {
				description: "The branch has been successfully removed.",
			});
		} catch (error) {
			toast.error("Deletion Failed", {
				description: error.message || "An unexpected error occurred",
				variant: "destructive",
			});
		} finally {
			setDeletingBranchId(null);
		}
	}, [deletingBranchId, dispatch]);

	const handleEditSuccess = useCallback(() => {
		toast.success("Branch Updated", {
			description: "The branch has been successfully updated.",
		});
		setEditingBranch(null);
	}, []);

	const handleAddSuccess = useCallback(() => {
		toast.success("Branch Added", {
			description: "New branch has been successfully created.",
		});
	}, []);

	const closeEditDialog = useCallback((open) => {
		if (!open) setEditingBranch(null);
	}, []);

	const ActionButtons = useCallback(
		({ branch }) => (
			<div className="flex items-center space-x-2">
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setEditingBranch(branch)}>
								<Edit className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Edit branch details</p>
						</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteInitiation(branch.id)}>
								<Trash2 className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Delete branch</p>
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
			cell: ({ row }) => <ActionButtons branch={row.original} />,
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
												Add Branch
											</>
										}
										itemType="branches"
									>
										<AddItemForm itemType="branches" onSuccess={handleAddSuccess} />
									</AddItemDialog>
								</div>
							</TooltipTrigger>
							<TooltipContent>
								<p>Create a new branch</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				}
				data={branches || []}
				columns={columns}
				filterableColumns={["name"]}
				filterPlaceholder="Filter branches..."
				pagination
				initialPageSize={10}
				pageSizeOptions={[5, 10, 20, 50, 100]}
			/>

			{/* Edit Dialog */}
			<Dialog open={!!editingBranch} onOpenChange={closeEditDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Branch</DialogTitle>
					</DialogHeader>
					{editingBranch && <AddItemForm itemType="branches" initialData={editingBranch} mode="edit" onSuccess={handleEditSuccess} />}
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={!!deletingBranchId} onOpenChange={(open) => !open && setDeletingBranchId(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
						<AlertDialogDescription>This action cannot be undone. This will permanently delete the branch from your organization.</AlertDialogDescription>
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

export default BranchesTab;
