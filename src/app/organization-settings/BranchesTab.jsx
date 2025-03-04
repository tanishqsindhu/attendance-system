// src/components/organization/BranchesTab.jsx
"use client";

import { useSelector } from "react-redux";
import { selectAllBranches } from "@/store/orgaznization-settings/organization-settings.slice";
import { DataTable } from "@/components/data-table.component";
import AddItemDialog from "@/components/AddItemDialog.component";
import AddItemForm from "@/components/AddItemForm.component";

const BranchesTab = () => {
	const branches = useSelector(selectAllBranches);

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
					<AddItemDialog triggerText="Add Branch">
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
		</div>
	);
};

export default BranchesTab;
