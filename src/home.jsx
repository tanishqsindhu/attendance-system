import { useState } from "react";

export default function PayrollDashboard() {
	const [processResult, setProcessResult] = useState(null);
	const [branchId, setBranchId] = useState({});

	const handleFileUpload = async (e) => {
		const uploadedFile = e.target.files[0];
		if (!uploadedFile) return;
		setBranchId(1);
		const reader = new FileReader();
		reader.onload = async (event) => {
			const fileContent = event.target.result;
			const response = await fetch("/.netlify/functions/upload-attendance-data", {
				method: "POST",
				body: JSON.stringify({ fileContent, branchId }),
			});
			const result = await response.json();
			console.log(result.data, result);
			setProcessResult(result.data);
		};
		reader.readAsText(uploadedFile);
	};

	return (
		<div className="p-6">
			<div className="mb-4 p-4">
				<h2 className="text-xl font-bold mb-2">Upload Biometric Data</h2>
				<input type="file" onChange={handleFileUpload} className="mb-2" />
				<button onClick={() => setProcessResult({})}>Clear Data</button>
			</div>
			{processResult ? (
				<p>
					{processResult.noOfProcessDate} data has been processed done from{" "}
					{processResult.earliestDate} to
					{processResult.endDate}
				</p>
			) : (
				""
			)}
		</div>
	);
}
