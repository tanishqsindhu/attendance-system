// src/components/organization/AddItemDialog.jsx
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

const AddItemDialog = ({ triggerText, children }) => {
	const [isOpen, setIsOpen] = React.useState(false);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button>{triggerText}</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{triggerText}</DialogTitle>
				</DialogHeader>
				{React.cloneElement(children, { onClose: () => setIsOpen(false) })}
			</DialogContent>
		</Dialog>
	);
};

export default AddItemDialog;
