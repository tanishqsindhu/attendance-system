import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ProcessAttendance() {
	const [branchId, setBranchId] = useState("");
	const [monthYear, setMonthYear] = useState("");
	const [isProcessing, setIsProcessing] = useState(false);
	console.log(monthYear, branchId);

	const handleSubmit = async () => {
		console.log(monthYear, branchId);
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
		<>
			<Card className="w-[350px]">
				<CardHeader>
					<CardTitle>Process Attendance</CardTitle>
				</CardHeader>
				<CardContent>
					<form>
						<div className="grid w-full items-center gap-4">
							{/* Branch Selection */}
							<div className="flex flex-col space-y-1.5">
								<Label htmlFor="branchId">Select Branch</Label>
								<Select id="branchId" onValueChange={setBranchId}>
									<SelectTrigger>
										<SelectValue placeholder="Select" />
									</SelectTrigger>
									<SelectContent position="popper">
										<SelectItem value="1">Scottish 16 & 17</SelectItem>
										<SelectItem value="2">Scottish SouthBypass</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{/* Month-Year Input */}
							<div className="flex flex-col space-y-1.5">
								<Label htmlFor="month-year">Month-Year</Label>
								<Input id="month-year" placeholder="Enter Month-Year for processing" onChange={(e) => setMonthYear(e.target.value)} />
							</div>
						</div>
					</form>
				</CardContent>

				<CardFooter className="flex justify-between">
					<Button onClick={handleSubmit} disabled={isProcessing} className={isProcessing ? "opacity-50 w-100" : "w-100"}>
						{isProcessing ? (
							<div className="flex items-center gap-2">
								<Loader2 className="animate-spin" />
								<span>Please wait</span>
							</div>
						) : (
							"Submit"
						)}
					</Button>
				</CardFooter>
			</Card>
		</>
	);
}
