"use client";

import * as React from "react";
import { ArrowUpDown, Download, MoreHorizontal, Plus, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/data-table.component";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams } from "react-router-dom";

// Custom Empty State Component
const CustomEmptyState = (
	<div className="flex flex-col items-center justify-center h-60 p-8">
		<div className="rounded-full bg-muted p-3 mb-3">
			<Trash className="h-6 w-6 text-muted-foreground" />
		</div>
		<h3 className="text-lg font-semibold">No payments found</h3>
		<p className="text-sm text-muted-foreground text-center mt-2 mb-4">
			No payments match your search criteria. Try adjusting your filters or create a new payment.
		</p>
		<Button size="sm">
			<Plus className="mr-2 h-4 w-4" />
			New Payment
		</Button>
	</div>
);

export default function EmployeesList() {
	// Sample payment data
	const data = [
		{
			id: "m5gr84gvavfi9",
			amount: 316,
			status: "success",
			email: "ken99@dawexample.com",
			date: "2023-11-05",
		},
		{
			id: "3u1reawdawuv4",
			amount: 242,
			status: "success",
			email: "Abe45@awdexample.com",
			date: "2023-11-03",
		},
		{
			id: "derv1wawds0",
			amount: 837,
			status: "processing",
			email: "Monserratafc44@example.com",
			date: "2023-11-01",
		},
		{
			id: "5kma5awd3ae",
			amount: 874,
			status: "success",
			email: "Silas22@eacwxample.com",
			date: "2023-10-29",
		},
		{
			id: "bhqecjawd4p",
			amount: 721,
			status: "failed",
			email: "caradwa@example.com",
			date: "2023-10-27",
		},
		{
			id: "m5grawd84i9",
			amount: 316,
			status: "success",
			email: "kedwadn99@example.com",
			date: "2023-11-05",
		},
		{
			id: "3u1readwuv4",
			amount: 242,
			status: "success",
			email: "Abadw5@example.com",
			date: "2023-11-03",
		},
		{
			id: "dervawd1ws0",
			amount: 837,
			status: "processing",
			email: "Mdawdrrat44@example.com",
			date: "2023-11-01",
		},
		{
			id: "5kma5awda3ae",
			amount: 874,
			status: "success",
			email: "Siladwad22@example.com",
			date: "2023-10-29",
		},
		{
			id: "bhqdwadecj4p",
			amount: 721,
			status: "failed",
			email: "cadwadlla@example.com",
			date: "2023-10-27",
		},
		{
			id: "m5grawda84i9",
			amount: 316,
			status: "success",
			email: "kdwa99@example.com",
			date: "2023-11-05",
		},
		{
			id: "3u1rawdaweuv4",
			amount: 242,
			status: "success",
			email: "Abe45@example.com",
			date: "2023-11-03",
		},
		{
			id: "dervwdada1ws0",
			amount: 837,
			status: "processing",
			email: "Mondawdaderrat44@example.com",
			date: "2023-11-01",
		},
		{
			id: "5kma5dawd3ae",
			amount: 874,
			status: "success",
			email: "Silasadawd22@example.com",
			date: "2023-10-29",
		},
		{
			id: "bhqecjawdawd4p",
			amount: 721,
			status: "failed",
			email: "carmesadwalla@example.com",
			date: "2023-10-27",
		},
	];

	// Status badge renderer (using the updated Badge component)
	const StatusBadge = ({ status }) => {
		// Now using the direct variant names from the updated Badge component
		return (
			<Badge variant={status == "failed" ? "destructive" : "outline"} className="capitalize w-23">
				{status}
			</Badge>
		);
	};

	// Column definitions for payment data
	const columns = [
		{
			id: "select",
			header: ({ table }) => (
				<Checkbox
					checked={
						table.getIsAllPageRowsSelected() ||
						(table.getIsSomePageRowsSelected() && "indeterminate")
					}
					onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
					aria-label="Select all"
				/>
			),
			cell: ({ row }) => (
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={(value) => row.toggleSelected(!!value)}
					aria-label="Select row"
					onClick={(e) => e.stopPropagation()} // Prevent row click when clicking checkbox
				/>
			),
			enableSorting: false,
			enableHiding: false,
		},
		{
			accessorKey: "status",
			header: "Status",
			cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
		},
		{
			accessorKey: "email",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Email
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				);
			},
			cell: ({ row }) => <div className="lowercase">{row.getValue("email")}</div>,
		},
		{
			accessorKey: "date",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Date
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				);
			},
			cell: ({ row }) => {
				// Format date
				const date = new Date(row.getValue("date"));
				const formatted = new Intl.DateTimeFormat("en-US", {
					year: "numeric",
					month: "short",
					day: "numeric",
				}).format(date);

				return <div>{formatted}</div>;
			},
		},
		{
			accessorKey: "amount",
			header: () => <div className="text-right">Amount</div>,
			cell: ({ row }) => {
				const amount = parseFloat(row.getValue("amount"));
				const formatted = new Intl.NumberFormat("en-IN", {
					style: "currency",
					currency: "INR",
				}).format(amount);

				return <div className="text-right font-medium">{formatted}</div>;
			},
		},
		{
			id: "actions",
			enableHiding: false,
			cell: ({ row }) => {
				const payment = row.original;

				return (
					<DropdownMenu>
						<DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
							<Button variant="ghost" className="h-8 w-8 p-0">
								<span className="sr-only">Open menu</span>
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel>Actions</DropdownMenuLabel>
							<DropdownMenuItem
								onClick={(e) => {
									e.stopPropagation();
									navigator.clipboard.writeText(payment.id);
									toast("Payment ID copied", {
										description: `ID ${payment.id} copied to clipboard`,
									});
								}}
							>
								Copy payment ID
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={(e) => e.stopPropagation()}>
								View customer
							</DropdownMenuItem>
							<DropdownMenuItem onClick={(e) => e.stopPropagation()}>
								View payment details
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				);
			},
		},
	];
	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!Object.values(formData).every((field) => field)) {
			alert("Please fill all fields");
			return;
		}
		toast("You submitted the following values:", {
			description: (
				<pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
					<code className="text-white">{JSON.stringify(data, null, 2)}</code>
				</pre>
			),
		});
		setLoading(true);
		const employeeData = await addEmployeeDetails(formData);
		alert(employeeData);
		setLoading(false);
	};

	// Table actions
	const tableActions = (
		<>
			<Button variant="outline" size="sm">
				<Download className="mr-2 h-4 w-4" />
				Export
			</Button>
			<Button size="sm">
				<Plus className="mr-2 h-4 w-4" />
				Add Payment
			</Button>
		</>
	);

	// Row click handler
	const handleRowClick = (rowData) => {
		console.log("Row clicked:", rowData);
		toast("Payment selected", {
			description: `You clicked on payment ID: ${rowData.id}`,
		});
	};

	// Custom row class handler
	const getRowClassName = (rowData) => {
		return rowData.status === "failed" ? "bg-red-50/50 dark:bg-red-900/20" : "";
	};

	const { category } = useParams();
	// const categoriesMap = useSelector(selectCategoriesMap);
	// const [products, setProducts] = useState(categoriesMap[category]);

	// useEffect(() => {
	// 	setProducts(categoriesMap[category]);
	// }, [category, categoriesMap]);

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle className="text-2xl">All Employees</CardTitle>
					{/* <CardDescription>Card Description</CardDescription> */}
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<DataTable
							data={data}
							columns={columns}
							filterableColumns={["email", "status", "date", "amount"]} // Multiple filterable columns
							filterPlaceholder="Filter..."
							pagination={true}
							initialPageSize={5}
							pageSizeOptions={[5, 10, 25, 50]}
							tableActions={tableActions}
							onRowClick={handleRowClick}
							getRowClassName={getRowClassName}
							emptyState={CustomEmptyState}
						/>
					</div>
				</CardContent>
				<CardFooter>
					<p>Card Footer</p>
				</CardFooter>
			</Card>
		</>
	);
}
