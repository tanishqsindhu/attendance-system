import React, { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon, Clock, Save, AlertTriangle } from "lucide-react";
import { saveSingleManualPunch, processManualAttendance } from "@/firebase/attendance-service";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const ManualAttendanceForm = ({ employee, onSave }) => {
	const [date, setDate] = useState(new Date());
	const [punchType, setPunchType] = useState("DutyOn");
	const [punchTime, setPunchTime] = useState("07:00");
	const [notes, setNotes] = useState("");
	const [isProcessing, setIsProcessing] = useState(false);
	const [processingResult, setProcessingResult] = useState(null);
	const [showResults, setShowResults] = useState(false);

	// Get formatted date key in YYYY-MM-DD format
	const getDateKey = (selectedDate) => {
		return format(selectedDate, "yyyy-MM-dd");
	};

	const handleSave = async () => {
		setIsProcessing(true);
		setShowResults(false);
		setProcessingResult(null);

		try {
			const branchId = employee.employment.branchId;
			const employeeId = employee.employment.employeeId;
			const dateKey = getDateKey(date);

			// Use the function to save the manual punch
			await saveSingleManualPunch(branchId, employeeId, date, punchType, punchTime, notes);

			// Process the attendance to update status, working hours, etc.
			const result = await processManualAttendance(branchId, employeeId, dateKey);

			// Store the processing result to display
			setProcessingResult(result);
			setShowResults(true);

			// Call the onSave callback with the updated employee data
			if (onSave) {
				// Extract month-year string from date
				const month = String(date.getMonth() + 1).padStart(2, "0");
				const year = date.getFullYear();
				const monthYearKey = `${month}-${year}`;

				await onSave(monthYearKey);
			}

			// Reset form
			setNotes("");
			toast.success("Manual attendance saved and processed successfully");
		} catch (error) {
			console.error("Error saving manual attendance:", error);
			setProcessingResult({
				processed: false,
				error: error.message,
			});
			setShowResults(true);
			toast.error("Failed to save manual attendance: " + error.message);
		} finally {
			setIsProcessing(false);
		}
	};

	return (
		<Card className="w-full max-w-md mx-auto">
			<CardHeader>
				<CardTitle>Add Manual Attendance</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="date">Date</Label>
					<div className="flex items-center justify-center">
						<Calendar mode="single" selected={date} onSelect={(newDate) => newDate && setDate(newDate)} className="rounded-md border" initialFocus />
					</div>
				</div>

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

				<div className="grid grid-cols-1 gap-4">
					<div className="space-y-2">
						<Label htmlFor="punch-time">Time</Label>
						<div className="flex items-center space-x-2">
							<Clock className="h-4 w-4 text-muted-foreground" />
							<Input id="punch-time" type="time" value={punchTime} onChange={(e) => setPunchTime(e.target.value)} className="flex-1" />
						</div>
					</div>
				</div>

				<div className="space-y-2">
					<Label htmlFor="notes">Notes</Label>
					<Input id="notes" placeholder="Reason for manual entry" value={notes} onChange={(e) => setNotes(e.target.value)} />
				</div>

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
								<AlertDescription>{processingResult.reason || processingResult.error || "Unknown error occurred"}</AlertDescription>
							</>
						)}
					</Alert>
				)}
			</CardContent>
			<CardFooter>
				<Button onClick={handleSave} className="w-full" disabled={isProcessing}>
					<Save className="mr-2 h-4 w-4" />
					{isProcessing ? "Processing..." : "Save Manual Attendance"}
				</Button>
			</CardFooter>
		</Card>
	);
};

export default ManualAttendanceForm;
