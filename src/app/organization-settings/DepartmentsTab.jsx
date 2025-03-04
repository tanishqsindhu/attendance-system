"use client";

import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
	selectAllDepartments,
	deleteOrganizationItem,
} from "@/store/orgaznization-settings/organization-settings.slice.js";
import { DataTable } from "@/components/data-table.component";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit, Trash2 } from "lucide-react";
import AddItemDialog from "@/components/AddItemDialog.component";
import AddItemForm from "@/components/AddItemForm.component";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const DepartmentsTab = () => {
	const dispatch = useDispatch();
	const departments = useSelector(selectAllDepartments);
	const [editingDepartment, setEditingDepartment] = useState(null);

	const handleDelete = async (departmentId) => {
		try {
			await dispatch(
				deleteOrganizationItem({
					itemType: "departments",
					itemId: departmentId,
				})
			).unwrap();
			toast("Department Deleted", {
				description: `Department with ID ${departmentId} has been deleted.`,
			});
		} catch (error) {
			toast("Error", {
				description: error.message,
				variant: "destructive",
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
			id: "actions",
			header: "Actions",
			cell: ({ row }) => {
				const department = row.original;

				return (
					<div className="flex items-center space-x-2">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="outline"
										size="icon"
										className="h-8 w-8"
										onClick={() => setEditingDepartment(department)}
									>
										<Edit className="h-4 w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Edit Department</TooltipContent>
							</Tooltip>

							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="destructive"
										size="icon"
										className="h-8 w-8"
										onClick={() => handleDelete(department.id)}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Delete Department</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
				);
			},
		},
	];

	return (
		<div>
			<DataTable
				tableActions={
					<AddItemDialog triggerText="Add Department" itemType="departments">
						<AddItemForm itemType="departments" />
					</AddItemDialog>
				}
				data={departments}
				columns={columns}
				filterableColumns={["name"]}
				filterPlaceholder="Filter departments..."
				pagination
				initialPageSize={10}
				pageSizeOptions={[5, 10, 20, 50, 100]}
			/>

			{/* Edit Dialog */}
			{editingDepartment && (
				<Dialog open={!!editingDepartment} onOpenChange={() => setEditingDepartment(null)}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Edit Department</DialogTitle>
						</DialogHeader>
						<AddItemForm
							itemType="departments"
							initialData={editingDepartment}
							mode="edit"
							onSuccess={() => setEditingDepartment(null)}
						/>
					</DialogContent>
				</Dialog>
			)}
		</div>
	);
};

export default DepartmentsTab;
