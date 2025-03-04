"use client";

import * as React from "react";
import { ArrowUpDown, Download, MoreHorizontal, Plus, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/data-table.component";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
	selectAllDepartments,
	selectAllPositions,
	selectAllBranches,
	selectAllShiftSchedules,
	selectActiveBranch,
} from "@/store/orgaznization-settings/organization-settings.slice.js";
import { selectEmployeesByBranch } from "@/store/employees/employees.slice.js";
import { EditEmployeeModal } from "@/components/EditEmployeeModal";

// Custom Empty State Component
const CustomEmptyState = (
	<div className="flex flex-col items-center justify-center h-60 p-8">
		<div className="rounded-full bg-muted p-3 mb-3">
			<Trash className="h-6 w-6 text-muted-foreground" />
		</div>
		<h3 className="text-lg font-semibold">No employees found</h3>
		<p className="text-sm text-muted-foreground text-center mt-2 mb-4">
			No employees match your search criteria. Try adjusting your filters or add a new employee.
		</p>
		<Button size="sm">
			<Plus className="mr-2 h-4 w-4" />
			Add Employee
		</Button>
	</div>
);

export default function EmployeesList() {
	const params = useParams();
	const navigate = useNavigate();

	// Get data from Redux
	const activeBranch = useSelector(selectActiveBranch);
	const branchIdFromRoute = params.branchId;
	const currentBranchId = branchIdFromRoute || activeBranch?.id || "";

	// Get employees for the current branch
	const employees = useSelector((state) => selectEmployeesByBranch(state, currentBranchId));

	// Get lookup data from Redux
	const departments = useSelector(selectAllDepartments);
	const positions = useSelector(selectAllPositions);
	const branches = useSelector(selectAllBranches);
	const shiftSchedules = useSelector(selectAllShiftSchedules);

	// State for managing the edit modal
	const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
	const [selectedEmployeeId, setSelectedEmployeeId] = React.useState(null);

	// Open the edit modal
	const handleEditClick = (employeeId) => {
		setSelectedEmployeeId(employeeId);
		setIsEditModalOpen(true);
	};

	// Close the edit modal
	const handleCloseEditModal = () => {
		setIsEditModalOpen(false);
		setSelectedEmployeeId(null);
	};

	// Create lookup maps for faster access
	const departmentMap = React.useMemo(() => {
		const map = {};
		if (departments) {
			departments.forEach((dept) => {
				map[dept.id] = dept.name;
			});
		}
		return map;
	}, [departments]);

	const positionMap = React.useMemo(() => {
		const map = {};
		if (positions) {
			positions.forEach((pos) => {
				map[pos.id] = pos.name;
			});
		}
		return map;
	}, [positions]);

	const shiftMap = React.useMemo(() => {
		const map = {};
		if (shiftSchedules) {
			shiftSchedules.forEach((shift) => {
				map[shift.id] = `${shift.startTime || "00:00"} - ${shift.endTime || "00:00"}`;
			});
		}
		return map;
	}, [shiftSchedules]);

	const branchMap = React.useMemo(() => {
		const map = {};
		if (branches) {
			branches.forEach((branch) => {
				map[branch.id] = branch.name;
			});
		}
		return map;
	}, [branches]);

	// Status badge renderer
	const StatusBadge = ({ status }) => {
		return (
			<Badge variant={status != "active" ? "destructive" : "outline"} className="capitalize w-23">
				{status}
			</Badge>
		);
	};

	// Column definitions for employee data
	const columns = [
		{
			id: "select",
			header: ({ table }) => (
				<Checkbox
					checked={
						table.getIsAllPageRowsSelected() ||
						(table.getIsSomePageRowsSelected() && "indeterminate")
					}
					onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
					aria-label="Select all"
				/>
			),
			cell: ({ row }) => (
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={(value) => row.toggleSelected(!!value)}
					aria-label="Select row"
					onClick={(e) => e.stopPropagation()} // Prevent row click when clicking checkbox
				/>
			),
			enableSorting: false,
			enableHiding: false,
		},
		{
			accessorKey: "name",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Name
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				);
			},
			cell: ({ row }) => {
				const personal = row.original.personal;
				const firstName = personal?.firstName || "";
				const lastName = personal?.lastName || "";
				const fullName = [firstName, lastName].filter(Boolean).join(" ") || "-";
				return <div className="font-medium">{fullName}</div>;
			},
		},
		{
			accessorKey: "personal.email",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Email
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				);
			},
			cell: ({ row }) => {
				const personal = row.original.personal;
				return <div className="lowercase">{personal?.email || "-"}</div>;
			},
		},
		{
			accessorKey: "personal.phone",
			header: "Phone",
			cell: ({ row }) => {
				const personal = row.original.personal;
				return <div>{personal?.phone || "-"}</div>;
			},
		},
		{
			accessorKey: "employment.department",
			header: "Department",
			cell: ({ row }) => {
				const employment = row.original.employment;
				const departmentId = employment?.department;
				const departmentName = departmentId ? departmentMap[departmentId] : null;
				return <div>{departmentName || departmentId || "-"}</div>;
			},
		},
		{
			accessorKey: "employment.position",
			header: "Position",
			cell: ({ row }) => {
				const employment = row.original.employment;
				const positionId = employment?.position;
				const positionName = positionId ? positionMap[positionId] : null;
				return <div>{positionName || positionId || "-"}</div>;
			},
		},
		{
			accessorKey: "employment.shiftId",
			header: "Shift",
			cell: ({ row }) => {
				const employment = row.original.employment;
				const shiftId = employment?.shiftId;
				const shiftTime = shiftId ? shiftMap[shiftId] : null;
				return <div>{shiftTime || shiftId || "-"}</div>;
			},
		},
		{
			accessorKey: "employment.employmentStatus",
			header: "Status",
			cell: ({ row }) => {
				const employment = row.original.employment;
				return employment?.employmentStatus ? (
					<StatusBadge status={employment.employmentStatus} />
				) : (
					<div>-</div>
				);
			},
		},
		{
			accessorKey: "employment.joiningDate",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Join Date
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				);
			},
			cell: ({ row }) => {
				const employment = row.original.employment;
				if (!employment?.joiningDate) return <div>-</div>;

				// Format date
				try {
					const date = new Date(employment.joiningDate);
					const formatted = new Intl.DateTimeFormat("en-US", {
						year: "numeric",
						month: "short",
						day: "numeric",
					}).format(date);
					return <div>{formatted}</div>;
				} catch (error) {
					return <div>{employment.joiningDate || "-"}</div>;
				}
			},
		},
		{
			accessorKey: "employment.salaryAmount",
			header: () => <div className="text-right">Salary</div>,
			cell: ({ row }) => {
				const employment = row.original.employment;
				if (!employment?.salaryAmount && employment?.salaryAmount !== 0) {
					return <div className="text-right">-</div>;
				}

				const amount = parseFloat(employment.salaryAmount);
				const formatted = new Intl.NumberFormat("en-IN", {
					style: "currency",
					currency: "INR",
				}).format(amount);

				return <div className="text-right font-medium">{formatted}</div>;
			},
		},
		{
			id: "actions",
			enableHiding: false,
			cell: ({ row }) => {
				const employee = row.original;

				return (
					<DropdownMenu>
						<DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
							<Button variant="ghost" className="h-8 w-8 p-0">
								<span className="sr-only">Open menu</span>
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel>Actions</DropdownMenuLabel>
							<DropdownMenuItem
								onClick={(e) => {
									e.stopPropagation();
									navigator.clipboard.writeText(employee.id);
									toast("Employee ID copied", {
										description: `ID ${employee.id} copied to clipboard`,
									});
								}}
							>
								Copy employee ID
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={(e) => {
									e.stopPropagation();
									navigate(`/employees/${employee.id}`);
								}}
							>
								View profile
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={(e) => {
									e.stopPropagation();
									handleEditClick(employee.id); // Open the edit modal
								}}
							>
								Edit details
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				);
			},
		},
	];

	// Table actions
	const tableActions = (
		<>
			<Button variant="outline" size="sm">
				<Download className="mr-2 h-4 w-4" />
				Export
			</Button>
			<Button size="sm" onClick={() => navigate("/employees/add")}>
				<Plus className="mr-2 h-4 w-4" />
				Add Employee
			</Button>
		</>
	);

	// Row click handler
	const handleRowClick = (rowData) => {
		navigate(`/employees/${rowData.id}`);
		toast("Employee selected", {
			description: `Viewing profile for ${rowData.personal?.firstName || ""} ${
				rowData.personal?.lastName || ""
			}`,
		});
	};

	// Custom row class handler
	const getRowClassName = (rowData) => {
		return rowData.employment?.employmentStatus != "active"
			? "bg-red-50/50 dark:bg-red-900/20"
			: "";
	};

	// Determine which branch to display in the title
	const currentBranchName = branchMap[currentBranchId] || "";

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle className="text-2xl">
						All Employees {currentBranchName ? `- ${currentBranchName}` : ""}
					</CardTitle>
				</CardHeader>
				<CardContent>
					{/* Edit Employee Modal */}
					<EditEmployeeModal
						isOpen={isEditModalOpen}
						onClose={handleCloseEditModal}
						employeeData={employees[selectedEmployeeId]}
					/>
					<div className="space-y-4">
						<DataTable
							data={employees || []}
							columns={columns}
							filterableColumns={[
								"name",
								"personal_email",
								"personal_phone",
								"employment_department",
							]}
							filterPlaceholder="Search employees..."
							pagination={true}
							initialPageSize={5}
							pageSizeOptions={[5, 10, 25, 50]}
							tableActions={tableActions}
							onRowClick={handleRowClick}
							getRowClassName={getRowClassName}
							emptyState={CustomEmptyState}
						/>
					</div>
				</CardContent>
			</Card>
		</>
	);
}
