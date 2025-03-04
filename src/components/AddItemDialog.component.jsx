"use client";

import React, { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const AddItemDialog = ({ triggerText, itemType, children }) => {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button>{triggerText}</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						Add New {itemType.slice(0, -1).charAt(0).toUpperCase() + itemType.slice(0, -1).slice(1)}
					</DialogTitle>
				</DialogHeader>
				{React.cloneElement(children, {
					onClose: () => setIsOpen(false),
					itemType,
				})}
			</DialogContent>
		</Dialog>
	);
};

export default AddItemDialog;
