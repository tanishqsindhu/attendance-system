import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import CustomShiftForm from "@/app/custom-shifts/custom-shift-form";
import CustomShiftsCalendar from "@/app/custom-shifts/custom-shifts-calendar";
import { fetchOrganizationSettings } from "@/store/orgaznization-settings/organization-settings.reducer";
import { selectActiveBranch } from "@/store/orgaznization-settings/organization-settings.selector";
import { fetchEmployeesByBranch } from "@/store/employees/employees.reducer";

const CustomShiftsPage = () => {
	const dispatch = useDispatch();
	const { branchId } = useSelector(selectActiveBranch);

	// Load necessary data when component mounts
	useEffect(() => {
		if (branchId) {
			dispatch(fetchEmployeesByBranch(branchId.id));
			dispatch(fetchOrganizationSettings(branchId.id));
		}
	}, [branchId, dispatch]);

	return (
		<div className="container mx-auto p-4">
			<h1 className="text-2xl font-bold mb-6">Custom Shifts Management</h1>

			<Tabs defaultValue="calendar" className="w-full">
				<TabsList className="mb-4">
					<TabsTrigger value="calendar">Calendar View</TabsTrigger>
					<TabsTrigger value="add">Add Custom Shift</TabsTrigger>
				</TabsList>

				<TabsContent value="calendar" className="space-y-4">
					<CustomShiftsCalendar />
				</TabsContent>

				<TabsContent value="add">
					<Card>
						<CardContent className="pt-6">
							<CustomShiftForm />
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
};

export default CustomShiftsPage;
