// components/EditEmployeeModal.js
"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import EmployeeAddForm from "@/components/empoyee-form.component";

export function EditEmployeeModal({ isOpen, onClose, employeeData }) {
	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogTitle>Edit Employee Details</DialogTitle>
			<DialogContent className="max-w-5xl w-full max-h-[95vh] overflow-y-auto rounded">
				<EmployeeAddForm mode="edit" initialValues={employeeData} onSuccess={onClose} />
			</DialogContent>
		</Dialog>
	);
}
