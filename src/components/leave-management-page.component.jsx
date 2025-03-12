// app/leave-management/page.jsx
"use client";
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { EmployeeLeaveManagement } from "@/components/leave-management.component";
import { LeaveApplicationForm } from "@/components/leave-application-form.component";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { selectAllBranches } from "@/store/organization-settings/organization-settings.slice.js";

export default function LeaveManagementPage() {
	const dispatch = useDispatch();
	const branches = useSelector(selectAllBranches);
	const [selectedBranch, setSelectedBranch] = useState("");
	const [activeTab, setActiveTab] = useState("records");

	useEffect(() => {
		// Set first branch as default when branches load
		if (branches.length > 0 && !selectedBranch) {
			setSelectedBranch(branches[0].id);
		}
	}, [branches, selectedBranch]);

	return (
		<div className="container mx-auto py-8">
			<div className="space-y-6">
				<div className="flex justify-between items-center">
					<h1 className="text-4xl font-bold">Leave Management</h1>
					{branches.length > 0 && (
						<div className="w-64">
							<Select value={selectedBranch} onValueChange={setSelectedBranch}>
								<SelectTrigger>
									<SelectValue placeholder="Select branch" />
								</SelectTrigger>
								<SelectContent>
									{branches.map((branch) => (
										<SelectItem key={branch.id} value={branch.id}>
											{branch.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}
				</div>

				<Tabs value={activeTab} onValueChange={setActiveTab}>
					<TabsList className="grid w-full grid-cols-2 mb-6">
						<TabsTrigger value="records">Leave Records</TabsTrigger>
						<TabsTrigger value="apply">Apply for Leave</TabsTrigger>
					</TabsList>

					<TabsContent value="records">
						<Card>
							<CardHeader>
								<CardTitle>Employee Leave Records</CardTitle>
							</CardHeader>
							<CardContent>{selectedBranch ? <EmployeeLeaveManagement branchId={selectedBranch} /> : <div className="text-center p-8 text-muted-foreground">Please select a branch to view leave records.</div>}</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="apply">
						<Card>
							<CardHeader>
								<CardTitle>Apply for Employee Leave</CardTitle>
							</CardHeader>
							<CardContent>{selectedBranch ? <LeaveApplicationForm branchId={selectedBranch} /> : <div className="text-center p-8 text-muted-foreground">Please select a branch to apply for leave.</div>}</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
