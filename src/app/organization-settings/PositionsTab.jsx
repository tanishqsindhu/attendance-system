// src/components/organization/PositionsTab.jsx
"use client";

import {  useSelector } from "react-redux";
import { selectAllPositions } from "@/store/orgaznization-settings/organization-settings.slice";
import { DataTable } from "@/components/data-table.component";
import AddItemDialog from "@/components/AddItemDialog.component";
import AddItemForm from "@/components/AddItemForm.component";

const PositionsTab = () => {
	const positions = useSelector(selectAllPositions);

	// Define columns for the DataTable
	const columns = [
		{
			accessorKey: "id",
			header: "ID",
		},
		{
			accessorKey: "name",
			header: "Name",
		},
	];

	return (
		<div>
			<DataTable
				tableActions={
					<AddItemDialog triggerText="Add Position">
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
		</div>
	);
};

export default PositionsTab;
