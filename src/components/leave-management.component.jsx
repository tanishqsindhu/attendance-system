// components/LeaveManagement.jsx
"use client";

import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { format, parseISO } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertCircle, Check, X, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DataTable } from "@/components/data-table.component";
import { fetchEmployeeLeaves, updateLeaveSanctionStatus, selectAllLeaves, selectLeavesLoading, selectLeavesError } from "@/store/leave/leave.slice";

export function LeaveManagement({ branchId }) {
	const dispatch = useDispatch();
	const leaves = useSelector(selectAllLeaves);
	const loading = useSelector(selectLeavesLoading);
	const error = useSelector(selectLeavesError);

	// For filtering
	const [statusFilter, setStatusFilter] = useState("all"); // all, sanctioned, unsanctioned

	useEffect(() => {
		if (branchId) {
			dispatch(fetchEmployeeLeaves(branchId));
		}
	}, [dispatch, branchId]);

	// Filter leaves based on status
	const filteredLeaves = leaves.filter((leave) => {
		if (statusFilter === "all") return true;
		if (statusFilter === "sanctioned") return leave.sanctioned;
		if (statusFilter === "unsanctioned") return !leave.sanctioned;
		return true;
	});

	// Handle sanctioned status toggle
	const handleSanctionToggle = (employeeId, date, currentStatus) => {
		dispatch(
			updateLeaveSanctionStatus({
				employeeId,
				date,
				sanctioned: !currentStatus,
				branchId,
			})
		);
	};

	// Refresh leaves data
	const handleRefresh = () => {
		dispatch(fetchEmployeeLeaves(branchId));
	};

	// Define columns for DataTable
	const columns = [
		{
			id: "employeeName",
			header: "Employee",
			accessorKey: "employeeName",
			cell: ({ row }) => <div className="font-medium">{row.original.employeeName}</div>,
		},
		{
			id: "date",
			header: "Date",
			accessorKey: "date",
			cell: ({ row }) => {
				const dateStr = row.original.date;
				try {
					return format(parseISO(dateStr), "PPP"); // e.g., "Apr 29, 2023"
				} catch {
					return dateStr; // Fallback to original format if parsing fails
				}
			},
		},
		{
			id: "status",
			header: "Status",
			accessorKey: "status",
			cell: ({ row }) => {
				const status = row.original.status;
				let color = "bg-yellow-100 text-yellow-800";

				if (status.includes("Absent")) {
					color = "bg-red-100 text-red-800";
				} else if (status.includes("Half Day")) {
					color = "bg-orange-100 text-orange-800";
				}

				return <div className={`px-2 py-1 rounded-full text-xs font-medium ${color} inline-block`}>{status}</div>;
			},
		},
		{
			id: "deduction",
			header: "Deduction",
			accessorKey: "deductionAmount",
			cell: ({ row }) => <div className="text-right">₹{row.original.deductionAmount.toFixed(2)}</div>,
		},
		{
			id: "sanctioned",
			header: "Sanctioned",
			accessorKey: "sanctioned",
			cell: ({ row }) => {
				const sanctioned = row.original.sanctioned;
				return (
					<div className="flex items-center justify-center space-x-2">
						<Switch checked={sanctioned} onCheckedChange={() => handleSanctionToggle(row.original.employeeId, row.original.date, sanctioned)} disabled={loading} />
						<Label>{sanctioned ? "Yes" : "No"}</Label>
					</div>
				);
			},
		},
		{
			id: "remarks",
			header: "Remarks",
			accessorKey: "remarks",
			cell: ({ row }) => <div className="max-w-md text-sm text-gray-500 truncate">{row.original.remarks}</div>,
		},
	];

	// Define table actions
	const tableActions = (
		<div className="flex items-center space-x-2">
			<div className="flex items-center space-x-1">
				<Button variant="outline" size="sm" onClick={() => setStatusFilter("all")} className={statusFilter === "all" ? "bg-primary text-primary-foreground" : ""}>
					All
				</Button>
				<Button variant="outline" size="sm" onClick={() => setStatusFilter("sanctioned")} className={statusFilter === "sanctioned" ? "bg-primary text-primary-foreground" : ""}>
					<Check className="mr-1 h-4 w-4" /> Sanctioned
				</Button>
				<Button variant="outline" size="sm" onClick={() => setStatusFilter("unsanctioned")} className={statusFilter === "unsanctioned" ? "bg-primary text-primary-foreground" : ""}>
					<X className="mr-1 h-4 w-4" /> Unsanctioned
				</Button>
			</div>
			<Button variant="outline" size="sm" onClick={handleRefresh}>
				<RefreshCw className="h-4 w-4" />
				<span className="sr-only">Refresh</span>
			</Button>
		</div>
	);

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<h2 className="text-3xl font-bold tracking-tight">Leave Management</h2>
				<Badge variant="outline" className="px-3 py-1">
					{filteredLeaves.length} Leaves
				</Badge>
			</div>

			{error && (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>Error</AlertTitle>
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			<DataTable
				data={filteredLeaves}
				columns={columns}
				filterableColumns={["employeeName", "status", "date"]}
				tableActions={tableActions}
				initialPageSize={10}
				pagination={true}
				emptyState={
					<tr>
						<td colSpan={columns.length} className="h-24 text-center">
							{loading ? (
								<div className="flex justify-center items-center">
									<RefreshCw className="h-6 w-6 animate-spin mr-2" />
									Loading leave data...
								</div>
							) : (
								"No leave records found."
							)}
						</td>
					</tr>
				}
			/>
		</div>
	);
}
