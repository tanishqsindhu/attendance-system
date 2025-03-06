"use client";
import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { selectAllPositions, deleteOrganizationItem } from "@/store/organization-settings/organization-settings.slice.js";
import { DataTable } from "@/components/data-table.component";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Edit, Trash2 } from "lucide-react";
import AddItemDialog from "@/components/AddItemDialog.component";
import AddItemForm from "@/components/AddItemForm.component";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const PositionsTab = () => {
	const dispatch = useDispatch();
	const positions = useSelector(selectAllPositions);
	const [editingPosition, setEditingPosition] = useState(null);

	const handleDelete = async (positionId) => {
		try {
			await dispatch(
				deleteOrganizationItem({
					itemType: "positions",
					itemId: positionId,
				})
			).unwrap();
			toast("Position Deleted", {
				description: `Position with ID ${positionId} has been deleted.`,
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
				const position = row.original;

				return (
					<div className="flex items-center space-x-2">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setEditingPosition(position)}>
										<Edit className="h-4 w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Edit Position</TooltipContent>
							</Tooltip>

							<Tooltip>
								<TooltipTrigger asChild>
									<Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDelete(position.id)}>
										<Trash2 className="h-4 w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Delete Position</TooltipContent>
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
					<AddItemDialog triggerText="Add Position" itemType="positions">
						<AddItemForm itemType="positions" />
					</AddItemDialog>
				}
				data={positions}
				columns={columns}
				filterableColumns={["name"]}
				filterPlaceholder="Filter positions..."
				pagination
				initialPageSize={10}
				pageSizeOptions={[5, 10, 20, 50, 100]}
			/>

			{/* Edit Dialog */}
			{editingPosition && (
				<Dialog open={!!editingPosition} onOpenChange={() => setEditingPosition(null)}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Edit Position</DialogTitle>
						</DialogHeader>
						<AddItemForm itemType="positions" initialData={editingPosition} mode="edit" onSuccess={() => setEditingPosition(null)} />
					</DialogContent>
				</Dialog>
			)}
		</div>
	);
};

export default PositionsTab;
