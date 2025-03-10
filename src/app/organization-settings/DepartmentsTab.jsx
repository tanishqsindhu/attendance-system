"use client";

import React, { useState, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { selectAllDepartments, deleteOrganizationItem } from "@/store/organization-settings/organization-settings.slice.js";
import { DataTable } from "@/components/data-table.component";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit, Trash2, Plus } from "lucide-react";
import AddItemDialog from "@/components/AddItemDialog.component";
import AddItemForm from "@/components/AddItemForm.component";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const DepartmentsTab = () => {
	const dispatch = useDispatch();
	const departments = useSelector(selectAllDepartments);
	const [editingDepartment, setEditingDepartment] = useState(null);
	const [deletingDepartmentId, setDeletingDepartmentId] = useState(null);

	const handleDeleteInitiation = useCallback((departmentId) => {
		setDeletingDepartmentId(departmentId);
	}, []);

	const handleDeleteConfirmation = useCallback(async () => {
		if (!deletingDepartmentId) return;

		try {
			await dispatch(
				deleteOrganizationItem({
					itemType: "departments",
					itemId: deletingDepartmentId,
				})
			).unwrap();

			toast.success("Department Deleted", {
				description: "The department has been successfully removed.",
			});
		} catch (error) {
			toast.error("Deletion Failed", {
				description: error || "An unexpected error occurred",
				variant: "destructive",
			});
		} finally {
			setDeletingDepartmentId(null);
		}
	}, [deletingDepartmentId, dispatch]);

	const handleEditSuccess = useCallback(() => {
		toast.success("Department Updated", {
			description: "The department has been successfully updated.",
		});
		setEditingDepartment(null);
	}, []);

	const closeEditDialog = useCallback(() => {
		setEditingDepartment(null);
	}, []);

	const ActionButtons = useCallback(
		({ department }) => (
			<div className="flex items-center space-x-2">
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setEditingDepartment(department)}>
								<Edit className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Edit department details</p>
						</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteInitiation(department.id)}>
								<Trash2 className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Delete department</p>
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
			cell: ({ row }) => <ActionButtons department={row.original} />,
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
												Add Department
											</>
										}
										itemType="departments"
									>
										<AddItemForm
											itemType="departments"
											onSuccess={() => {
												toast.success("Department Added", {
													description: "New department has been successfully created.",
												});
											}}
										/>
									</AddItemDialog>
								</div>
							</TooltipTrigger>
							<TooltipContent>
								<p>Create a new department</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				}
				data={departments || []}
				columns={columns}
				filterableColumns={["name"]}
				filterPlaceholder="Filter departments..."
				pagination
				initialPageSize={10}
				pageSizeOptions={[5, 10, 20, 50, 100]}
			/>

			{/* Edit Dialog */}
			<Dialog open={!!editingDepartment} onOpenChange={(open) => !open && closeEditDialog()}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Department</DialogTitle>
					</DialogHeader>
					{editingDepartment && <AddItemForm itemType="departments" initialData={editingDepartment} mode="edit" onSuccess={handleEditSuccess} />}
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={!!deletingDepartmentId} onOpenChange={(open) => !open && setDeletingDepartmentId(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
						<AlertDialogDescription>This action cannot be undone. This will permanently delete the department from your organization.</AlertDialogDescription>
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

export default DepartmentsTab;
