import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSelector } from "react-redux";
import { selectAllBranches } from "./store/orgaznization-settings/organization-settings.selector";
import { selectCurrentUser } from "./store/user/user.selector";
import { getAvailableAttendancePeriods } from "@/firebase/index.js";

export default function ProcessAttendance() {
	const [branchId, setBranchId] = useState("");
	const [year, setYear] = useState("");
	const [month, setMonth] = useState("");
	const [isProcessing, setIsProcessing] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [availablePeriods, setAvailablePeriods] = useState([]);

	const branches = useSelector(selectAllBranches);
	const currentUser = useSelector(selectCurrentUser);

	const allowedBranches = branches.filter((branch) => currentUser.roles.includes(branch.id) || currentUser.roles.includes("bothBranches"));
	// console.log(availablePeriods);
	// Fetch available periods when branch changes
	useEffect(() => {
		if (branchId) {
			fetchAvailablePeriods();
		} else {
			// Reset when branch is cleared
			setAvailablePeriods([]);
			setYear("");
			setMonth("");
		}
	}, [branchId]);

	const fetchAvailablePeriods = async () => {
		setIsLoading(true);
		try {
			const periods = await getAvailableAttendancePeriods(branchId);
			console.log(periods);
			setAvailablePeriods(periods);

			// Auto-select most recent year if available
			if (periods.length > 0) {
				setYear(periods[0].year);
			}
		} catch (error) {
			console.error("Error fetching available periods:", error);
		} finally {
			setIsLoading(false);
		}
	};

	// Get months for the selected year
	const availableMonths = year ? availablePeriods.find((p) => p.year === year)?.months || [] : [];

	const handleSubmit = async () => {
		if (!branchId || !year || !month) {
			alert("Please select branch, year, and month.");
			return;
		}

		const monthYear = `${month}-${year}`;
		setIsProcessing(true);

		try {
			const response = await fetch("/.netlify/functions/process-attendance", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ branchId, monthYear }),
			});

			const data = await response.json();
			alert(data.message);
		} catch (error) {
			console.error("Error processing attendance:", error);
			alert("An error occurred while processing attendance.");
		} finally {
			setIsProcessing(false);
		}
	};

	return (
		<>
			<Card className="max-w-4xl mx-auto p-6">
				<CardHeader>
					<CardTitle>Process Attendance</CardTitle>
					<CardDescription>Select a branch and available attendance period to process</CardDescription>
				</CardHeader>
				<CardContent>
					<form>
						<div className="grid w-full items-center gap-4">
							{/* Branch Selection */}
							<div className="flex flex-col space-y-1.5">
								<Label htmlFor="branchId">Select Branch</Label>
								<Select id="branchId" onValueChange={setBranchId} value={branchId}>
									<SelectTrigger>
										<SelectValue placeholder="Select Branch" />
									</SelectTrigger>
									<SelectContent position="popper">
										{allowedBranches.map((branch) => (
											<SelectItem key={branch.id} value={branch.id}>
												{branch.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{/* Year Selection */}
							<div className="flex flex-col space-y-1.5">
								<Label htmlFor="year">Select Year</Label>
								<Select id="year" onValueChange={setYear} value={year} disabled={!branchId || isLoading}>
									<SelectTrigger>
										{isLoading ? (
											<div className="flex items-center">
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												<span>Loading...</span>
											</div>
										) : (
											<SelectValue placeholder="Select Year" />
										)}
									</SelectTrigger>
									<SelectContent position="popper">
										{availablePeriods.map((period) => (
											<SelectItem key={period.year} value={period.year}>
												{period.year}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{/* Month Selection */}
							<div className="flex flex-col space-y-1.5">
								<Label htmlFor="month">Select Month</Label>
								<Select id="month" onValueChange={setMonth} value={month} disabled={!year || isLoading}>
									<SelectTrigger>
										<SelectValue placeholder="Select Month" />
									</SelectTrigger>
									<SelectContent position="popper">
										{availableMonths.map((m) => (
											<SelectItem key={m} value={m}>
												{new Date(`${year}-${m}-01`).toLocaleString("default", { month: "long" })}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					</form>
				</CardContent>
				<CardFooter className="flex justify-between">
					<Button onClick={handleSubmit} disabled={isProcessing || !branchId || !year || !month} className={isProcessing ? "opacity-50 w-full" : "w-full"}>
						{isProcessing ? (
							<div className="flex items-center justify-center gap-2">
								<Loader2 className="animate-spin" />
								<span>Processing...</span>
							</div>
						) : (
							"Process Attendance"
						)}
					</Button>
				</CardFooter>
			</Card>
		</>
	);
}
