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
				body: JSON.stringify({ fileContent }),
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
						<div>
							<div>
								<div>
									<p>Employee ID</p>
									<p>Name</p>
									<p>Total Hours</p>
									<p>Overtime</p>
									<p>Late Deductions</p>
									<p>Final Pay</p>
								</div>
							</div>
							<div>
								{payrollData.map((record) => (
									<div key={record.employeeId}>
										<p>{record.employeeId}</p>
										<p>{record.name}</p>
										<p>{record.totalWorkHours.toFixed(2)}</p>
										<p>{record.overtimeHours.toFixed(2)}</p>
										<p>{record.lateDeductions.toFixed(2)}</p>
										<p>{record.finalPay.toFixed(2)}</p>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
