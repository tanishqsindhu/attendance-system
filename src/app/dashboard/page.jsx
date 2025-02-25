import { AppSidebar } from "@/components/app-sidebar";
import { ModeToggle } from "@/components/mode-toggle";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Link, useLocation } from "react-router-dom";
import { House } from "lucide-react";
import { Outlet } from "react-router-dom";

export default function Page() {
	const location = useLocation();

	// Convert "/dashboard/settings/profile" → ["dashboard", "settings", "profile"]
	const pathSegments = location.pathname.split("/").filter(Boolean);

	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 ">
					<div className="flex items-center gap-2 px-4">
						<SidebarTrigger className="-ml-1" />
						<Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
						<Breadcrumb>
							<BreadcrumbList>
								{/* Home Link */}
								<BreadcrumbItem className="hidden md:block">
									<BreadcrumbLink asChild>
										<Link to="/">
											<House />
										</Link>
									</BreadcrumbLink>
								</BreadcrumbItem>

								{/* Generate Breadcrumbs Dynamically */}
								{pathSegments.map((segment, index) => {
									const href = `/${pathSegments.slice(0, index + 1).join("/")}`;
									const formattedSegment = segment.charAt(0).toUpperCase() + segment.slice(1);

									return (
										<>
											<BreadcrumbSeparator key={index} />
											<BreadcrumbItem key={href} className="hidden md:block">
												{index === pathSegments.length - 1 ? (
													<BreadcrumbPage>{formattedSegment}</BreadcrumbPage>
												) : (
													<BreadcrumbLink asChild>
														<Link to={href}>{formattedSegment}</Link>
													</BreadcrumbLink>
												)}
											</BreadcrumbItem>
										</>
									);
								})}
							</BreadcrumbList>
						</Breadcrumb>
					</div>
					<div className="ml-auto px-3">
						<div className="flex items-center gap-2 px-4">
							<div>
								<ModeToggle />
							</div>
						</div>
					</div>
				</header>
				<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
					<Outlet />
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
