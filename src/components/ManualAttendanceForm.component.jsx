import React, { useState, useCallback } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon, Clock, Save, AlertTriangle, Loader2 } from "lucide-react";
import { saveSingleManualPunch, processSingleDateAttendance } from "@/firebase/attendance-service";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const ManualAttendanceForm = ({ employee, onSave }) => {
	const [date, setDate] = useState(new Date());
	const [punchType, setPunchType] = useState("DutyOn");
	const [punchTime, setPunchTime] = useState("07:00");
	const [notes, setNotes] = useState("");
	const [isProcessing, setIsProcessing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [processingResult, setProcessingResult] = useState(null);
	const [showResults, setShowResults] = useState(false);

	// Get formatted date key in YYYY-MM-DD format
	const getDateKey = useCallback((selectedDate) => {
		return format(selectedDate, "yyyy-MM-dd");
	}, []);

	// Reset form
	const resetForm = useCallback(() => {
		setNotes("");
	}, []);

	const handleSave = async () => {
		// Extract branch ID and employee ID from the employee object
		const branchId = employee?.employment?.branchId;
		const employeeId = employee?.id || employee?.employment?.employeeId;

		if (!branchId || !employeeId) {
			toast.error("Missing employee or branch information");
			return;
		}

		setIsSaving(true);
		setShowResults(false);
		setProcessingResult(null);

		try {
			const dateKey = getDateKey(date);

			// First save the punch WITHOUT processing
			await saveSingleManualPunch(branchId, employeeId, date, punchType, punchTime, notes, false);

			// Set to processing state after punch is saved
			setIsSaving(false);
			setIsProcessing(true);

			// Then process the attendance separately
			const result = await processSingleDateAttendance(branchId, employeeId, dateKey);

			// After successful save and processing
			const month = String(date.getMonth() + 1).padStart(2, "0");
			const year = date.getFullYear();
			const monthYearKey = `${month}-${year}`;

			// Notify parent component
			if (onSave) {
				await onSave(monthYearKey);
			}

			// Set success state with processing results
			setProcessingResult({
				processed: true,
				status: result.status || "Attendance processed",
				deduction: result.deductionAmount || 0,
				remarks: result.deductionRemarks || "Attendance processed successfully",
			});

			setShowResults(true);
			toast.success("Manual attendance saved and processed successfully");
			resetForm();
		} catch (error) {
			console.error("Error with manual attendance:", error);
			setProcessingResult({
				processed: false,
				error: error.message,
			});
			setShowResults(true);
			toast.error("Error: " + error.message);
		} finally {
			setIsSaving(false);
			setIsProcessing(false);
		}
	};

	return (
		<Card className="w-full max-w-md mx-auto">
			<CardHeader>
				<CardTitle>Add Manual Attendance</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Date Picker with Popover */}
				<div className="space-y-2">
					<Label htmlFor="date">Date</Label>
					<Popover>
						<PopoverTrigger asChild>
							<Button variant="outline" className="w-full justify-start text-left font-normal" id="date">
								<CalendarIcon className="mr-2 h-4 w-4" />
								{format(date, "PPP")}
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-auto p-0">
							<Calendar mode="single" selected={date} onSelect={(newDate) => newDate && setDate(newDate)} initialFocus />
						</PopoverContent>
					</Popover>
				</div>

				{/* Punch Type */}
				<div className="space-y-2">
					<Label htmlFor="punch-type">Punch Type</Label>
					<Select value={punchType} onValueChange={setPunchType}>
						<SelectTrigger id="punch-type">
							<SelectValue placeholder="Select punch type" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="DutyOn">Duty On (In)</SelectItem>
							<SelectItem value="DutyOff">Duty Off (Out)</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* Time Input */}
				<div className="space-y-2">
					<Label htmlFor="punch-time">Time</Label>
					<div className="flex items-center space-x-2">
						<Clock className="h-4 w-4 text-muted-foreground" />
						<Input id="punch-time" type="time" value={punchTime} onChange={(e) => setPunchTime(e.target.value)} className="flex-1" />
					</div>
				</div>

				{/* Notes Input */}
				<div className="space-y-2">
					<Label htmlFor="notes">Notes</Label>
					<Input id="notes" placeholder="Reason for manual entry" value={notes} onChange={(e) => setNotes(e.target.value)} />
				</div>

				{/* Results Alert */}
				{showResults && processingResult && (
					<Alert variant={processingResult.processed ? "default" : "destructive"}>
						{processingResult.processed ? (
							<>
								<AlertTitle>Attendance Processed</AlertTitle>
								<AlertDescription>
									Status: {processingResult.status}
									<br />
									{processingResult.deduction > 0 && (
										<>
											Deduction: ₹{processingResult.deduction.toFixed(2)}
											<br />
										</>
									)}
									{processingResult.remarks}
								</AlertDescription>
							</>
						) : (
							<>
								<AlertTriangle className="h-4 w-4" />
								<AlertTitle>Processing Failed</AlertTitle>
								<AlertDescription>{processingResult.error || "Unknown error occurred"}</AlertDescription>
							</>
						)}
					</Alert>
				)}
			</CardContent>
			<CardFooter>
				<Button onClick={handleSave} className="w-full" disabled={isSaving || isProcessing}>
					{isSaving ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							Saving...
						</>
					) : isProcessing ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							Processing...
						</>
					) : (
						<>
							<Save className="mr-2 h-4 w-4" />
							Save Manual Attendance
						</>
					)}
				</Button>
			</CardFooter>
		</Card>
	);
};

export default ManualAttendanceForm;
