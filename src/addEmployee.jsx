import { useState } from "react";
// import { Card, CardContent } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Select, SelectItem } from "@/components/ui/select";
// import { db } from "@/firebase"; // Firebase import
import { addEmployeeDetails } from "./firebase/firebase";

export default function EmployeeForm() {
	const [branches] = useState([
		{ id: 1, name: "Scottish 16 & 17" },
		{ id: 2, name: "Scottish South Bypass" },
	]);

	const [formData, setFormData] = useState({
		employeeId: "",
		name: "",
		position: "",
		salary: "",
		department: "",
		joiningDate: "",
		branchId: "",
	});
	const [loading, setLoading] = useState(false);

	const handleChange = (e) => {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	};
	const handleSubmit = async (e) => {
		e.preventDefault();
		if (
			!formData.employeeId ||
			!formData.name ||
			!formData.position ||
			!formData.salary ||
			!formData.department ||
			!formData.joiningDate ||
			!formData.branchId
		) {
			alert("Please fill all fields");
			return;
		}
		setLoading(true);
		const employeeData = await addEmployeeDetails(formData);
		alert(employeeData);
		setLoading(false);
	};

	return (
		<div className="max-w-lg mx-auto mt-10 p-6 shadow-lg rounded-lg">
			<h2 className="text-xl font-semibold mb-4">Add Employee Details</h2>
			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label>Employee ID</label>
					<input
						type="text"
						name="employeeId"
						value={formData.employeeId}
						onChange={handleChange}
						required
					/>
				</div>
				<div>
					<label>Name</label>
					<input type="text" name="name" value={formData.name} onChange={handleChange} required />
				</div>
				<div>
					<label>Position</label>
					<input
						type="text"
						name="position"
						value={formData.position}
						onChange={handleChange}
						required
					/>
				</div>
				<div>
					<label>Salary</label>
					<input
						type="number"
						name="salary"
						value={formData.salary}
						onChange={handleChange}
						required
					/>
				</div>
				<div>
					<label>Department</label>
					<select name="department" value={formData.department} onChange={handleChange} required>
						<option value="">Select a department</option>
						<option value="Teaching">Teaching</option>
						<option value="Admin">Admin</option>
						<option value="Support">Support</option>
					</select>
				</div>
				<div>
					<label>Joining Date</label>
					<input
						type="date"
						name="joiningDate"
						value={formData.joiningDate}
						onChange={handleChange}
						required
					/>
				</div>
				<div>
					<label>School Branch</label>
					<select name="branchId" value={formData.branchId} onChange={handleChange} required>
						<option value="">Select a branch</option>
						{branches.map((branch) => (
							<option key={branch.id} value={branch.id}>
								{branch.name}
							</option>
						))}
					</select>
				</div>
				<button type="submit" className="w-full" disabled={loading}>
					{loading ? "Submitting..." : "Submit"}
				</button>
				{loading && <div className="text-center mt-2">Loading...</div>}
			</form>
		</div>
	);
}
