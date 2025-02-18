import { useState } from "react";

export default function PayrollDashboard() {
	const [file, setFile] = useState(null);
	const [payrollData, setPayrollData] = useState([]);

	const handleFileUpload = async (e) => {
		const uploadedFile = e.target.files[0];
		if (!uploadedFile) return;

		const reader = new FileReader();
		reader.onload = async (event) => {
			const fileContent = event.target.result;
			const response = await fetch("/.netlify/functions/upload-attendance-data", {
				method: "POST",
				body: JSON.stringify({ fileContent,branchId:'1' }),
			});
			const result = await response.json();
			setPayrollData(result.data);
		};
		reader.readAsText(uploadedFile);
	};

	return (
		<div className="p-6">
			<div className="mb-4 p-4">
				<h2 className="text-xl font-bold mb-2">Upload Biometric Data</h2>
				<input type="file" onChange={handleFileUpload} className="mb-2" />
				<button onClick={() => setPayrollData([])}>Clear Data</button>
			</div>

			{payrollData.length > 0 && (
				<div>
					<div>
						<h2 className="text-xl font-bold mb-2">Payroll Report</h2>
						<table>
							<thead>
								<tr>
									<td>Employee ID</td>
									<td>Name</td>
									<td>Total Hours</td>
									<td>Overtime</td>
									<td>Late Deductions</td>
									<td>Final Pay</td>
								</tr>
							</thead>
							<tbody>
								{payrollData.map((record) => (
									<tr key={record.employeeId}>
										<td>{record.employeeId}</td>
										<td>{record.name}</td>
										<td>{record.totalWorkHours.toFixed(2)}</td>
										<td>{record.overtimeHours.toFixed(2)}</td>
										<td>{record.lateDeductions.toFixed(2)}</td>
										<td>{record.finalPay.toFixed(2)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
}
