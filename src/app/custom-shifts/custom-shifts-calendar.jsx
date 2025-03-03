import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import {
	format,
	startOfMonth,
	endOfMonth,
	startOfWeek,
	endOfWeek,
	eachDayOfInterval,
	isSameMonth,
	isSameDay,
	addMonths,
	parseISO,
} from "date-fns";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCustomShifts, deleteCustomShift } from "@/store/custom-shift/custom-shift.reducer.js";
import {
	selectCustomShifts,
	selectCustomShiftsLoading,
} from "@/store/custom-shift/custom-shift.selector.js";
import CustomShiftForm from "./custom-shift-form";

const CustomShiftsCalendar = () => {
	const dispatch = useDispatch();
	const { branchId } = useParams();
	const customShifts = useSelector(selectCustomShifts);
	const loading = useSelector(selectCustomShiftsLoading);

	const [currentMonth, setCurrentMonth] = useState(new Date());
	const [selectedDate, setSelectedDate] = useState(new Date());
	const [isAddModalOpen, setIsAddModalOpen] = useState(false);
	const [isViewModalOpen, setIsViewModalOpen] = useState(false);
	const [selectedShift, setSelectedShift] = useState(null);

	// Fetch shifts for the current month
	useEffect(() => {
		if (branchId) {
			const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
			const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");

			dispatch(
				getCustomShifts({
					branchId,
					startDate: start,
					endDate: end,
				})
			);
		}
	}, [branchId, currentMonth, dispatch]);

	// Navigate to previous month
	const previousMonth = () => {
		setCurrentMonth(addMonths(currentMonth, -1));
	};

	// Navigate to next month
	const nextMonth = () => {
		setCurrentMonth(addMonths(currentMonth, 1));
	};

	// Handle date click - show shifts for the selected date
	const handleDateClick = (date) => {
		setSelectedDate(date);

		// Find shifts for this date
		const dateStr = format(date, "yyyy-MM-dd");
		const shiftsForDate = customShifts.filter((shift) => shift.date === dateStr);

		if (shiftsForDate.length > 0) {
			setSelectedShift(shiftsForDate[0]);
			setIsViewModalOpen(true);
		} else {
			setIsAddModalOpen(true);
		}
	};

	// Delete a custom shift
	const handleDeleteShift = async (shiftId) => {
		try {
			await dispatch(deleteCustomShift({ branchId, shiftId })).unwrap();
			toast.success("Custom shift deleted successfully");
			setIsViewModalOpen(false);
		} catch (error) {
			toast.error(`Failed to delete custom shift: ${error}`);
		}
	};

	// Render date cell with custom styling based on shift data
	const renderDateCell = (date) => {
		const dateStr = format(date, "yyyy-MM-dd");
		const shiftsForDate = customShifts.filter((shift) => shift.date === dateStr);

		const hasCustomShift = shiftsForDate.length > 0;
		const isHoliday = hasCustomShift && shiftsForDate.some((shift) => shift.isHoliday);
		const isLeave = hasCustomShift && shiftsForDate.some((shift) => shift.isLeave);

		const cellClass = cn(
			"h-12 w-12 rounded-md flex flex-col items-center justify-center",
			!isSameMonth(date, currentMonth) && "text-gray-400",
			hasCustomShift && "font-bold",
			isHoliday && "bg-green-100",
			isLeave && "bg-orange-100",
			hasCustomShift && !isHoliday && !isLeave && "bg-blue-100",
			isSameDay(date, selectedDate) && "ring-2 ring-primary"
		);

		return (
			<div className={cellClass}>
				<span>{format(date, "d")}</span>
				{hasCustomShift && (
					<div className="text-xs">{isHoliday ? "🏖️" : isLeave ? "🌴" : "📝"}</div>
				)}
			</div>
		);
	};

	return (
		<div className="space-y-4">
			<Card className="w-full">
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle>Custom Shifts Calendar</CardTitle>
						<div className="flex items-center space-x-2">
							<Button variant="outline" size="icon" onClick={previousMonth} disabled={loading}>
								<ChevronLeft className="h-4 w-4" />
							</Button>
							<span className="font-medium">{format(currentMonth, "MMMM yyyy")}</span>
							<Button variant="outline" size="icon" onClick={nextMonth} disabled={loading}>
								<ChevronRight className="h-4 w-4" />
							</Button>
						</div>
					</div>
					<CardDescription>Manage date-specific shifts and holidays</CardDescription>
				</CardHeader>
				<CardContent>
					<Calendar
						mode="single"
						selected={selectedDate}
						onSelect={handleDateClick}
						month={currentMonth}
						onMonthChange={setCurrentMonth}
						className="rounded-md border"
						components={{
							Day: ({ date }) => renderDateCell(date),
						}}
					/>
				</CardContent>
				<CardFooter className="flex justify-between">
					<Button variant="outline" onClick={() => setSelectedDate(new Date())}>
						Today
					</Button>
					<Button
						onClick={() => {
							setSelectedDate(new Date());
							setIsAddModalOpen(true);
						}}
					>
						<Plus className="mr-2 h-4 w-4" /> Add Custom Shift
					</Button>
				</CardFooter>
			</Card>

			{/* Add/Edit Custom Shift Dialog */}
			<Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Add Custom Shift</DialogTitle>
						<DialogDescription>
							Create a special shift schedule for {format(selectedDate, "PPPP")}
						</DialogDescription>
					</DialogHeader>
					<CustomShiftForm onComplete={() => setIsAddModalOpen(false)} date={selectedDate} />
				</DialogContent>
			</Dialog>

			{/* View Custom Shift Dialog */}
			<Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Custom Shift Details</DialogTitle>
						<DialogDescription>
							{selectedShift && format(parseISO(selectedShift.date), "PPPP")}
						</DialogDescription>
					</DialogHeader>

					{selectedShift && (
						<div className="space-y-4">
							<div>
								<h3 className="font-medium">{selectedShift.name}</h3>
								<div className="grid grid-cols-2 gap-2 mt-2">
									<div>
										<p className="text-sm font-medium">Start Time</p>
										<p>{selectedShift.times?.start || "N/A"}</p>
									</div>
									<div>
										<p className="text-sm font-medium">End Time</p>
										<p>{selectedShift.times?.end || "N/A"}</p>
									</div>
								</div>
							</div>

							<div>
								<p className="text-sm font-medium">Applied To</p>
								<p>{selectedShift.applyToAllEmployees ? "All Employees" : "Specific Employee"}</p>
							</div>

							{selectedShift.isHoliday && (
								<div className="bg-green-100 p-2 rounded">
									<p className="font-medium">Holiday</p>
									<p className="text-sm">No attendance required on this day</p>
								</div>
							)}

							{selectedShift.isLeave && (
								<div className="bg-orange-100 p-2 rounded">
									<p className="font-medium">Scheduled Leave</p>
								</div>
							)}

							{selectedShift.notes && (
								<div>
									<p className="text-sm font-medium">Notes</p>
									<p>{selectedShift.notes}</p>
								</div>
							)}
						</div>
					)}

					<DialogFooter className="flex justify-between">
						<Button
							variant="destructive"
							onClick={() => handleDeleteShift(selectedShift?.id)}
							disabled={loading}
						>
							<Trash2 className="mr-2 h-4 w-4" /> Delete
						</Button>
						<Button
							onClick={() => {
								setIsViewModalOpen(false);
								setIsAddModalOpen(true);
							}}
						>
							Edit
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default CustomShiftsCalendar;
