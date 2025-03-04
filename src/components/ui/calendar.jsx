import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

function Calendar({ className, classNames, showOutsideDays = true, fromYear, toYear, ...props }) {
	const [displayDate, setDisplayDate] = useState(new Date());

	const months = [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December",
	];

	// Determine year range
	const defaultFromYear = fromYear || displayDate.getFullYear() - 10;
	const defaultToYear = toYear || displayDate.getFullYear() + 10;

	const years = useMemo(
		() =>
			Array.from({ length: defaultToYear - defaultFromYear + 1 }, (_, i) => defaultFromYear + i),
		[defaultFromYear, defaultToYear]
	);

	const handleMonthChange = (newMonth) => {
		const monthIndex = months.indexOf(newMonth);
		const newDate = new Date(displayDate.getFullYear(), monthIndex, 1);
		setDisplayDate(newDate);
	};

	const handleYearChange = (newYear) => {
		const newDate = new Date(parseInt(newYear), displayDate.getMonth(), 1);
		setDisplayDate(newDate);
	};

	const navigateMonth = (direction) => {
		const newDate = new Date(displayDate);
		newDate.setMonth(newDate.getMonth() + direction);
		setDisplayDate(newDate);
	};

	const navigateYear = (direction) => {
		const newDate = new Date(displayDate);
		newDate.setFullYear(newDate.getFullYear() + direction);
		setDisplayDate(newDate);
	};

	return (
		<div className="flex flex-col items-center">
			<DayPicker
				month={displayDate}
				onMonthChange={setDisplayDate}
				showOutsideDays={showOutsideDays}
				className={cn("p-3 w-full max-w-md", className)}
				classNames={{
					months: "flex flex-col items-center",
					month: "flex flex-col gap-4 w-full",
					caption: "flex justify-center pt-1 relative items-center w-full",
					caption_label: "text-sm font-medium flex items-center justify-center gap-2",
					table: "w-full border-collapse space-x-1",
					head_row: "flex justify-center",
					head_cell:
						"text-neutral-500 rounded-md w-8 font-normal text-[0.8rem] dark:text-neutral-400 text-center",
					row: "flex justify-center w-full mt-2",
					cell: cn(
						"relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-neutral-100 dark:[&:has([aria-selected])]:bg-neutral-800",
						props.mode === "range"
							? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
							: "[&:has([aria-selected])]:rounded-md"
					),
					day: cn(
						buttonVariants({ variant: "ghost" }),
						"size-8 p-0 font-normal aria-selected:opacity-100"
					),
					day_range_start:
						"day-range-start aria-selected:bg-neutral-900 aria-selected:text-neutral-50 dark:aria-selected:bg-neutral-50 dark:aria-selected:text-neutral-900",
					day_range_end:
						"day-range-end aria-selected:bg-neutral-900 aria-selected:text-neutral-50 dark:aria-selected:bg-neutral-50 dark:aria-selected:text-neutral-900",
					day_selected:
						"bg-neutral-900 text-neutral-50 hover:bg-neutral-900 hover:text-neutral-50 focus:bg-neutral-900 focus:text-neutral-50 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-50 dark:hover:text-neutral-900 dark:focus:bg-neutral-50 dark:focus:text-neutral-900",
					day_today: "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50",
					day_outside:
						"day-outside text-neutral-500 aria-selected:text-neutral-500 dark:text-neutral-400 dark:aria-selected:text-neutral-400",
					day_disabled: "text-neutral-500 opacity-50 dark:text-neutral-400",
					day_range_middle:
						"aria-selected:bg-neutral-100 aria-selected:text-neutral-900 dark:aria-selected:bg-neutral-800 dark:aria-selected:text-neutral-50",
					day_hidden: "invisible",
					...classNames,
				}}
				components={{
					Caption: ({ label }) => {
						const currentMonth = months[displayDate.getMonth()];
						const currentYear = displayDate.getFullYear().toString();

						return (
							<div className="flex items-center justify-center gap-2 mb-4">
								{/* Year Navigation */}
								<button
									type="button"
									onClick={() => navigateYear(-1)}
									className={cn(
										buttonVariants({ variant: "outline" }),
										"size-8 p-0 opacity-50 hover:opacity-100"
									)}
								>
									<ChevronLeft className="size-4" />
								</button>

								{/* Month Select */}
								<Select value={currentMonth} onValueChange={handleMonthChange}>
									<SelectTrigger className="w-[120px]">
										<SelectValue placeholder={currentMonth} />
									</SelectTrigger>
									<SelectContent>
										{months.map((m) => (
											<SelectItem key={m} value={m}>
												{m}
											</SelectItem>
										))}
									</SelectContent>
								</Select>

								{/* Year Select */}
								<Select value={currentYear} onValueChange={handleYearChange}>
									<SelectTrigger className="w-[100px]">
										<SelectValue placeholder={currentYear} />
									</SelectTrigger>
									<SelectContent>
										{years.map((y) => (
											<SelectItem key={y} value={y.toString()}>
												{y}
											</SelectItem>
										))}
									</SelectContent>
								</Select>

								{/* Year Navigation */}
								<button
									type="button"
									onClick={() => navigateYear(1)}
									className={cn(
										buttonVariants({ variant: "outline" }),
										"size-8 p-0 opacity-50 hover:opacity-100"
									)}
								>
									<ChevronRight className="size-4" />
								</button>
							</div>
						);
					},
					// Navigation for months at the bottom
					nav: ({ showPrevButton, showNextButton }) => (
						<div className="flex items-center justify-center gap-4 mt-4 w-full">
							{showPrevButton && (
								<button
									type="button"
									onClick={() => navigateMonth(-1)}
									className={cn(
										buttonVariants({ variant: "outline" }),
										"size-10 p-0 opacity-50 hover:opacity-100"
									)}
								>
									<ChevronLeft className="size-6" />
								</button>
							)}
							{showNextButton && (
								<button
									type="button"
									onClick={() => navigateMonth(1)}
									className={cn(
										buttonVariants({ variant: "outline" }),
										"size-10 p-0 opacity-50 hover:opacity-100"
									)}
								>
									<ChevronRight className="size-6" />
								</button>
							)}
						</div>
					),
				}}
				{...props}
			/>
		</div>
	);
}

export { Calendar };
