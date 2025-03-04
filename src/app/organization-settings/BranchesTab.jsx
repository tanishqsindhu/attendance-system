"use client";

import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
	selectAllBranches,
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

const BranchesTab = () => {
	const dispatch = useDispatch();
	const branches = useSelector(selectAllBranches);
	const [editingBranch, setEditingBranch] = useState(null);

	const handleDelete = async (branchId) => {
		try {
			await dispatch(
				deleteOrganizationItem({
					itemType: "branches",
					itemId: branchId,
				})
			).unwrap();
			toast.success("Branch Deleted", {
				description: `Branch with ID ${branchId} has been deleted.`,
			});
		} catch (error) {
			console.log(error);
			toast.error(`Error: ${error.message ? error.message : error}`);
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
				const branch = row.original;

				return (
					<div className="flex items-center space-x-2">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="outline"
										size="icon"
										className="h-8 w-8"
										onClick={() => setEditingBranch(branch)}
									>
										<Edit className="h-4 w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Edit Branch</TooltipContent>
							</Tooltip>

							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="destructive"
										size="icon"
										className="h-8 w-8"
										onClick={() => handleDelete(branch.id)}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Delete Branch</TooltipContent>
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
					<AddItemDialog triggerText="Add Branch" itemType="branches">
						<AddItemForm itemType="branches" />
					</AddItemDialog>
				}
				data={branches}
				columns={columns}
				filterableColumns={["name"]}
				filterPlaceholder="Filter branches..."
				pagination
				initialPageSize={10}
				pageSizeOptions={[5, 10, 20, 50, 100]}
			/>

			{/* Edit Dialog */}
			{editingBranch && (
				<Dialog open={!!editingBranch} onOpenChange={() => setEditingBranch(null)}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Edit Branch</DialogTitle>
						</DialogHeader>
						<AddItemForm
							itemType="branches"
							initialData={editingBranch}
							mode="edit"
							onSuccess={() => setEditingBranch(null)}
						/>
					</DialogContent>
				</Dialog>
			)}
		</div>
	);
};

export default BranchesTab;
