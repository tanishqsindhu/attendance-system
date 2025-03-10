import { useMemo } from "react";
import { DataTable } from "@/components/data-table.component";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

const AttendanceTable = ({ attendanceData, monthOptions, monthYear, onMonthChange, loading, error }) => {
	// Sortable header component
	const SortableHeader = ({ column, title }) => {
		return (
			<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
				{title}
				{column.getIsSorted() === "asc" ? <ArrowUp className="ml-2 h-4 w-4" /> : column.getIsSorted() === "desc" ? <ArrowDown className="ml-2 h-4 w-4" /> : <ArrowUpDown className="ml-2 h-4 w-4" />}
			</Button>
		);
	};

	// Attendance table columns
	const attendanceColumns = useMemo(
		() => [
			{
				accessorKey: "date",
				header: ({ column }) => <SortableHeader column={column} title="Date" />,
				cell: ({ row }) => {
					const date = row.original.date;
					const dayOfWeek = row.original.dayOfWeek;
					return <div className="px-3">{dayOfWeek ? `${date} (${dayOfWeek})` : date}</div>;
				},
			},
			{
				accessorKey: "inTime",
				header: "In Time",
				cell: ({ row }) => {
					const logs = row.original.logs || [];
					const dutyOnLogs = logs.filter((log) => log.inOut === "DutyOn");

					return (
						<div className="px-3">
							{dutyOnLogs.length > 0 ? (
								<div className="space-y-1">
									{dutyOnLogs.map((log, index) => (
										<div key={`in-${index}`} className="flex flex-col">
											<div className="flex items-center gap-2 text-sm">
												<span>{log.time}</span>
												<ModeBadge mode={log.mode} />
											</div>
											<AttendanceNotes log={log} />
										</div>
									))}
								</div>
							) : row.original.firstIn ? (
								row.original.firstIn
							) : (
								"-"
							)}
						</div>
					);
				},
			},
			{
				accessorKey: "outTime",
				header: "Out Time",
				cell: ({ row }) => {
					const logs = row.original.logs || [];
					const dutyOffLogs = logs.filter((log) => log.inOut === "DutyOff");

					return (
						<div className="px-3">
							{dutyOffLogs.length > 0 ? (
								<div className="space-y-1">
									{dutyOffLogs.map((log, index) => (
										<div key={`out-${index}`} className="flex flex-col">
											<div className="flex items-center gap-2 text-sm">
												<span>{log.time}</span>
												<ModeBadge mode={log.mode} />
											</div>
											<AttendanceNotes log={log} />
										</div>
									))}
								</div>
							) : row.original.lastOut ? (
								row.original.lastOut
							) : (
								"-"
							)}
						</div>
					);
				},
			},
			{
				accessorKey: "status",
				header: "Status",
				cell: ({ row }) => {
					const attendance = row.original;
					return <div className="px-3">{attendance?.status ? <GetAttendanceStatusBadge status={attendance.status} /> : <div>-</div>}</div>;
				},
			},
			{
				accessorKey: "workingHours",
				header: ({ column }) => <SortableHeader column={column} title="Working Hours" />,
				cell: ({ row }) => <div className="px-3">{row.original.workingHours || "-"}</div>,
			},
			{
				accessorKey: "deduction",
				header: ({ column }) => <SortableHeader column={column} title="Deduction" />,
				cell: ({ row }) => {
					const deduction = row.original.deductionAmount || row.original.deduction || 0;
					return <div className="px-3">{deduction ? `₹${parseFloat(deduction).toFixed(2)}` : "₹0.00"}</div>;
				},
			},
			{
				accessorKey: "remarks",
				header: "Remarks",
				cell: ({ row }) => <div className="px-3">{row.original.deductionRemarks || "-"}</div>,
			},
		],
		[]
	);

	// Mode badge component
	const ModeBadge = ({ mode }) => {
		const modeVariants = {
			FACE: "default",
			FP: "outline",
			CARD: "secondary",
			Manual: "warning",
		};

		return (
			<Badge variant={modeVariants[mode] || "default"} className="text-xs px-2 py-0 h-5 w-18 uppercase">
				{mode}
			</Badge>
		);
	};
	const AttendanceNotes = ({ log }) => {
		if (!log.notes) return null;

		return <div className="mt-1 text-xs text-muted-foreground italic">Note: {log.notes}</div>;
	};
	// Format Attendance status
	const GetAttendanceStatusBadge = ({ status }) => {
		const statusMap = {
			"On Time": "success",
			"Missing Punch": "destructive",
			"Manual Entry": "default",
			probation: "secondary",
		};

		// Check if the status contains "Late In" or "Early Out"
		if (/Late In|Early Out/.test(status)) {
			return (
				<Badge variant="warning" className="capitalize min-w-35 max-w-60">
					{status}
				</Badge>
			);
		}

		// Default to the statusMap or secondary if no match
		return (
			<Badge variant={statusMap[status] || "secondary"} className="capitalize min-w-35 max-w-60">
				{status}
			</Badge>
		);
	};

	return (
		<>
			{error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">Error: {error}</div>}
			<DataTable
				data={attendanceData}
				columns={attendanceColumns}
				filterableColumns={["date", "status"]}
				initialPageSize={10}
				loading={loading}
				initialSorting={[{ id: "date", desc: false }]}
				emptyState={
					<div className="text-center p-6">
						<p className="text-muted-foreground">{monthOptions.length === 0 ? "No attendance records found for this employee." : "No attendance records found for the selected month."}</p>
					</div>
				}
			/>
		</>
	);
};

export default AttendanceTable;
