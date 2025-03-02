import { useMemo } from "react";
import { DataTable } from "@/components/data-table.component";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const AttendanceTable = ({
	attendanceData,
	monthOptions,
	monthYear,
	onMonthChange,
	loading,
	error,
}) => {
	// Attendance table columns
	const attendanceColumns = useMemo(
		() => [
			{
				accessorKey: "date",
				header: "Date",
			},
			{
				accessorKey: "inTime",
				header: "In Time",
				cell: ({ row }) => {
					const logs = row.original.logs || [];
					const inTime = logs.find((log) => log.inOut === "DutyOn");
					return inTime ? inTime.time : "-";
				},
			},
			{
				accessorKey: "outTime",
				header: "Out Time",
				cell: ({ row }) => {
					const logs = row.original.logs || [];
					const outTime = logs.find((log) => log.inOut === "DutyOff");
					return outTime ? outTime.time : "-";
				},
			},
			{
				accessorKey: "mode",
				header: "Mode",
				cell: ({ row }) => {
					const logs = row.original.logs || [];
					return logs.length > 0 ? logs[0].mode : "-";
				},
			},
			{
				accessorKey: "status",
				header: "Status",
				cell: ({ row }) => {
					const attendance = row.original;
					return attendance?.status ? (
						<GetAttendanceStatusBadge status={attendance.status} />
					) : (
						<div>-</div>
					);
				},
			},
			{
				accessorKey: "workingHours",
				header: "Working Hours",
				cell: ({ row }) => row.original.workingHours || "-",
			},
			{
				accessorKey: "deduction",
				header: "Deduction",
				cell: ({ row }) => row.original.deduction || "0",
			},
		],
		[]
	);

	// Format Attendance status
	const GetAttendanceStatusBadge = ({ status }) => {
		const statusMap = {
			active: "success",
			"Missing Punch": "destructive",
			probation: "secondary",
		};

		// Check if the status contains "Late In" or "Early Out"
		if (/Late In|Early Out/.test(status)) {
			return (
				<Badge variant="warning" className="capitalize w-60">
					{status}
				</Badge>
			);
		}

		// Default to the statusMap or secondary if no match
		return (
			<Badge variant={statusMap[status] || "secondary"} className="capitalize w-60">
				{status}
			</Badge>
		);
	};

	return (
		<>
			{error && (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
					Error: {error}
				</div>
			)}

			<div className="flex items-center gap-2 mb-4">
				<Label htmlFor="select-month">Select Month:</Label>
				<Select
					id="select-month"
					value={monthYear}
					onValueChange={onMonthChange}
					disabled={monthOptions.length === 0}
				>
					<SelectTrigger className="w-[240px]">
						<SelectValue
							placeholder={monthOptions.length === 0 ? "No attendance data" : "Select month"}
						/>
					</SelectTrigger>
					<SelectContent position="popper">
						{monthOptions.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<DataTable
				data={attendanceData}
				columns={attendanceColumns}
				filterableColumns={["date", "status"]}
				initialPageSize={10}
				loading={loading}
				emptyState={
					<div className="text-center p-6">
						<p className="text-muted-foreground">
							{monthOptions.length === 0
								? "No attendance records found for this employee."
								: "No attendance records found for the selected month."}
						</p>
					</div>
				}
			/>
		</>
	);
};

export default AttendanceTable;
