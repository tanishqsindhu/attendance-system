import { useState, useEffect } from "react";
// import { Card, CardContent } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Select, SelectItem } from "@nextui-org/react";
import { getEmployeeDetails } from "./firebase/firebase"; // Firebase functions

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
		<div className="max-w-4xl mx-auto p-6">
			{/* Employee Details */}
			<div className="p-4 shadow-md rounded-xl">
				<h2 className="text-xl font-bold">Employee Profile</h2>
				{employee ? (
					<div className="mt-2">
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
					</div>
				) : (
					<p>Loading...</p>
				)}
			</div>

			{/* Month Selector */}
			<div className="mt-4">
				<label className="block text-sm font-medium">Select Month:</label>
				<select value={monthYear} onChange={(e) => setMonthYear(e.target.value)}>
					{Array.from({ length: 12 }, (_, i) => {
						const date = new Date();
						date.setMonth(i);
						const month = String(i + 1).padStart(2, "0");
						const year = date.getFullYear();
						return (
							<option key={i} value={`${month}-${year}`}>
								{date.toLocaleString("default", { month: "long", year: "numeric" })}
							</option>
						);
					})}
				</select>
			</div>

			{/* Attendance Logs */}
			<div className="mt-6">
				<h3 className="text-lg font-semibold">Attendance Logs - {monthYear}</h3>
				{Object.keys(attendance).length === 0 ? (
					<p>No attendance records found.</p>
				) : (
					<table className="w-full border-collapse mt-2">
						<thead>
							<tr className="">
								<th className="border p-2">Date</th>
								<th className="border p-2">In/Out</th>
								<th className="border p-2">Time</th>
								<th className="border p-2">Mode</th>
								<th className="border p-2">Status</th>
								<th className="border p-2">Working Hours</th>
								<th className="border p-2">Deduction</th>
								<th className="border p-2">Missing</th>
							</tr>
						</thead>
						<tbody>
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
										<tr key={`${date}-${index}`} className="text-center">
											{index === 0 && (
												<td rowSpan={logs.length} className="border p-2 font-bold">
													{date}
												</td>
											)}
											<td className="border p-2">{logEntry.inOut === "DutyIn" ? "In" : "Out"}</td>
											<td className="border p-2">{new Date(logEntry.time).toLocaleTimeString()}</td>
											<td className="border p-2">{logEntry.mode}</td>
											{index === 0 && (
												<>
													<td rowSpan={logs.length} className="border p-2">
														{log.status || "-"}
													</td>
													<td rowSpan={logs.length} className="border p-2">
														{log.workingHours || "-"}
													</td>
													<td rowSpan={logs.length} className="border p-2">
														{log.deduction || "0"}
													</td>
													<td rowSpan={logs.length} className="border p-2">
														{missingText}
													</td>
												</>
											)}
										</tr>
									))
								) : (
									<tr key={date} className="text-center bg-red-100">
										<td className="border p-2">{date}</td>
										<td colSpan={7} className="border p-2">
											Absent
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
};

export default EmployeeProfile;
