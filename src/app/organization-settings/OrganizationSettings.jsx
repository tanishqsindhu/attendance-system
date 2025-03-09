import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Network, School, Boxes } from "lucide-react";

import DepartmentsTab from "./DepartmentsTab";
import PositionsTab from "./PositionsTab";
import BranchesTab from "./BranchesTab";
import ShiftSchedulesTab from "./ShiftSchedulesTab";

const OrganizationSettings = () => {
	const [activeTab, setActiveTab] = useState("branches");

	const tabItems = [
		{
			value: "branches",
			label: "Branches",
			icon: School,
		},
		{
			value: "departments",
			label: "Departments",
			icon: Boxes,
		},
		{
			value: "positions",
			label: "Positions",
			icon: Network,
		},
		{
			value: "shift-schedules",
			label: "Shift Schedules",
			icon: Clock,
		},
	];

	return (
		<div className="container mx-auto px-4 py-6">
			<Card>
				<CardContent className="p-0 ">
					<div className="flex flex-col">
						<div>
							<h1 className="text-xl font-semibold px-6 py-4">Organization Settings</h1>
						</div>

						<Tabs value={activeTab} className="max-w-full" onValueChange={setActiveTab}>
							<TabsList className="grid w-full grid-cols-4">
								{tabItems.map((tab) => (
									<TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:dark:bg-gray-700 data-[state=active]:shadow-sm">
										<tab.icon className="w-4 h-4" />
										<span className="hidden md:inline">{tab.label}</span>
									</TabsTrigger>
								))}
							</TabsList>

							{tabItems.map((tab) => (
								<TabsContent key={tab.value} value={tab.value} className="mt-4 px-6 pb-6">
									{tab.value === "departments" && <DepartmentsTab />}
									{tab.value === "positions" && <PositionsTab />}
									{tab.value === "branches" && <BranchesTab />}
									{tab.value === "shift-schedules" && <ShiftSchedulesTab />}
								</TabsContent>
							))}
						</Tabs>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

export default OrganizationSettings;
