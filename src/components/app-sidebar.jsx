import * as React from "react";
import { useSelector } from "react-redux";

import { AudioWaveform, BookOpen, Bot, Command, Frame, GalleryVerticalEnd, Map, PieChart, Users, Settings2, SquareTerminal, LogIn } from "lucide-react";

import SisLogo from "../assets/scottish logo.svg?react";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";
import { selectCurrentUser } from "@/store/user/user.selector";
import { Button } from "./ui/button";
import { Link } from "react-router-dom";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";

export function AppSidebar({ ...props }) {
	const currentUser = useSelector(selectCurrentUser);
	// This is sample data.
	const data = {
		user: {
			name: `${currentUser ? currentUser.fullName : "Not Signed In"}`,
			email: `${currentUser ? currentUser.email : "example@email.com"}`,
			avatar: `${currentUser ? currentUser.imageUrl : "/avatars/shadcn.jpg"}`,
		},
		teams: [
			{
				name: "SIS",
				logo: SisLogo,
				plan: "Sector 16 & 17",
			},
			{
				name: "SAE",
				logo: SisLogo,
				plan: "South Bypass",
			},
		],
		navMain: [
			{
				title: "Employees",
				url: "#",
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
					{
						title: "Process Data",
						url: "/employees/attendance-process",
					},
					{
						title: "Upload Attendance",
						url: "/employees/upload-data",
					},
				],
			},
			{
				title: "Models",
				url: "#",
				icon: Bot,
				items: [
					{
						title: "Genesis",
						url: "#",
					},
					{
						title: "Explorer",
						url: "#",
					},
					{
						title: "Quantum",
						url: "#",
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
						url: "#",
					},
					{
						title: "Team",
						url: "#",
					},
					{
						title: "Billing",
						url: "#",
					},
					{
						title: "Limits",
						url: "#",
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
			<SidebarHeader>
				<TeamSwitcher teams={data.teams} />
			</SidebarHeader>
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
