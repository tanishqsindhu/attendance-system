// components/leave-application-form.component.jsx
"use client";

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertCircle, Calendar as CalendarIcon, Check } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { fetchEmployeesByBranch, selectEmployeesByBranch } from "@/store/employees/employees.slice";
import { addSanctionedLeave } from "@/store/leave/leave.slice";
import { selectCurrentUser } from "../store/user/user.selector";

const leaveTypes = [
	{ id: "sick", label: "Sick Leave" },
	{ id: "casual", label: "Casual Leave" },
	{ id: "personal", label: "Personal Leave" },
	{ id: "vacation", label: "Vacation" },
	{ id: "other", label: "Other" },
];

export function LeaveApplicationForm({ branchId }) {
	const dispatch = useDispatch();
	const employees = useSelector((state) => selectEmployeesByBranch(state, branchId));
	const currentUser = useSelector(selectCurrentUser);

	const [selectedEmployee, setSelectedEmployee] = useState("");
	const [leaveDate, setLeaveDate] = useState(new Date());
	const [leaveType, setLeaveType] = useState("sick");
	const [leaveReason, setLeaveReason] = useState("");
	const [leaveDuration, setLeaveDuration] = useState("full");
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);
	const [error, setError] = useState(null);
	const [otherLeaveType, setOtherLeaveType] = useState("");

	useEffect(() => {
		if (branchId) {
			dispatch(fetchEmployeesByBranch(branchId));
		}
	}, [dispatch, branchId]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		setSuccess(false);
		setError(null);

		try {
			const finalLeaveType = leaveType === "other" ? otherLeaveType : leaveType;

			const formattedDate = format(leaveDate, "yyyy-MM-dd");

			const leaveData = {
				employeeId: selectedEmployee,
				date: formattedDate,
				leaveType: finalLeaveType,
				reason: leaveReason,
				duration: leaveDuration,
				sanctioned: true,
				sanctionedBy: currentUser ? currentUser.uid : "Unknown",
				sanctionedAt: new Date().toISOString(),
				branchId,
			};

			const result = await dispatch(addSanctionedLeave(leaveData)).unwrap();

			setSuccess(true);
			toast.success("Leave application successfully processed");

			// Reset form
			setSelectedEmployee("");
			setLeaveDate(new Date());
			setLeaveType("sick");
			setLeaveReason("");
			setLeaveDuration("full");
			setOtherLeaveType("");
		} catch (err) {
			setError(err.message || "Failed to process leave application");
			toast.error("Failed to process leave application");
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{error && (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>Error</AlertTitle>
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			{success && (
				<Alert className="bg-green-50 border-green-200">
					<Check className="h-4 w-4 text-green-600" />
					<AlertTitle className="text-green-800">Success</AlertTitle>
					<AlertDescription className="text-green-700">Leave application has been successfully processed.</AlertDescription>
				</Alert>
			)}

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div className="space-y-3">
					<Label htmlFor="employee">Select Employee</Label>
					<Select value={selectedEmployee} onValueChange={setSelectedEmployee} required>
						<SelectTrigger id="employee">
							<SelectValue placeholder="Select an employee" />
						</SelectTrigger>
						<SelectContent>
							{employees.map((employee) => (
								<SelectItem key={employee.id} value={employee.id}>
									{employee.personal?.firstName || ""} {employee.personal?.lastName || ""}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-3">
					<Label>Leave Date</Label>
					<Popover>
						<PopoverTrigger asChild>
							<Button variant="outline" className="w-full justify-start text-left">
								<CalendarIcon className="mr-2 h-4 w-4" />
								{leaveDate ? format(leaveDate, "PPP") : "Select a date"}
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-auto p-0">
							<Calendar mode="single" selected={leaveDate} onSelect={setLeaveDate} initialFocus />
						</PopoverContent>
					</Popover>
				</div>

				<div className="space-y-3">
					<Label>Leave Type</Label>
					<Select value={leaveType} onValueChange={setLeaveType} required>
						<SelectTrigger>
							<SelectValue placeholder="Select leave type" />
						</SelectTrigger>
						<SelectContent>
							{leaveTypes.map((type) => (
								<SelectItem key={type.id} value={type.id}>
									{type.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					{leaveType === "other" && (
						<div className="mt-3">
							<Label htmlFor="otherLeaveType">Specify Leave Type</Label>
							<Input id="otherLeaveType" value={otherLeaveType} onChange={(e) => setOtherLeaveType(e.target.value)} placeholder="Specify leave type" required />
						</div>
					)}
				</div>

				<div className="space-y-3">
					<Label>Leave Duration</Label>
					<RadioGroup value={leaveDuration} onValueChange={setLeaveDuration} className="flex space-x-6">
						<div className="flex items-center space-x-2">
							<RadioGroupItem value="full" id="full" />
							<Label htmlFor="full">Full Day</Label>
						</div>
						<div className="flex items-center space-x-2">
							<RadioGroupItem value="half_morning" id="half_morning" />
							<Label htmlFor="half_morning">Half Day (Morning)</Label>
						</div>
						<div className="flex items-center space-x-2">
							<RadioGroupItem value="half_afternoon" id="half_afternoon" />
							<Label htmlFor="half_afternoon">Half Day (Afternoon)</Label>
						</div>
					</RadioGroup>
				</div>

				<div className="space-y-3 md:col-span-2">
					<Label htmlFor="reason">Reason for Leave</Label>
					<Textarea id="reason" value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} placeholder="Enter reason for leave" rows={3} required />
				</div>
			</div>

			<Button type="submit" className="w-full md:w-auto" disabled={loading}>
				{loading ? "Processing..." : "Submit Leave Application"}
			</Button>
		</form>
	);
}
