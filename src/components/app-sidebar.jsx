import * as React from "react";
import { useSelector } from "react-redux";

import { BookOpen, Users, Settings2, LogIn, CalendarCheck } from "lucide-react";

import sisLogoUrl from "@/assets/scottish white Logo.png?url";
import sisLogoColorUrl from "@/assets/scottish logo.svg?url";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";
import { selectCurrentUser } from "@/store/user/user.selector";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { selectAllBranches } from "@/store/organization-settings/organization-settings.slice";

export function AppSidebar({ ...props }) {
	const branches = useSelector(selectAllBranches);
	const currentUser = useSelector(selectCurrentUser);
	const teams = branches.map((branch) => ({
		name: "Scottish Internatioinal School",
		logo: sisLogoUrl,
		plan: branch.name,
		id: branch.id,
		alternateLogo: sisLogoColorUrl,
	}));
	// This is sample data.
	const data = {
		user: {
			name: `${currentUser ? currentUser.fullName : "Not Signed In"}`,
			email: `${currentUser ? currentUser.email : "example@email.com"}`,
			avatar: `${currentUser ? currentUser.imageUrl : "/avatars/shadcn.jpg"}`,
		},
		teams,
		navMain: [
			{
				title: "Employees",
				url: "/employees",
				icon: Users,
				isActive: true,
				items: [
					{
						title: "Employees List",
						url: "/employees",
					},
					{
						title: "Add Employee",
						url: "/employees/add",
					},
				],
			},
			{
				title: "Attendance",
				url: "#",
				icon: CalendarCheck,
				items: [
					{
						title: "Process Data",
						url: "/employees/attendance-process",
					},
					{
						title: "Upload Attendance",
						url: "/employees/upload-data",
					},
					{
						title: "Leaves",
						url: "/employees/leaves",
					},
					{
						title: "Holidays Manager",
						url: "/settings/holiday-manager",
					},
				],
			},
			{
				title: "Documentation",
				url: "#",
				icon: BookOpen,
				items: [
					{
						title: "Introduction",
						url: "#",
					},
					{
						title: "Get Started",
						url: "#",
					},
					{
						title: "Tutorials",
						url: "#",
					},
					{
						title: "Changelog",
						url: "#",
					},
				],
			},
			{
				title: "Settings",
				url: "#",
				icon: Settings2,
				items: [
					{
						title: "General",
						url: "/settings",
					},
					// {
					// 	title: "Branches",
					// 	url: "/settings/branches",
					// },
					// {
					// 	title: "Department",
					// 	url: "/settings/department",
					// },
					// {
					// 	title: "Positions",
					// 	url: "/settings/positions",
					// },
					// {
					// 	title: "Shift Schedule",
					// 	url: "/settings/shift-schedule",
					// },
					{
						title: "Attendance Rules",
						url: "/settings/attendance-rules",
					},
				],
			},
		],
		// projects: [
		//   {
		//     name: "Design Engineering",
		//     url: "#",
		//     icon: Frame,
		//   },
		//   {
		//     name: "Sales & Marketing",
		//     url: "#",
		//     icon: PieChart,
		//   },
		//   {
		//     name: "Travel",
		//     url: "#",
		//     icon: Map,
		//   },
		// ],
	};

	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader>{data.teams.length > 0 && currentUser ? <TeamSwitcher teams={data.teams} /> : ""}</SidebarHeader>
			<SidebarContent>
				<NavMain items={data.navMain} />
				{/* <NavProjects projects={data.projects} /> */}
			</SidebarContent>
			<SidebarFooter>
				<SignedIn>
					<NavUser user={data.user} />
				</SignedIn>
				<SignedOut>
					<Button asChild variant="outline">
						<Link to="/users/login">
							Login <LogIn />
						</Link>
					</Button>
				</SignedOut>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
