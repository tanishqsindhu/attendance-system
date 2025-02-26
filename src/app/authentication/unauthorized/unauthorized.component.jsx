import { useEffect, useState } from "react";
import { Shield, AlertCircle, ArrowLeft, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

const UnauthorizedPage = () => {
	const navigate = useNavigate();
	const [secondsLeft, setSecondsLeft] = useState(10);
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		// Set up timer for redirect
		if (secondsLeft > 0) {
			const timer = setTimeout(() => {
				setSecondsLeft(secondsLeft - 1);
				setProgress((10 - secondsLeft + 1) * 10); // Adjusted calculation for 10 seconds
			}, 1000);

			return () => clearTimeout(timer);
		} else {
			// Redirect to home when timer reaches 0
			navigate("/");
		}
	}, [secondsLeft, navigate]);

	const goBack = () => {
		navigate(-1);
	};

	const goToHome = () => {
		navigate("/");
	};

	return (
		<div className="flex items-center justify-center min-h-screen bg-gray-50">
			<div className="w-full max-w-md px-4">
				<Card className="border-destructive/50 shadow-lg">
					<CardHeader className="space-y-1 text-center">
						<div className="flex justify-center mb-4">
							<Shield className="h-16 w-16 text-destructive" />
						</div>
						<CardTitle className="text-2xl font-bold text-destructive">Access Denied</CardTitle>
						<CardDescription>You don&apos;t have permission to access this page</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertTitle>Unauthorized</AlertTitle>
							<AlertDescription>Your current role doesn&apos;t have the necessary permissions to view this resource.</AlertDescription>
						</Alert>

						<div className="bg-muted/50 p-4 rounded-md text-sm">
							<p>If you believe this is an error, please contact your administrator to request access or verify your account permissions.</p>
						</div>

						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm text-muted-foreground">
								<div className="flex items-center gap-1">
									<Clock className="h-4 w-4" />
									<span>Redirecting to home in {secondsLeft} seconds</span>
								</div>
							</div>
							<Progress value={progress} className="h-2" />
						</div>
					</CardContent>
					<CardFooter className="flex flex-col sm:flex-row gap-3">
						<Button variant="outline" className="w-full sm:w-1/2 gap-2" onClick={goBack}>
							<ArrowLeft className="h-4 w-4" />
							Go Back
						</Button>
						<Button className="w-full sm:w-1/2" onClick={goToHome}>
							Return to Home
						</Button>
					</CardFooter>
				</Card>
			</div>
		</div>
	);
};

export default UnauthorizedPage;
