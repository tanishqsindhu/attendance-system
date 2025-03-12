// components/sanction-leave-form.component.jsx
"use client";

import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { sanctionLeave } from "@/store/leave/leave.slice";

const leaveTypes = [
	{ id: "sick", label: "Sick Leave" },
	{ id: "casual", label: "Casual Leave" },
	{ id: "personal", label: "Personal Leave" },
	{ id: "vacation", label: "Vacation" },
	{ id: "other", label: "Other" },
];

export function SanctionLeaveForm({ leave, branchId, onComplete }) {
	const dispatch = useDispatch();
	const currentUser = useSelector((state) => state.auth.user);

	const [leaveType, setLeaveType] = useState(leave.leaveType || "sick");
	const [reason, setReason] = useState(leave.reason || "");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError(null);

		try {
			await dispatch(
				sanctionLeave({
					employeeId: leave.employeeId,
					date: leave.date,
					leaveType,
					reason,
					branchId,
					sanctionedBy: currentUser ? currentUser.uid : "Unknown",
					sanctionedByName: currentUser ? currentUser.displayName : "Unknown",
					sanctionedAt: new Date().toISOString(),
				})
			).unwrap();

			if (onComplete) {
				onComplete();
			}
		} catch (err) {
			setError(err.message || "Failed to sanction leave");
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			{error && (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>Error</AlertTitle>
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			<div className="grid grid-cols-2 gap-4">
				<div>
					<Label className="text-sm text-gray-500">Employee</Label>
					<p className="font-medium">{leave.employeeName}</p>
				</div>
				<div>
					<Label className="text-sm text-gray-500">Date</Label>
					<p className="font-medium">{format(new Date(leave.date), "PPP")}</p>
				</div>
			</div>

			<div className="space-y-2">
				<Label htmlFor="leaveType">Leave Type</Label>
				<Select id="leaveType" value={leaveType} onValueChange={setLeaveType}>
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
			</div>

			<div className="space-y-2">
				<Label htmlFor="reason">Reason / Notes</Label>
				<Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Enter reason for leave or any additional notes" rows={3} />
			</div>

			<div className="flex justify-end space-x-2 pt-2">
				<Button variant="outline" type="button" onClick={onComplete}>
					Cancel
				</Button>
				<Button type="submit" disabled={loading}>
					{loading ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							Processing...
						</>
					) : (
						<>
							<Check className="mr-2 h-4 w-4" />
							Sanction Leave
						</>
					)}
				</Button>
			</div>
		</form>
	);
}
