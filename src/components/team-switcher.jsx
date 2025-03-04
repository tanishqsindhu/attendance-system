import * as React from "react";
import { ChevronsUpDown } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { useDispatch, useSelector } from "react-redux";
import { selectCurrentUser } from "@/store/user/user.selector.js";
import { setActiveBranch } from "@/store/orgaznization-settings/organization-settings.slice";

export function TeamSwitcher({ teams }) {
	const dispatch = useDispatch();
	const currentUser = useSelector(selectCurrentUser);
	const { isMobile } = useSidebar();

	// Memoized function to determine allowed branches based on role
	const allowedBranches = React.useMemo(() => {
		if (currentUser.roles.includes("bothBranches")) return teams;
		return teams.find((team) => currentUser.roles.includes(team.plan)) || null;
	}, [currentUser.roles, teams]);

	// Set default active team
	const [activeTeam, setActiveTeam] = React.useState(allowedBranches[0]);

	// Dispatch active team to Redux on change
	React.useEffect(() => {
		if (activeTeam) dispatch(setActiveBranch(activeTeam));
	}, [dispatch, activeTeam]);

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
								<img src={activeTeam.logo} className="size-5" alt="Team logo" />
							</div>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-medium">{activeTeam.name}</span>
								<span className="truncate text-xs">{activeTeam.plan}</span>
							</div>
							{currentUser.roles.includes("bothBranches") && <ChevronsUpDown className="ml-auto" />}
						</SidebarMenuButton>
					</DropdownMenuTrigger>

					{currentUser.roles.includes("bothBranches") && (
						<DropdownMenuContent
							className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
							align="start"
							side={isMobile ? "bottom" : "right"}
							sideOffset={4}
						>
							<DropdownMenuLabel className="text-muted-foreground text-xs">
								Branches
							</DropdownMenuLabel>
							{teams.map((team, index) => (
								<DropdownMenuItem
									key={team.id}
									onClick={() => setActiveTeam(team)}
									className="gap-2 p-2"
								>
									<div className="flex size-6 items-center justify-center rounded-xs border">
										<img src={team.alternateLogo} className="size-5" alt="Team logo" />
									</div>
									{team.plan}
									<DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					)}
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
