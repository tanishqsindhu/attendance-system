import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

const ProtectedRouteLoading = ({
	title = "Verifying Access",
	description = "Please wait while we check your permissions",
	icon: Icon = ShieldCheck,
	secondaryIcon: SecondaryIcon = Lock,
	loadingSpeed = 300, // Time interval in ms
}) => {
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		const timer = setInterval(() => {
			setProgress((prevProgress) => {
				if (prevProgress >= 100) {
					clearInterval(timer);
					return 100;
				}
				// Adjust speed dynamically
				const increment = prevProgress < 70 ? 15 : prevProgress < 90 ? 5 : 2;
				return Math.min(prevProgress + increment, 98);
			});
		}, loadingSpeed);

		return () => clearInterval(timer);
	}, [loadingSpeed]);

	return (
		<div className="flex items-center justify-center min-h-screen bg-gray-50">
			<div className="w-full max-w-md px-4">
				<Card className="shadow-lg border-primary/20">
					<CardHeader className="space-y-1 text-center pb-2">
						<div className="flex justify-center mb-4">
							<div className="relative">
								<Icon className="h-16 w-16 text-muted-foreground/30" />
								<div className="absolute inset-0 flex items-center justify-center">
									<SecondaryIcon className="h-8 w-8 text-primary animate-pulse" />
								</div>
							</div>
						</div>
						<CardTitle className="text-2xl font-bold">{title}</CardTitle>
						<CardDescription>{description}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="space-y-3">
							<div className="space-y-2">
								<div className="flex items-center justify-between text-sm text-muted-foreground">
									<span>Checking permissions</span>
									<span className="flex items-center">
										<Loader2 className="h-3 w-3 mr-1 animate-spin" />
										{progress}%
									</span>
								</div>
								<Progress value={progress} className="h-2" />
							</div>
						</div>

						<div className="space-y-3">
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-3/4" />
							<div className="flex items-center space-x-2 pt-2">
								<Skeleton className="h-8 w-8 rounded-full" />
								<div className="space-y-1">
									<Skeleton className="h-3 w-24" />
									<Skeleton className="h-3 w-16" />
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
};

export default ProtectedRouteLoading;
