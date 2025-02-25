import { useState, useEffect } from "react";
// import { Card, CardContent } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Select, SelectItem } from "@nextui-org/react";
import { getEmployeeDetails } from "./firebase/firebase"; // Firebase functions
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const EmployeeProfile = ({ branchId, employeeId }) => {
	const [employee, setEmployee] = useState(null);
	const [attendance, setAttendance] = useState({});
	const [monthYear, setMonthYear] = useState(getCurrentMonthYear()); // Default: Current Month-Year

	// Function to generate Month-Year in MM-YYYY format
	function getCurrentMonthYear() {
		const date = new Date();
		const month = String(date.getMonth() + 1).padStart(2, "0"); // Ensure 2-digit month
		const year = date.getFullYear();
		return `${month}-${year}`;
	}
	useEffect(() => {
		if (branchId) fetchEmployeeDetails();
	}, [branchId, employeeId, monthYear]);

	const fetchEmployeeDetails = async () => {
		const data = await getEmployeeDetails(branchId, employeeId);
		if (!data) alert("No Employee Data Found");
		setEmployee(data);
		setAttendance(data?.attendance?.[monthYear] || {}); // Fetch attendance from employee data
	};

	return (
		<Card className="max-w-4xl mx-auto p-6">
			{/* Employee Details */}
			<CardHeader>
				<CardTitle className='text-center text-xl'>Employee Profile</CardTitle>
				{employee ? (
					<CardDescription>
						<p>
							<strong>Name:</strong> {employee.name}
						</p>
						<p>
							<strong>Employee ID:</strong> {employeeId}
						</p>
						<p>
							<strong>Department:</strong> {employee.department}
						</p>
						<p>
							<strong>Shift:</strong> {employee.shiftStart} - {employee.shiftEnd}
						</p>
					</CardDescription>
				) : (
					<p>Loading...</p>
				)}
			</CardHeader>
			<CardContent>
				<form>
					{/* Month Selector */}
					<div>
						<Label htmlFor="select-month">Select Month:</Label>
						<Select value={monthYear} onChange={(e) => setMonthYear(e.target.value)}>
							<SelectTrigger id="select-month">
								<SelectValue placeholder="Select" />
							</SelectTrigger>
							<SelectContent position="popper">
								{Array.from({ length: 12 }, (_, i) => {
									const date = new Date();
									date.setMonth(i);
									const month = String(i + 1).padStart(2, "0");
									const year = date.getFullYear();
									return (
										<SelectItem key={i} value={`${month}-${year}`}>
											{date.toLocaleString("default", { month: "long", year: "numeric" })}
										</SelectItem>
									);
								})}
							</SelectContent>
						</Select>
					</div>
				</form>
				{/* Attendance Logs */}
				<div className="mt-6">
					<h3 className="text-lg font-semibold">Attendance Logs - {monthYear}</h3>
					{Object.keys(attendance).length === 0 ? (
						<p>No attendance records found.</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Date</TableHead>
									<TableHead>In/Out</TableHead>
									<TableHead>Time</TableHead>
									<TableHead>Mode</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Working Hours</TableHead>
									<TableHead>Deduction</TableHead>
									<TableHead>Missing</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{Object.entries(attendance).map(([date, log]) => {
									const logs = log.logs || [];
									const missingText =
										logs.length === 0
											? "Absent"
											: logs.some((l) => l.inOut === "DutyIn") &&
											  !logs.some((l) => l.inOut === "DutyOff")
											? "Out Time Missing"
											: !logs.some((l) => l.inOut === "DutyIn") &&
											  logs.some((l) => l.inOut === "DutyOff")
											? "In Time Missing"
											: "-";

									return logs.length > 0 ? (
										logs.map((logEntry, index) => (
											<TableRow key={`${date}-${index}`} className="text-center">
												{index === 0 && <TableCell rowSpan={logs.length}>{date}</TableCell>}
												<TableCell>{logEntry.inOut === "DutyIn" ? "In" : "Out"}</TableCell>
												<TableCell>{new Date(logEntry.time).toLocaleTimeString()}</TableCell>
												<TableCell>{logEntry.mode}</TableCell>
												{index === 0 && (
													<>
														<TableCell rowSpan={logs.length}>{log.status || "-"}</TableCell>
														<TableCell rowSpan={logs.length}>{log.workingHours || "-"}</TableCell>
														<TableCell rowSpan={logs.length}>{log.deduction || "0"}</TableCell>
														<TableCell rowSpan={logs.length}>{missingText}</TableCell>
													</>
												)}
											</TableRow>
										))
									) : (
										<TableRow key={date} className="text-center bg-red-100">
											<td>{date}</td>
											<td colSpan={7}>Absent</td>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					)}
				</div>
			</CardContent>
		</Card>
	);
};

export default EmployeeProfile;
