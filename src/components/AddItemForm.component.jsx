"use client";

import React from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDispatch } from "react-redux";
import { addOrganizationItem, updateOrganizationItem } from "@/store/organization-settings/organization-settings.slice.js";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";

// Zod schema for form validation
const formSchema = z.object({
	name: z.string().min(2, { message: "Name must be at least 2 characters long" }).max(50, { message: "Name must be less than 50 characters" }).trim(),
});

const AddItemForm = ({ itemType, initialData = null, mode = "add", onClose, onSuccess }) => {
	const dispatch = useDispatch();

	// Initialize form with zod resolver
	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: initialData?.name || "",
		},
	});

	const handleSubmit = async (values) => {
		try {
			let result;

			if (mode === "add") {
				result = await dispatch(
					addOrganizationItem({
						itemType,
						newItem: values.name,
					})
				).unwrap();
			} else {
				result = await dispatch(
					updateOrganizationItem({
						itemType,
						itemId: initialData.id,
						updatedItem: values,
					})
				).unwrap();
			}

			// Success toast
			toast(mode === "add" ? "Item Added" : "Item Updated", {
				description: `${itemType} has been successfully ${mode === "add" ? "added" : "updated"}.`,
			});

			// Reset form and close dialog
			form.reset();
			onClose && onClose();
			onSuccess && onSuccess(result);
		} catch (error) {
			// Error toast
			toast("Error", {
				description: error.message,
				variant: "destructive",
			});
		}
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								{mode === "add" ? "Add" : "Edit"} {itemType.slice(0, -1)} Name
							</FormLabel>
							<FormControl>
								<Input placeholder={`Enter ${itemType.slice(0, -1)} name`} {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="flex justify-end gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={() => {
							form.reset();
							onClose && onClose();
						}}
					>
						Cancel
					</Button>
					<Button type="submit">{mode === "add" ? "Add" : "Update"}</Button>
				</div>
			</form>
		</Form>
	);
};

export default AddItemForm;
