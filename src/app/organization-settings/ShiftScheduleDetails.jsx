// src/components/organization/ShiftScheduleDetails.jsx
"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

const ShiftScheduleDetails = ({ schedule }) => {
	if (!schedule) return null;

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-2 gap-4">
				<div>
					<p className="text-sm text-muted-foreground">ID</p>
					<p className="font-medium">{schedule.id}</p>
				</div>
				<div>
					<p className="text-sm text-muted-foreground">Name</p>
					<p className="font-medium">{schedule.name}</p>
				</div>
				<div>
					<p className="text-sm text-muted-foreground">Start Time</p>
					<p className="font-medium">{schedule.startTime}</p>
				</div>
				<div>
					<p className="text-sm text-muted-foreground">End Time</p>
					<p className="font-medium">{schedule.endTime}</p>
				</div>
			</div>

			<div>
				<p className="text-sm text-muted-foreground">Days</p>
				<p className="font-medium">{schedule.days.join(", ")}</p>
			</div>

			<div>
				<p className="text-sm text-muted-foreground mb-2">Date Overrides</p>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Date</TableHead>
							<TableHead>Start Time</TableHead>
							<TableHead>End Time</TableHead>
							<TableHead>Work Day</TableHead>
							<TableHead>Description</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{Object.entries(schedule.dateOverrides || {}).map(([date, override]) => (
							<TableRow key={date}>
								<TableCell>{date}</TableCell>
								<TableCell>{override.start}</TableCell>
								<TableCell>{override.end}</TableCell>
								<TableCell>{override.isWorkDay ? "Yes" : "No"}</TableCell>
								<TableCell>{override.description}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
};

export default ShiftScheduleDetails;
