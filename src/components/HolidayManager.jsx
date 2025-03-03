import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { addHoliday, fetchHolidays, deleteHoliday } from "@/store/holiday/holiday.reducer";
import { selectHolidays, selectHolidaysLoading } from "@/store/holiday/holiday.selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const HolidayManager = () => {
	const dispatch = useDispatch();
	const holidays = useSelector(selectHolidays);
	const loading = useSelector(selectHolidaysLoading);
	const [date, setDate] = useState(null);
	const [name, setName] = useState("");
	const [type, setType] = useState("full");
	const [year, setYear] = useState(new Date().getFullYear());
	const [calendarView, setCalendarView] = useState(false);

	// Holiday dates for calendar highlighting - make a copy of the dates to avoid modifying the original
	const holidayDates = holidays.map((h) => new Date(h.date));

	useEffect(() => {
		// Fetch holidays for the selected year
		dispatch(fetchHolidays({ year }));
	}, [dispatch, year]);

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!date || !name.trim()) {
			toast.error("Date and name are required");
			return;
		}

		const formattedDate = format(date, "yyyy-MM-dd");
		const holidayYear = date.getFullYear();

		try {
			await dispatch(
				addHoliday({
					date: formattedDate,
					name: name.trim(),
					type,
					year: holidayYear, // Store the year explicitly
				})
			).unwrap();

			toast.success("Holiday added successfully");

			// If the added holiday is not in the currently viewed year, update the year
			if (holidayYear !== year) {
				setYear(holidayYear);
			}

			// Reset form
			setDate(null);
			setName("");
			setType("full");
		} catch (error) {
			toast.error(`Failed to add holiday: ${error}`);
		}
	};

	const handleDeleteHoliday = async (id) => {
		try {
			await dispatch(deleteHoliday({ id, year })).unwrap();
			toast.success("Holiday deleted successfully");
		} catch (error) {
			toast.error(`Failed to delete holiday: ${error}`);
		}
	};

	const toggleView = () => {
		setCalendarView(!calendarView);
	};

	// Create a sorted copy of the holidays array instead of modifying the original
	const sortedHolidays = [...holidays].sort((a, b) => new Date(a.date) - new Date(b.date));

	return (
		<Card className="w-full shadow-md">
			<CardHeader>
				<div className="flex justify-between items-center">
					<div>
						<CardTitle>Holiday Management</CardTitle>
						<CardDescription>Add and manage school holidays</CardDescription>
					</div>
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" onClick={toggleView}>
							{calendarView ? "List View" : "Calendar View"}
						</Button>
						<Select value={year.toString()} onValueChange={(value) => setYear(Number(value))}>
							<SelectTrigger className="w-32">
								<SelectValue placeholder="Select Year" />
							</SelectTrigger>
							<SelectContent>
								{Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
									<SelectItem key={y} value={y.toString()}>
										{y}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			</CardHeader>

			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-6 mb-6">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div className="space-y-2">
							<Label htmlFor="holidayDate">Date</Label>
							<Popover>
								<PopoverTrigger asChild>
									<Button
										variant="outline"
										className="w-full justify-start text-left font-normal"
										id="holidayDate"
									>
										<CalendarIcon className="mr-2 h-4 w-4" />
										{date ? format(date, "PPP") : <span>Select a date</span>}
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-auto p-0">
									<Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
								</PopoverContent>
							</Popover>
						</div>

						<div className="space-y-2">
							<Label htmlFor="holidayName">Holiday Name</Label>
							<Input
								id="holidayName"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="e.g., Christmas Day"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="holidayType">Type</Label>
							<Select value={type} onValueChange={setType}>
								<SelectTrigger id="holidayType">
									<SelectValue placeholder="Select holiday type" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="full">Full Holiday</SelectItem>
									<SelectItem value="half">Half Holiday</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<Button type="submit" disabled={loading}>
						{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Add Holiday
					</Button>
				</form>

				<div>
					<h4 className="text-lg font-medium mb-4">Holidays List for {year}</h4>

					{loading ? (
						<div className="flex justify-center py-8">
							<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
						</div>
					) : holidays.length === 0 ? (
						<div className="bg-muted rounded-md p-4 text-center text-muted-foreground">
							No holidays added yet for {year}
						</div>
					) : calendarView ? (
						<div className="p-4 border rounded-md">
							<Calendar
								mode="multiple"
								selected={holidayDates}
								className="rounded-md border"
								disableNavigation
								styles={{
									day_selected: {
										backgroundColor: "var(--primary)",
										color: "white",
									},
								}}
							/>
							<div className="mt-4 space-y-2">
								{sortedHolidays.map((holiday) => (
									<div
										key={holiday.id}
										className="flex items-center justify-between p-2 border rounded-md"
									>
										<div className="flex items-center gap-2">
											<Badge variant={holiday.type === "full" ? "default" : "secondary"}>
												{format(new Date(holiday.date), "MMM d")}
											</Badge>
											<span>{holiday.name}</span>
										</div>
										<div className="flex items-center gap-2">
											<Badge variant="outline">{holiday.type === "full" ? "Full" : "Half"}</Badge>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => handleDeleteHoliday(holiday.id)}
											>
												<Trash2 className="h-4 w-4 text-destructive" />
											</Button>
										</div>
									</div>
								))}
							</div>
						</div>
					) : (
						<div className="rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Date</TableHead>
										<TableHead>Name</TableHead>
										<TableHead>Type</TableHead>
										<TableHead className="w-16">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{sortedHolidays.map((holiday) => (
										<TableRow key={holiday.id}>
											<TableCell>{format(new Date(holiday.date), "MMMM d, yyyy")}</TableCell>
											<TableCell>{holiday.name}</TableCell>
											<TableCell>
												<Badge variant={holiday.type === "full" ? "default" : "secondary"}>
													{holiday.type === "full" ? "Full Holiday" : "Half Holiday"}
												</Badge>
											</TableCell>
											<TableCell>
												<Button
													variant="ghost"
													size="icon"
													onClick={() => handleDeleteHoliday(holiday.id)}
												>
													<Trash2 className="h-4 w-4 text-destructive" />
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</div>
			</CardContent>

			<CardFooter className="text-sm text-muted-foreground">
				<div className="flex items-center gap-2">
					<Badge variant="default">Full Holiday</Badge>
					<Badge variant="secondary">Half Holiday</Badge>
				</div>
			</CardFooter>
		</Card>
	);
};

export default HolidayManager;
