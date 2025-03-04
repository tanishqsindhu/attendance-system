import { useState } from "react";
import { useSelector } from "react-redux";
import { selectAllBranches } from "./store/orgaznization-settings/organization-settings.slice";
import { selectCurrentUser } from "./store/user/user.selector";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
} from "@/components/ui/form";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";

export default function AttendanceUpload() {
	const [file, setFile] = useState(null);
	const [isLoading, setIsLoading] = useState(false);

	// Get data from Redux store
	const branches = useSelector(selectAllBranches);
	const currentUser = useSelector(selectCurrentUser);

	// Filter branches based on user roles
	const allowedBranches = branches.filter(
		(branch) => currentUser.roles.includes(branch.id) || currentUser.roles.includes("bothBranches")
	);

	// Generate year options for the select dropdown
	const currentYear = new Date().getFullYear();
	const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

	// Generate month options for the select dropdown
	const monthOptions = Array.from({ length: 12 }, (_, i) => ({
		value: (i + 1).toString(),
		label: new Date(0, i).toLocaleString("default", { month: "long" }),
	}));

	// Setup form with react-hook-form
	const form = useForm({
		defaultValues: {
			branchId: "",
			year: currentYear.toString(),
			month: (new Date().getMonth() + 1).toString(),
			forceOverwrite: false,
		},
	});

	const handleFileChange = (e) => {
		setFile(e.target.files[0]);
	};

	const onSubmit = async (formData) => {
		setIsLoading(true);

		if (!formData.branchId || !file) {
			toast("Missing Fields", {
				description: "Please select a branch and upload a file.",
				variant: "destructive",
			});
			setIsLoading(false); // Important: Reset loading state when validation fails
			return;
		}

		try {
			const reader = new FileReader();

			// Set up the onload handler before calling readAsText
			reader.onload = async (event) => {
				try {
					// Nested try/catch to handle errors in the async onload handler
					const fileContent = event.target.result;
					const monthYear = `${formData.month.padStart(2, "0")}-${formData.year}`;
					const payload = {
						branchId: formData.branchId,
						monthYear,
						forceOverwrite: formData.forceOverwrite,
					};

					// Step 1: Check if attendance already exists
					let checkResponse = await fetch("/.netlify/functions/upload-attendance", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ formData: payload, checkOnly: true }),
					});

					// Step 2: Handle existing attendance
					if (checkResponse.status === 409 && !formData.forceOverwrite) {
						const confirmOverwrite = window.confirm(
							`Attendance data for ${monthYear} already exists.\nDo you want to overwrite it?`
						);
						if (!confirmOverwrite) {
							setIsLoading(false);
							return;
						}
						payload.forceOverwrite = true;
					}

					// Step 3: Upload attendance data
					const uploadResponse = await fetch("/.netlify/functions/upload-attendance", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ fileContent, formData: payload }),
					});

					const result = await uploadResponse.json();
					if (!uploadResponse.ok) {
						throw new Error(result.message || "Failed to upload attendance.");
					}

					toast("Success", {
						description: "Attendance uploaded successfully.",
					});
					form.reset();
					// Reset file input
					setFile(null);
				} catch (error) {
					console.error("Upload failed:", error);
					toast("Error", {
						description: error.message || "Error uploading file.",
						variant: "destructive",
					});
				} finally {
					setIsLoading(false);
				}
			};

			// Handle FileReader errors
			reader.onerror = () => {
				toast("Error", {
					description: "Failed to read the file. Please try again.",
					variant: "destructive",
				});
				setIsLoading(false);
			};

			// Start reading the file
			reader.readAsText(file);
		} catch (error) {
			// This catch block handles errors that occur before/during setting up the FileReader
			console.error("Upload setup failed:", error);
			toast("Error", {
				description: error.message || "Error setting up file upload.",
				variant: "destructive",
			});
			setIsLoading(false);
		}
	};

	return (
		<Card className="max-w-lg mx-auto mt-10">
			<CardHeader>
				<CardTitle>Upload Attendance File</CardTitle>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						<FormField
							control={form.control}
							name="branchId"
							render={({ field }) => (
								<FormItem>
									<FormLabel>School Branch</FormLabel>
									<Select onValueChange={field.onChange} defaultValue={field.value}>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select a branch" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{allowedBranches.map((branch) => (
												<SelectItem key={branch.id} value={branch.id}>
													{branch.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="year"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Year</FormLabel>
									<Select onValueChange={field.onChange} defaultValue={field.value}>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select year" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{yearOptions.map((year) => (
												<SelectItem key={year} value={year.toString()}>
													{year}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="month"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Month</FormLabel>
									<Select onValueChange={field.onChange} defaultValue={field.value}>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select month" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{monthOptions.map((month) => (
												<SelectItem key={month.value} value={month.value}>
													{month.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</FormItem>
							)}
						/>

						<FormItem>
							<FormLabel>Upload Biometric File</FormLabel>
							<Input
								type="file"
								accept=".txt,.csv"
								onChange={handleFileChange}
								className="cursor-pointer"
							/>
						</FormItem>

						<FormField
							control={form.control}
							name="forceOverwrite"
							render={({ field }) => (
								<FormItem className="flex flex-row items-start space-x-3 space-y-0">
									<FormControl>
										<Checkbox
											checked={field.value}
											onCheckedChange={field.onChange}
											id="forceOverwrite"
										/>
									</FormControl>
									<div className="space-y-1 leading-none">
										<FormLabel htmlFor="forceOverwrite">Force Overwrite (if exists)</FormLabel>
										<FormDescription>
											Automatically overwrite existing attendance data without confirmation
										</FormDescription>
									</div>
								</FormItem>
							)}
						/>

						<Button type="submit" className="w-full" disabled={isLoading}>
							{isLoading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Uploading...
								</>
							) : (
								"Submit"
							)}
						</Button>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}
