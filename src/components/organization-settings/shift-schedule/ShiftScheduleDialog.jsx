import { useState, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { selectShiftScheduleById, removeShiftScheduleDateOverride, removeShiftScheduleDayOverride } from "@/store/organization-settings/organization-settings.slice.js";
import ShiftScheduleForm from "@/components/organization-settings/shift-schedule/AddShiftScheduleForm.component";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertCircle, MoreHorizontal, Trash2, Edit, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table.component";

const ShiftScheduleDialog = ({ scheduleId, triggerText = "View", editState = false, variantType = "outline" }) => {
	const dispatch = useDispatch();
	const [isEditing, setIsEditing] = useState(editState);
	const [activeTab, setActiveTab] = useState("general");
	const schedule = useSelector((state) => selectShiftScheduleById(state, scheduleId));

	const handleRemoveDateOverride = (date) => {
		dispatch(
			removeShiftScheduleDateOverride({
				scheduleId,
				date,
			})
		);
	};

	// Sort days and map them to Badge components
	const sortAndRenderDayBadges = (days) => {
		const dayOrder = {
			Sunday: 0,
			Monday: 1,
			Tuesday: 2,
			Wednesday: 3,
			Thursday: 4,
			Friday: 5,
			Saturday: 6,
		};

		return [...days]
			.sort((a, b) => dayOrder[a] - dayOrder[b])
			.map((day) => (
				<Badge key={day} variant="outline" className="mr-1">
					{day}
				</Badge>
			));
	};

	const handleRemoveDayOverride = (day) => {
		dispatch(
			removeShiftScheduleDayOverride({
				scheduleId,
				day,
			})
		);
	};

	// Day ordering map for sorting
	const dayOrder = {
		Monday: 1,
		Tuesday: 2,
		Wednesday: 3,
		Thursday: 4,
		Friday: 5,
		Saturday: 6,
		Sunday: 7,
	};

	// Reusable SortableHeader component for both tables
	const SortableHeader = ({ column, title }) => {
		return (
			<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
				{title}
				{column.getIsSorted() === "asc" ? <ArrowUp className=" h-4 w-4" /> : column.getIsSorted() === "desc" ? <ArrowDown className=" h-4 w-4" /> : <ArrowUpDown className=" h-4 w-4" />}
			</Button>
		);
	};

	// Define columns for day overrides table
	const dayOverrideColumns = useMemo(
		() => [
			{
				accessorKey: "day",
				header: ({ column }) => <SortableHeader column={column} title="Day" />,
				cell: ({ row }) => <span className="font-medium px-3">{row.original.day}</span>,
				sortingFn: (rowA, rowB) => {
					return dayOrder[rowA.original.day] - dayOrder[rowB.original.day];
				},
			},
			{
				accessorKey: "description",
				header: ({ column }) => <SortableHeader column={column} title="Description" />,
				cell: ({ row }) => <div className="px-3">{row.getValue("description")}</div>,
			},
			{
				accessorKey: "start",
				header: ({ column }) => <SortableHeader column={column} title="Start Time" />,
				cell: ({ row }) => <div className="px-3">{row.getValue("start")}</div>,
			},
			{
				accessorKey: "end",
				header: ({ column }) => <SortableHeader column={column} title="End Time" />,
				cell: ({ row }) => <div className="px-3">{row.getValue("end")}</div>,
			},
			{
				accessorKey: "isWorkDay",
				header: ({ column }) => <SortableHeader column={column} title="Is Work Day" />,
				cell: ({ row }) => (
					<div className="px-3">
						<Badge variant={row.original.isWorkDay ? "success" : "destructive"}>{row.original.isWorkDay ? "Yes" : "No"}</Badge>
					</div>
				),
			},
			{
				id: "actions",
				cell: ({ row }) => (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="h-8 w-8">
								<MoreHorizontal className="h-4 w-4" />
								<span className="sr-only">Open menu</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleRemoveDayOverride(row.original.day)}>
								<Trash2 className="mr-2 h-4 w-4" /> Remove Override
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				),
			},
		],
		[handleRemoveDayOverride]
	);

	// Define columns for date overrides table
	const dateOverrideColumns = useMemo(
		() => [
			{
				accessorKey: "date",
				header: ({ column }) => <SortableHeader column={column} title="Date" />,
				cell: ({ row }) => <span className="font-medium px-3">{row.original.date}</span>,
				sortingFn: (rowA, rowB) => {
					// Convert to Date objects for sorting
					const dateA = new Date(rowA.original.date);
					const dateB = new Date(rowB.original.date);
					// Compare dates
					return dateB - dateA;
				},
			},
			{
				accessorKey: "description",
				header: ({ column }) => <SortableHeader column={column} title="Description" />,
				cell: ({ row }) => <div className="px-3">{row.getValue("description")}</div>,
			},
			{
				accessorKey: "start",
				header: ({ column }) => <SortableHeader column={column} title="Start Time" />,
				cell: ({ row }) => <div className="px-3">{row.getValue("start")}</div>,
			},
			{
				accessorKey: "end",
				header: ({ column }) => <SortableHeader column={column} title="End Time" />,
				cell: ({ row }) => <div className="px-3">{row.getValue("end")}</div>,
			},
			{
				accessorKey: "isWorkDay",
				header: ({ column }) => <SortableHeader column={column} title="Is Work Day" />,
				cell: ({ row }) => (
					<div className="px-3">
						<Badge variant={row.original.isWorkDay ? "success" : "destructive"}>{row.original.isWorkDay ? "Yes" : "No"}</Badge>
					</div>
				),
			},
			{
				id: "actions",
				cell: ({ row }) => (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="h-8 w-8">
								<MoreHorizontal className="h-4 w-4" />
								<span className="sr-only">Open menu</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleRemoveDateOverride(row.original.date)}>
								<Trash2 className="mr-2 h-4 w-4" /> Remove Override
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				),
			},
		],
		[handleRemoveDateOverride]
	);

	// Transform day overrides object to array for DataTable
	const dayOverridesData = useMemo(() => {
		if (!schedule?.dayOverrides) return [];
		return Object.entries(schedule.dayOverrides).map(([day, override]) => ({
			day,
			...override,
		}));
	}, [schedule?.dayOverrides]);

	// Transform date overrides object to array for DataTable
	const dateOverridesData = useMemo(() => {
		if (!schedule?.dateOverrides) return [];
		return Object.entries(schedule.dateOverrides).map(([date, override]) => ({
			date,
			...override,
		}));
	}, [schedule?.dateOverrides]);

	// Initial sorting state for day overrides (ascending order by day)
	const initialDaySorting = useMemo(
		() => [
			{
				id: "day",
				desc: false,
			},
		],
		[]
	);

	// Initial sorting state for date overrides (descending order by date)
	const initialDateSorting = useMemo(
		() => [
			{
				id: "date",
				desc: false, // true for descending order
			},
		],
		[]
	);

	// Custom empty state components
	const dayOverridesEmptyState = (
		<Alert>
			<AlertCircle className="h-4 w-4 mr-2" />
			<AlertDescription>No day overrides exist for this shift schedule.</AlertDescription>
		</Alert>
	);

	const dateOverridesEmptyState = (
		<Alert>
			<AlertCircle className="h-4 w-4 mr-2" />
			<AlertDescription>No date overrides exist for this shift schedule.</AlertDescription>
		</Alert>
	);

	if (!schedule) return null;

	return (
		<Dialog style="max-width:3rem !important">
			<DialogTrigger asChild>
				<Button variant={variantType} size="sm">
					{triggerText}
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>{isEditing ? "Edit Shift Schedule" : schedule.name}</DialogTitle>
				</DialogHeader>

				{isEditing ? (
					<ShiftScheduleForm scheduleId={schedule.id} scheduleData={schedule} onClose={() => setIsEditing(false)} />
				) : (
					<div className="space-y-4">
						<Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="max-w-full">
							<TabsList className="grid w-full grid-cols-3">
								<TabsTrigger value="general">General Info</TabsTrigger>
								<TabsTrigger value="dayOverrides">Day Overrides</TabsTrigger>
								<TabsTrigger value="dateOverrides">Date Overrides</TabsTrigger>
							</TabsList>

							<TabsContent value="general" className="mt-4">
								<Card>
									<CardContent className="pt-6">
										<dl className="grid grid-cols-2 gap-4">
											<div>
												<dt className="text-sm font-medium text-gray-500">Shift ID</dt>
												<dd className="mt-1 text-sm">{schedule.id}</dd>
											</div>
											<div>
												<dt className="text-sm font-medium text-gray-500">Schedule Name</dt>
												<dd className="mt-1 text-sm">{schedule.name}</dd>
											</div>
											<div>
												<dt className="text-sm font-medium text-gray-500">Start Time</dt>
												<dd className="mt-1 text-sm">{schedule.startTime}</dd>
											</div>
											<div>
												<dt className="text-sm font-medium text-gray-500">End Time</dt>
												<dd className="mt-1 text-sm">{schedule.endTime}</dd>
											</div>
											<div className="col-span-2">
												<dt className="text-sm font-medium text-gray-500">Working Days</dt>
												<dd className="mt-1 text-sm flex flex-wrap gap-1">{sortAndRenderDayBadges(schedule.days)}</dd>
											</div>
											{schedule.flexibleTime?.enabled && (
												<div className="col-span-2">
													<dt className="text-sm font-medium text-gray-500">Flexible Time</dt>
													<dd className="mt-1 text-sm">
														<Badge variant="secondary">{schedule.flexibleTime.graceMinutes} minutes grace period</Badge>
													</dd>
												</div>
											)}
										</dl>
									</CardContent>
								</Card>
							</TabsContent>

							<TabsContent value="dayOverrides" className="mt-4">
								{!dayOverridesData.length ? (
									dayOverridesEmptyState
								) : (
									<DataTable
										className=""
										data={dayOverridesData}
										columns={dayOverrideColumns}
										pagination={false}
										initialPageSize={5}
										pageSizeOptions={[5, 10, 20]}
										filterableColumns={["day", "description"]}
										filterPlaceholder="Filter day overrides..."
										emptyState={dayOverridesEmptyState}
										initialSorting={initialDaySorting}
									/>
								)}
							</TabsContent>

							<TabsContent value="dateOverrides" className="mt-4">
								{!dateOverridesData.length ? (
									dateOverridesEmptyState
								) : (
									<DataTable
										data={dateOverridesData}
										columns={dateOverrideColumns}
										pagination={true}
										initialPageSize={5}
										pageSizeOptions={[5, 10, 20]}
										filterableColumns={["date", "description"]}
										filterPlaceholder="Filter date overrides..."
										emptyState={dateOverridesEmptyState}
										initialSorting={initialDateSorting}
									/>
								)}
							</TabsContent>
						</Tabs>

						<DialogFooter>
							<Button className="w-full" onClick={() => setIsEditing(true)}>
								<Edit className="mr-2 h-4 w-4" /> Edit Schedule
							</Button>
						</DialogFooter>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
};

export default ShiftScheduleDialog;
