// components/leave-management.component.jsx
"use client";

import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { format, parseISO } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Check, X, RefreshCw, Calendar, Filter, Eye } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DataTable } from "@/components/data-table.component";
import { Textarea } from "@/components/ui/textarea";
import { SanctionLeaveForm } from "@/components/sanction-leave-form.component";
import { fetchEmployeeLeaves, updateLeaveSanctionStatus, selectAllLeaves, selectLeavesLoading, selectLeavesError } from "@/store/leave/leave.slice";
import { selectCurrentUser } from "../store/user/user.selector";

export function EmployeeLeaveManagement({ branchId, employeeId }) {
	const dispatch = useDispatch();
	const allLeaves = useSelector(selectAllLeaves);
	const loading = useSelector(selectLeavesLoading);
	const error = useSelector(selectLeavesError);
	const currentUser = useSelector(selectCurrentUser);

	// For filtering
	const [statusFilter, setStatusFilter] = useState("all"); // all, sanctioned, unsanctioned
	const [typeFilter, setTypeFilter] = useState("all"); // all, sick, casual, etc.
	const [employeeName, setEmployeeName] = useState("");
	const [leaveTab, setLeaveTab] = useState("all"); // all, pending, approved, etc.
	const [dateRange, setDateRange] = useState({
		start: null,
		end: null,
	});

	// For dialogs
	const [selectedLeave, setSelectedLeave] = useState(null);
	const [showSanctionDialog, setShowSanctionDialog] = useState(false);
	const [showDetailsDialog, setShowDetailsDialog] = useState(false);

	useEffect(() => {
		if (branchId) {
			dispatch(fetchEmployeeLeaves(branchId));
		}
	}, [dispatch, branchId]);

	// Get all leave types from the data
	const leaveTypes = [...new Set(allLeaves.filter((leave) => leave.leaveType).map((leave) => leave.leaveType))];

	// Filter leaves based on criteria
	const filteredLeaves = allLeaves.filter((leave) => {
		// First filter by employee ID if provided
		const employeeMatch = employeeId ? leave.employeeId === employeeId : true;

		// Then filter by status
		const statusMatch = statusFilter === "all" ? true : statusFilter === "sanctioned" ? leave.sanctioned : statusFilter === "unsanctioned" ? !leave.sanctioned : true;

		// Filter by leave type
		const typeMatch = typeFilter === "all" ? true : leave.leaveType === typeFilter;

		// Filter by tab selection
		const tabMatch = leaveTab === "all" ? true : leaveTab === "pending" ? !leave.sanctioned && !leave.rejected : leaveTab === "approved" ? leave.sanctioned : leaveTab === "rejected" ? leave.rejected : true;

		// Filter by date range if set
		let dateMatch = true;
		if (dateRange.start && dateRange.end) {
			const leaveDate = new Date(leave.date);
			dateMatch = leaveDate >= dateRange.start && leaveDate <= dateRange.end;
		}

		// Set employee name for the first matching leave
		if (employeeMatch && employeeId && !employeeName && leave.employeeName) {
			setEmployeeName(leave.employeeName);
		}

		return employeeMatch && statusMatch && typeMatch && tabMatch && dateMatch;
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

	// Handle opening sanction dialog
	const openSanctionDialog = (leave) => {
		setSelectedLeave(leave);
		setShowSanctionDialog(true);
	};

	// Handle opening details dialog
	const openDetailsDialog = (leave) => {
		setSelectedLeave(leave);
		setShowDetailsDialog(true);
	};

	// Refresh leaves data
	const handleRefresh = () => {
		dispatch(fetchEmployeeLeaves(branchId));
	};

	// Define columns for DataTable
	const columns = [
		// Only show employee name column if no specific employee is selected
		...(!employeeId
			? [
					{
						id: "employeeName",
						header: "Employee",
						accessorKey: "employeeName",
						cell: ({ row }) => <div className="font-medium">{row.original.employeeName}</div>,
					},
			  ]
			: []),
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
			id: "type",
			header: "Type",
			accessorKey: "leaveType",
			cell: ({ row }) => {
				const leaveType = row.original.leaveType || "Absent";
				return (
					<Badge variant="outline" className="capitalize">
						{leaveType}
					</Badge>
				);
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
				const sanctionedBy = row.original.sanctionedBy;

				return (
					<div className="flex items-center space-x-2">
						<Switch checked={sanctioned} onCheckedChange={() => handleSanctionToggle(row.original.employeeId, row.original.date, sanctioned)} disabled={loading} />
						<Label>{sanctioned ? <span className="text-green-600 font-medium">Yes</span> : <span className="text-red-600 font-medium">No</span>}</Label>
					</div>
				);
			},
		},
		{
			id: "actions",
			header: "Actions",
			cell: ({ row }) => {
				const leave = row.original;
				const isSanctioned = leave.sanctioned;

				return (
					<div className="flex space-x-2 justify-end">
						<Button variant="outline" size="sm" onClick={() => openDetailsDialog(leave)}>
							<Eye className="h-4 w-4 mr-1" />
							Details
						</Button>

						{!isSanctioned && (
							<Button variant="outline" size="sm" onClick={() => openSanctionDialog(leave)}>
								<Check className="h-4 w-4 mr-1" />
								Sanction
							</Button>
						)}
					</div>
				);
			},
		},
	];

	// Define table actions
	const tableActions = (
		<div className="flex flex-wrap items-center gap-2">
			<Tabs value={leaveTab} onValueChange={setLeaveTab} className="w-full md:w-auto">
				<TabsList>
					<TabsTrigger value="all">All</TabsTrigger>
					<TabsTrigger value="pending">Pending</TabsTrigger>
					<TabsTrigger value="approved">Approved</TabsTrigger>
					<TabsTrigger value="rejected">Rejected</TabsTrigger>
				</TabsList>
			</Tabs>

			<div className="flex items-center space-x-1">
				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="w-[150px]">
						<SelectValue placeholder="Status Filter" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Statuses</SelectItem>
						<SelectItem value="sanctioned">Sanctioned</SelectItem>
						<SelectItem value="unsanctioned">Unsanctioned</SelectItem>
					</SelectContent>
				</Select>

				{leaveTypes.length > 0 && (
					<Select value={typeFilter} onValueChange={setTypeFilter}>
						<SelectTrigger className="w-[150px]">
							<SelectValue placeholder="Type Filter" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Types</SelectItem>
							{leaveTypes.map((type) => (
								<SelectItem key={type} value={type} className="capitalize">
									{type}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}
			</div>

			<Button variant="outline" size="sm" onClick={handleRefresh}>
				<RefreshCw className="h-4 w-4" />
				<span className="sr-only md:not-sr-only md:ml-2">Refresh</span>
			</Button>
		</div>
	);

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<h2 className="text-3xl font-bold tracking-tight">{employeeId ? `Leave Records: ${employeeName || "Employee"}` : "Leave Management"}</h2>
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
				filterableColumns={employeeId ? ["status", "date", "leaveType"] : ["employeeName", "status", "date", "leaveType"]}
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
							) : employeeId ? (
								"No leave records found for this employee."
							) : (
								"No leave records found."
							)}
						</td>
					</tr>
				}
			/>

			{/* Leave Sanction Dialog */}
			<Dialog open={showSanctionDialog} onOpenChange={setShowSanctionDialog}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Sanction Leave</DialogTitle>
					</DialogHeader>

					{selectedLeave && (
						<SanctionLeaveForm
							leave={selectedLeave}
							branchId={branchId}
							onComplete={() => {
								setShowSanctionDialog(false);
								handleRefresh();
							}}
						/>
					)}
				</DialogContent>
			</Dialog>

			{/* Leave Details Dialog */}
			<Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Leave Details</DialogTitle>
					</DialogHeader>

					{selectedLeave && (
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<h4 className="text-sm font-medium text-gray-500">Employee</h4>
									<p className="font-medium">{selectedLeave.employeeName}</p>
								</div>
								<div>
									<h4 className="text-sm font-medium text-gray-500">Date</h4>
									<p className="font-medium">{format(new Date(selectedLeave.date), "PPP")}</p>
								</div>
								<div>
									<h4 className="text-sm font-medium text-gray-500">Leave Type</h4>
									<p className="font-medium capitalize">{selectedLeave.leaveType || "Regular Absence"}</p>
								</div>
								<div>
									<h4 className="text-sm font-medium text-gray-500">Status</h4>
									<p className="font-medium">{selectedLeave.status}</p>
								</div>
								<div>
									<h4 className="text-sm font-medium text-gray-500">Sanctioned</h4>
									<p className={`font-medium ${selectedLeave.sanctioned ? "text-green-600" : "text-red-600"}`}>{selectedLeave.sanctioned ? "Yes" : "No"}</p>
								</div>
								<div>
									<h4 className="text-sm font-medium text-gray-500">Deduction</h4>
									<p className="font-medium">₹{selectedLeave.deductionAmount.toFixed(2)}</p>
								</div>
							</div>

							{selectedLeave.sanctionedBy && (
								<div>
									<h4 className="text-sm font-medium text-gray-500">Sanctioned By</h4>
									<p className="font-medium">{selectedLeave.sanctionedByName || selectedLeave.sanctionedBy}</p>
								</div>
							)}

							{selectedLeave.sanctionedAt && (
								<div>
									<h4 className="text-sm font-medium text-gray-500">Sanctioned On</h4>
									<p className="font-medium">{format(new Date(selectedLeave.sanctionedAt), "PPP p")}</p>
								</div>
							)}

							{selectedLeave.reason && (
								<div>
									<h4 className="text-sm font-medium text-gray-500">Reason</h4>
									<p>{selectedLeave.reason}</p>
								</div>
							)}

							<div>
								<h4 className="text-sm font-medium text-gray-500">Remarks</h4>
								<p className="text-sm">{selectedLeave.remarks || "No remarks added"}</p>
							</div>
						</div>
					)}

					<DialogFooter>
						<Button onClick={() => setShowDetailsDialog(false)}>Close</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
