import EmployeeForm from "@/components/empoyee-form.component";

export default function EmployeeAdd() {
	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
			<EmployeeForm mode="add" />
		</div>
	);
}
