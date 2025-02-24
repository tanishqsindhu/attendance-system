import { useState } from "react";

export default function ProcessAttendance() {
	const [branchId, setBranchId] = useState("");
	const [monthYear, setMonthYear] = useState("");
	const [isProcessing, setIsProcessing] = useState(false);

	const handleSubmit = async () => {
		if (!branchId || !monthYear) {
			alert("Please select both branch and month-year.");
			return;
		}
		setIsProcessing(true);

		const response = await fetch("/.netlify/functions/process-attendance", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ branchId, monthYear }),
		});
		const data = await response.json();
		alert(data.message);
		setIsProcessing(false);
	};

	return (
		<div>
			<h2>Process Attendance</h2>
			<select onChange={(e) => setBranchId(e.target.value)}>
				<option value="">Select Branch</option>
				<option value="1">Scottish 16 & 17</option>
				<option value="2">Scottish SouthBypass</option>
			</select>
			<input type="month" onChange={(e) => setMonthYear(e.target.value)} />
			<button onClick={handleSubmit} disabled={isProcessing}>
				{isProcessing ? "Processing..." : "Process Attendance"}
			</button>
		</div>
	);
}
