// src/components/organization/DepartmentsTab.jsx
"use client";

import { useSelector } from "react-redux";
import { selectAllDepartments } from "@/store/orgaznization-settings/organization-settings.slice";
import { DataTable } from "@/components/data-table.component";
import AddItemDialog from "@/components/AddItemDialog.component";
import AddItemForm from "@/components/AddItemForm.component";

const DepartmentsTab = () => {
	const departments = useSelector(selectAllDepartments);

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
					<AddItemDialog triggerText="Add Department">
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
		</div>
	);
};

export default DepartmentsTab;
