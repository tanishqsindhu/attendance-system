"use client";

import * as React from "react";
import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, ChevronLeft, ChevronRight, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export function DataTable({
	data,
	columns,
	// Filtering
	filterableColumns = [],
	filterPlaceholder = "Filter...",
	// Pagination
	pagination = true,
	initialPageSize = 10,
	pageSizeOptions = [5, 10, 20, 50, 100],
	// Actions
	tableActions = null,
	// Row interactions
	onRowClick = null,
	getRowClassName = null,
	// Custom components
	emptyState = null,
}) {
	const [sorting, setSorting] = React.useState([]);
	const [columnFilters, setColumnFilters] = React.useState([]);
	const [columnVisibility, setColumnVisibility] = React.useState({});
	const [rowSelection, setRowSelection] = React.useState({});
	const [pageSize, setPageSize] = React.useState(initialPageSize);
	const [pageIndex, setPageIndex] = React.useState(0);
	const [activeFilterColumn, setActiveFilterColumn] = React.useState(
		filterableColumns.length > 0 ? filterableColumns[0] : null
	);
	const [filterValue, setFilterValue] = React.useState("");

	const table = useReactTable({
		data,
		columns,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: pagination ? getPaginationRowModel() : undefined,
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onColumnVisibilityChange: setColumnVisibility,
		onRowSelectionChange: setRowSelection,
		state: {
			sorting,
			columnFilters,
			columnVisibility,
			rowSelection,
			pagination: pagination
				? {
						pageSize,
						pageIndex,
				  }
				: undefined,
		},
		onPaginationChange: pagination
			? (updater) => {
					const newState =
						typeof updater === "function" ? updater({ pageIndex, pageSize }) : updater;
					setPageIndex(newState.pageIndex);
					setPageSize(newState.pageSize);
			  }
			: undefined,
	});

	// Update pagination when page size changes
	React.useEffect(() => {
		if (pagination) {
			table.setPageSize(pageSize);
		}
	}, [pagination, pageSize, table]);

	// Update filter when activeFilterColumn or filterValue changes
	React.useEffect(() => {
		if (activeFilterColumn) {
			// Clear any existing filters first
			table.getColumn(activeFilterColumn)?.setFilterValue(filterValue);
		}
	}, [activeFilterColumn, filterValue, table]);

	// Handle filter value change
	const handleFilterChange = (event) => {
		setFilterValue(event.target.value);
	};

	// Default empty state component if none provided
	const defaultEmptyState = (
		<TableRow>
			<TableCell colSpan={columns.length} className="h-24 text-center">
				No results found.
			</TableCell>
		</TableRow>
	);

	// Handle row click
	const handleRowClick = (row) => {
		if (onRowClick) {
			onRowClick(row.original, row);
		}
	};

	return (
		<div className="w-full">
			<div className="flex items-center justify-between py-4">
				<div className="flex items-center gap-2">
					{filterableColumns.length > 0 && (
						<div className="flex items-center gap-2">
							<Select value={activeFilterColumn} onValueChange={setActiveFilterColumn}>
								<SelectTrigger className="h-9 w-[180px]">
									<SelectValue placeholder="Select column">
										{activeFilterColumn &&
											activeFilterColumn.charAt(0).toUpperCase() + activeFilterColumn.slice(1)}
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{filterableColumns.map((column) => (
										<SelectItem key={column} value={column}>
											{column.charAt(0).toUpperCase() + column.slice(1)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<div className="relative">
								<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder={filterPlaceholder}
									value={filterValue}
									onChange={handleFilterChange}
									className="pl-8 max-w-sm"
								/>
							</div>
						</div>
					)}
				</div>
				<div className="flex items-center gap-2">
					{tableActions && <div className="flex items-center gap-2">{tableActions}</div>}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" className="ml-auto">
								Columns <ChevronDown className="ml-2 h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							{table
								.getAllColumns()
								.filter((column) => column.getCanHide())
								.map((column) => {
									return (
										<DropdownMenuCheckboxItem
											key={column.id}
											className="capitalize"
											checked={column.getIsVisible()}
											onCheckedChange={(value) => column.toggleVisibility(!!value)}
										>
											{column.id}
										</DropdownMenuCheckboxItem>
									);
								})}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									return (
										<TableHead key={header.id}>
											{header.isPlaceholder
												? null
												: flexRender(header.column.columnDef.header, header.getContext())}
										</TableHead>
									);
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length
							? table.getRowModel().rows.map((row) => (
									<TableRow
										key={row.id}
										data-state={row.getIsSelected() && "selected"}
										className={getRowClassName ? getRowClassName(row.original, row) : ""}
										onClick={() => handleRowClick(row)}
										style={{ cursor: onRowClick ? "pointer" : "default" }}
									>
										{row.getVisibleCells().map((cell) => (
											<TableCell key={cell.id}>
												{flexRender(cell.column.columnDef.cell, cell.getContext())}
											</TableCell>
										))}
									</TableRow>
							  ))
							: emptyState || defaultEmptyState}
					</TableBody>
				</Table>
			</div>
			{pagination && (
				<div className="flex items-center justify-between space-x-2 py-4">
					<div className="flex items-center gap-2">
						<span className="text-sm text-muted-foreground">Rows per page</span>
						<Select
							value={pageSize.toString()}
							onValueChange={(value) => {
								setPageSize(Number(value));
								setPageIndex(0); // Reset to first page when changing page size
							}}
						>
							<SelectTrigger className="h-8 w-16">
								<SelectValue placeholder={pageSize} />
							</SelectTrigger>
							<SelectContent>
								{pageSizeOptions.map((size) => (
									<SelectItem key={size} value={size.toString()}>
										{size}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="flex-1 text-sm text-muted-foreground">
						{table.getFilteredSelectedRowModel().rows.length} of{" "}
						{table.getFilteredRowModel().rows.length} row(s) selected.
					</div>
					<div className="flex items-center space-x-6">
						<div className="text-sm text-muted-foreground">
							Page {pageIndex + 1} of {table.getPageCount() || 1}
						</div>
						<div className="flex items-center space-x-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => table.previousPage()}
								disabled={!table.getCanPreviousPage()}
							>
								<ChevronLeft className="h-4 w-4" />
								<span className="sr-only">Previous page</span>
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => table.nextPage()}
								disabled={!table.getCanNextPage()}
							>
								<ChevronRight className="h-4 w-4" />
								<span className="sr-only">Next page</span>
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
