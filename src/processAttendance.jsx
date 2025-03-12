import { useState, useEffect } from "react";
import { Loader2, Check, Info, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSelector } from "react-redux";
import { selectAllBranches } from "@/store/organization-settings/organization-settings.slice";
import { selectCurrentUser } from "./store/user/user.selector";
import { getAvailableAttendancePeriods } from "@/firebase/index.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function AttendanceManagement() {
	// Shared state
	const [activeTab, setActiveTab] = useState("assign");

	// Assignment tab state
	const [assignBranchId, setAssignBranchId] = useState("");
	const [assignYear, setAssignYear] = useState("");
	const [assignMonth, setAssignMonth] = useState("");
	const [assignIsLoading, setAssignIsLoading] = useState(false);
	const [assignIsProcessing, setAssignIsProcessing] = useState(false);
	const [assignAvailablePeriods, setAssignAvailablePeriods] = useState([]);
	const [assignStatus, setAssignStatus] = useState(null);

	// Processing tab state
	const [processBranchId, setProcessBranchId] = useState("");
	const [processDateType, setProcessDateType] = useState("period");
	const [processYear, setProcessYear] = useState("");
	const [processMonth, setProcessMonth] = useState("");
	const [processIsLoading, setProcessIsLoading] = useState(false);
	const [processIsProcessing, setProcessIsProcessing] = useState(false);
	const [processAvailablePeriods, setProcessAvailablePeriods] = useState([]);
	const [processStatus, setProcessStatus] = useState(null);
	const [startDate, setStartDate] = useState(new Date());
	const [endDate, setEndDate] = useState(new Date());

	// Common data
	const branches = useSelector(selectAllBranches);
	const currentUser = useSelector(selectCurrentUser);

	const allowedBranches = branches.filter((branch) => currentUser.roles.includes(branch.id) || currentUser.roles.includes("bothBranches"));

	// Fetch periods for assignment tab
	useEffect(() => {
		if (assignBranchId) {
			fetchAssignAvailablePeriods();
		} else {
			setAssignAvailablePeriods([]);
			setAssignYear("");
			setAssignMonth("");
		}
	}, [assignBranchId]);

	// Fetch periods for processing tab
	useEffect(() => {
		if (processBranchId) {
			fetchProcessAvailablePeriods();
		} else {
			setProcessAvailablePeriods([]);
			setProcessYear("");
			setProcessMonth("");
		}
	}, [processBranchId]);

	/* Assignment Tab Functions */
	const fetchAssignAvailablePeriods = async () => {
		setAssignIsLoading(true);
		try {
			const periods = await getAvailableAttendancePeriods(assignBranchId);
			setAssignAvailablePeriods(periods);

			// Auto-select most recent year if available
			if (periods.length > 0) {
				setAssignYear(periods[0].year);
			}
		} catch (error) {
			console.error("Error fetching available periods:", error);
		} finally {
			setAssignIsLoading(false);
		}
	};

	const handleAssignAttendance = async () => {
		if (!assignBranchId || !assignYear || !assignMonth) {
			alert("Please select branch, year, and month.");
			return;
		}

		setAssignIsProcessing(true);
		setAssignStatus(null);

		try {
			const monthYear = `${assignMonth}-${assignYear}`;
			const response = await fetch("/.netlify/functions/attendance-assignment", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ branchId: assignBranchId, monthYear }),
			});

			const data = await response.json();

			if (response.ok) {
				setAssignStatus({
					type: "success",
					message: "Attendance assigned successfully!",
					details: data,
				});
			} else {
				setAssignStatus({
					type: "error",
					message: "Error assigning attendance.",
					details: data,
				});
			}
		} catch (error) {
			console.error("Error assigning attendance:", error);
			setAssignStatus({
				type: "error",
				message: "Error assigning attendance. Check console for details.",
				details: error,
			});
		} finally {
			setAssignIsProcessing(false);
		}
	};

	/* Processing Tab Functions */
	const fetchProcessAvailablePeriods = async () => {
		setProcessIsLoading(true);
		try {
			const periods = await getAvailableAttendancePeriods(processBranchId);
			setProcessAvailablePeriods(periods);

			// Auto-select most recent year if available
			if (periods.length > 0) {
				setProcessYear(periods[0].year);
			}
		} catch (error) {
			console.error("Error fetching available periods:", error);
		} finally {
			setProcessIsLoading(false);
		}
	};

	const handleProcessAttendance = async () => {
		if (!processBranchId) {
			alert("Please select a branch.");
			return;
		}

		if (processDateType === "period" && (!processYear || !processMonth)) {
			alert("Please select year and month.");
			return;
		}

		if (processDateType === "custom" && (!startDate || !endDate)) {
			alert("Please select both start and end dates.");
			return;
		}

		setProcessIsProcessing(true);
		setProcessStatus(null);

		try {
			// Prepare request body based on date selection type
			const requestBody = { branchId: processBranchId };

			if (processDateType === "period") {
				requestBody.monthYear = `${processMonth}-${processYear}`;
			} else {
				// Format dates for API
				requestBody.startDate = formatDateForAPI(startDate);
				requestBody.endDate = formatDateForAPI(endDate);
			}

			const response = await fetch("/.netlify/functions/attendance-processing", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(requestBody),
			});

			const data = await response.json();

			if (response.ok) {
				setProcessStatus({
					type: "success",
					message: "Attendance processed successfully!",
					details: data,
				});
			} else {
				setProcessStatus({
					type: "error",
					message: "Error processing attendance.",
					details: data,
				});
			}
		} catch (error) {
			console.error("Error processing attendance:", error);
			setProcessStatus({
				type: "error",
				message: "Error processing attendance. Check console for details.",
				details: error,
			});
		} finally {
			setProcessIsProcessing(false);
		}
	};

	/* Helper Functions */
	const formatDateForAPI = (date) => {
		return date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` : null;
	};

	// Get months for the selected year (assignment tab)
	const assignAvailableMonths = assignYear ? assignAvailablePeriods.find((p) => p.year === assignYear)?.months || [] : [];

	// Get months for the selected year (processing tab)
	const processAvailableMonths = processYear ? processAvailablePeriods.find((p) => p.year === processYear)?.months || [] : [];

	// Determine if the selected date range crosses month boundaries
	const doesDateRangeCrossMonths = () => {
		if (!startDate || !endDate) return false;

		const startMonth = startDate.getMonth();
		const startYear = startDate.getFullYear();
		const endMonth = endDate.getMonth();
		const endYear = endDate.getFullYear();

		return startMonth !== endMonth || startYear !== endYear;
	};

	return (
		<Card className="max-w-4xl mx-auto p-6">
			<CardHeader>
				<CardTitle>Attendance Management</CardTitle>
				<CardDescription>Assign and process attendance data for payroll calculation</CardDescription>
			</CardHeader>

			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="assign">Assign Attendance</TabsTrigger>
					<TabsTrigger value="process">Process Attendance</TabsTrigger>
				</TabsList>

				{/* Assignment Tab Content */}
				<TabsContent value="assign">
					<CardContent>
						<form className="space-y-4">
							{/* Branch Selection */}
							<div className="flex flex-col space-y-1.5">
								<Label htmlFor="assignBranchId">Select Branch</Label>
								<Select id="assignBranchId" onValueChange={setAssignBranchId} value={assignBranchId}>
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
								<Label htmlFor="assignYear">Select Year</Label>
								<Select id="assignYear" onValueChange={setAssignYear} value={assignYear} disabled={!assignBranchId || assignIsLoading}>
									<SelectTrigger>
										{assignIsLoading ? (
											<div className="flex items-center">
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												<span>Loading...</span>
											</div>
										) : (
											<SelectValue placeholder="Select Year" />
										)}
									</SelectTrigger>
									<SelectContent position="popper">
										{assignAvailablePeriods.map((period) => (
											<SelectItem key={period.year} value={period.year}>
												{period.year}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{/* Month Selection */}
							<div className="flex flex-col space-y-1.5">
								<Label htmlFor="assignMonth">Select Month</Label>
								<Select id="assignMonth" onValueChange={setAssignMonth} value={assignMonth} disabled={!assignYear || assignIsLoading}>
									<SelectTrigger>
										<SelectValue placeholder="Select Month" />
									</SelectTrigger>
									<SelectContent position="popper">
										{assignAvailableMonths.map((m) => (
											<SelectItem key={m} value={m}>
												{new Date(`${assignYear}-${m}-01`).toLocaleString("default", {
													month: "long",
												})}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{/* Description */}
							<div className="p-2">
								<p className="text-sm text-muted-foreground">Assigns raw attendance logs to employees, organizing them by date and employee.</p>
							</div>

							{/* Status Alerts */}
							{assignStatus && (
								<Alert className="mb-2" variant={assignStatus.type === "success" ? "default" : "destructive"}>
									{assignStatus.type === "success" ? <Check className="h-4 w-4" /> : <Info className="h-4 w-4" />}
									<AlertTitle>{assignStatus.type === "success" ? "Success" : "Error"}</AlertTitle>
									<AlertDescription>{assignStatus.message}</AlertDescription>
								</Alert>
							)}
						</form>
					</CardContent>

					<CardFooter>
						<Button onClick={handleAssignAttendance} disabled={assignIsProcessing || !assignBranchId || !assignYear || !assignMonth} className="w-full">
							{assignIsProcessing ? (
								<div className="flex items-center justify-center gap-2">
									<Loader2 className="animate-spin" />
									<span>Assigning...</span>
								</div>
							) : (
								"Assign Attendance"
							)}
						</Button>
					</CardFooter>
				</TabsContent>

				{/* Processing Tab Content */}
				<TabsContent value="process">
					<CardContent>
						<form className="space-y-4">
							{/* Branch Selection */}
							<div className="flex flex-col space-y-1.5">
								<Label htmlFor="processBranchId">Select Branch</Label>
								<Select id="processBranchId" onValueChange={setProcessBranchId} value={processBranchId}>
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

							{/* Date Selection Type */}
							<div className="flex flex-col space-y-2">
								<Label>Date Range Selection</Label>
								<RadioGroup value={processDateType} onValueChange={setProcessDateType} className="flex flex-wrap">
									<div className="flex items-center space-x-2 mr-6 mb-2">
										<RadioGroupItem value="period" id="period" />
										<Label htmlFor="period">Monthly Period</Label>
									</div>
									<div className="flex items-center space-x-2 mb-2">
										<RadioGroupItem value="custom" id="custom" />
										<Label htmlFor="custom">Custom Date Range</Label>
									</div>
								</RadioGroup>
							</div>

							{/* Period Selection */}
							{processDateType === "period" && (
								<>
									<div className="flex flex-col space-y-1.5">
										<Label htmlFor="processYear">Select Year</Label>
										<Select id="processYear" onValueChange={setProcessYear} value={processYear} disabled={!processBranchId || processIsLoading}>
											<SelectTrigger>
												{processIsLoading ? (
													<div className="flex items-center">
														<Loader2 className="mr-2 h-4 w-4 animate-spin" />
														<span>Loading...</span>
													</div>
												) : (
													<SelectValue placeholder="Select Year" />
												)}
											</SelectTrigger>
											<SelectContent position="popper">
												{processAvailablePeriods.map((period) => (
													<SelectItem key={period.year} value={period.year}>
														{period.year}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									<div className="flex flex-col space-y-1.5">
										<Label htmlFor="processMonth">Select Month</Label>
										<Select id="processMonth" onValueChange={setProcessMonth} value={processMonth} disabled={!processYear || processIsLoading}>
											<SelectTrigger>
												<SelectValue placeholder="Select Month" />
											</SelectTrigger>
											<SelectContent position="popper">
												{processAvailableMonths.map((m) => (
													<SelectItem key={m} value={m}>
														{new Date(`${processYear}-${m}-01`).toLocaleString("default", {
															month: "long",
														})}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								</>
							)}

							{/* Custom Date Range */}
							{processDateType === "custom" && (
								<>
									<div className="flex flex-col sm:flex-row gap-4">
										<div className="flex flex-col space-y-1.5 flex-1">
											<Label htmlFor="start-date">Start Date</Label>
											<Popover>
												<PopoverTrigger asChild>
													<Button id="start-date" variant="outline" className="w-full justify-start text-left font-normal">
														<Calendar className="mr-2 h-4 w-4" />
														{startDate ? format(startDate, "PPP") : "Select date"}
													</Button>
												</PopoverTrigger>
												<PopoverContent className="w-auto p-0" align="start">
													<CalendarComponent mode="single" selected={startDate} onSelect={setStartDate} disabled={(date) => date > endDate} initialFocus />
												</PopoverContent>
											</Popover>
										</div>

										<div className="flex flex-col space-y-1.5 flex-1">
											<Label htmlFor="end-date">End Date</Label>
											<Popover>
												<PopoverTrigger asChild>
													<Button id="end-date" variant="outline" className="w-full justify-start text-left font-normal">
														<Calendar className="mr-2 h-4 w-4" />
														{endDate ? format(endDate, "PPP") : "Select date"}
													</Button>
												</PopoverTrigger>
												<PopoverContent className="w-auto p-0" align="start">
													<CalendarComponent mode="single" selected={endDate} onSelect={setEndDate} disabled={(date) => date < startDate} initialFocus />
												</PopoverContent>
											</Popover>
										</div>
									</div>

									{/* Cross-month warning */}
									{doesDateRangeCrossMonths() && (
										<Alert>
											<Info className="h-4 w-4" />
											<AlertTitle>Multi-Month Range</AlertTitle>
											<AlertDescription>You've selected dates across multiple months. The system will process all dates and organize records by month.</AlertDescription>
										</Alert>
									)}
								</>
							)}

							{/* Description */}
							<div className="p-2">
								<p className="text-sm text-muted-foreground">Processes attendance data to calculate deductions based on late arrivals, early departures, and absences.</p>
							</div>

							{/* Status Alerts */}
							{processStatus && (
								<Alert className="mb-2" variant={processStatus.type === "success" ? "default" : "destructive"}>
									{processStatus.type === "success" ? <Check className="h-4 w-4" /> : <Info className="h-4 w-4" />}
									<AlertTitle>{processStatus.type === "success" ? "Success" : "Error"}</AlertTitle>
									<AlertDescription className="space-y-2">
										<p>{processStatus.message}</p>
										{processStatus.type === "success" && processStatus.details?.summary && (
											<p className="text-xs">
												{processStatus.details.summary.datesProcessed} dates processed
												{processStatus.details.summary.monthsProcessed > 1 ? ` across ${processStatus.details.summary.monthsProcessed} months` : ""}
											</p>
										)}
									</AlertDescription>
								</Alert>
							)}
						</form>
					</CardContent>

					<CardFooter>
						<Button onClick={handleProcessAttendance} disabled={processIsProcessing || !processBranchId || (processDateType === "period" && (!processYear || !processMonth)) || (processDateType === "custom" && (!startDate || !endDate))} className="w-full">
							{processIsProcessing ? (
								<div className="flex items-center justify-center gap-2">
									<Loader2 className="animate-spin" />
									<span>Processing...</span>
								</div>
							) : (
								"Process Attendance"
							)}
						</Button>
					</CardFooter>
				</TabsContent>
			</Tabs>
		</Card>
	);
}
