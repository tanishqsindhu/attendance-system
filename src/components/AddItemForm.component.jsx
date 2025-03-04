// src/components/organization/AddItemForm.jsx
"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDispatch } from "react-redux";
import { addOrganizationItem } from "@/store/orgaznization-settings/organization-settings.slice";

const AddItemForm = ({ itemType, onClose }) => {
	const dispatch = useDispatch();
	const [itemName, setItemName] = useState("");

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!itemName) return;

		await dispatch(addOrganizationItem({ itemType, newItem: itemName }));
		setItemName("");
		onClose(); // Close the dialog after submission
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<Input
				value={itemName}
				onChange={(e) => setItemName(e.target.value)}
				placeholder={`Enter ${itemType} name`}
			/>
			<div className="flex justify-end gap-2">
				<Button type="button" variant="outline" onClick={onClose}>
					Cancel
				</Button>
				<Button type="submit">Add</Button>
			</div>
		</form>
	);
};

export default AddItemForm;
