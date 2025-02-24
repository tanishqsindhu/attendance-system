import { useState } from "react";

export default function AttendanceUpload() {
	const [branchId, setBranchId] = useState("");
	const [file, setFile] = useState(null);
	const [year, setYear] = useState(new Date().getFullYear());
	const [month, setMonth] = useState(new Date().getMonth() + 1);
	const [isLoading, setIsLoading] = useState(false);
	const [forceOverwrite, setForceOverwrite] = useState(false);

	const handleFileChange = (e) => {
		setFile(e.target.files[0]);
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!branchId || !file) {
			alert("Please select a branch and upload a file.");
			return;
		}

		setIsLoading(true);

		try {
			const reader = new FileReader();
			reader.onload = async (event) => {
				const fileContent = event.target.result;
				const monthYear = `${month.toString().padStart(2, "0")}-${year}`; // MM-YYYY format
				const formData = { branchId, monthYear, forceOverwrite };

				// ✅ Step 1: Check if attendance already exists for the month
				let checkResponse = await fetch("/.netlify/functions/upload-attendance", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ formData, checkOnly: true }),
				});
				let checkData = await checkResponse.json();
				console.log(checkData, checkResponse);
				// ✅ Step 2: If attendance exists, ask for overwrite confirmation
				if (checkResponse.status === 409) {
					const confirmOverwrite = window.confirm(
						`Attendance data for ${monthYear} already exists.\nDo you want to overwrite it?`
					);
					if (!confirmOverwrite) {
						setIsLoading(false);
						return;
					}
					formData.forceOverwrite = true;
				}

				// ✅ Step 3: Upload the file
				const uploadResponse = await fetch("/.netlify/functions/upload-attendance", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ fileContent, formData }),
				});

				const result = await uploadResponse.json();
				if (!uploadResponse.ok) {
					throw new Error(result.message || "Failed to upload attendance.");
				}

				alert("✅ Attendance uploaded successfully.");
			};

			reader.readAsText(file);
		} catch (error) {
			console.error("Upload failed:", error);
			alert("❌ Error uploading file.");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="max-w-lg mx-auto mt-10 p-6 shadow-lg rounded-lg">
			<h2 className="text-xl font-semibold mb-4">Upload Attendance File</h2>
			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label>School Branch</label>
					<select value={branchId} onChange={(e) => setBranchId(e.target.value)} required>
						<option value="">Select a branch</option>
						<option value="1">Scottish 16 & 17</option>
						<option value="2">Scottish South Bypass</option>
					</select>
				</div>

				<div>
					<label>Year</label>
					<select value={year} onChange={(e) => setYear(e.target.value)} required>
						{Array.from({ length: 5 }, (_, i) => (
							<option key={i} value={new Date().getFullYear() - i}>
								{new Date().getFullYear() - i}
							</option>
						))}
					</select>
				</div>

				<div>
					<label>Month</label>
					<select value={month} onChange={(e) => setMonth(e.target.value)} required>
						{Array.from({ length: 12 }, (_, i) => (
							<option key={i} value={i + 1}>
								{new Date(0, i).toLocaleString("default", { month: "long" })}
							</option>
						))}
					</select>
				</div>

				<div>
					<label>Upload Biometric File</label>
					<input type="file" accept=".txt,.csv" onChange={handleFileChange} required />
				</div>

				<div>
					<label>
						<input
							type="checkbox"
							checked={forceOverwrite}
							onChange={(e) => setForceOverwrite(e.target.checked)}
						/>
						<span className="ml-2">Force Overwrite (if exists)</span>
					</label>
				</div>

				<button
					type="submit"
					className="w-full bg-blue-500 text-white p-2 rounded"
					disabled={isLoading}
				>
					{isLoading ? "Uploading..." : "Submit"}
				</button>
			</form>
		</div>
	);
}
