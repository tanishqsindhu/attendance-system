import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { saveAttendanceRules, getAttendanceRules, selectAttendanceRules } from "@/store/attendance-rules/attendance-rules.slice.js";
import { selectActiveBranch } from "@/store/organization-settings/organization-settings.slice.js";

// Import shadcn components
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { selectCurrentUser } from "@/store/user/user.selector.js";

const AttendanceRulesForm = () => {
	const dispatch = useDispatch();
	const activeBranch = useSelector(selectActiveBranch);
	const existingRules = useSelector(selectAttendanceRules);
	const [loading, setLoading] = useState(false);
	const currentUser = useSelector(selectCurrentUser);

	const [rules, setRules] = useState({
		lateDeductions: {
			enabled: false,
			deductionType: "percentage",
			deductPerMinute: 0,
			fixedAmountPerMinute: 0,
			maxDeductionTime: 60,
			halfDayThreshold: 120,
			absentThreshold: 240,
		},
	});

	useEffect(() => {
		if (activeBranch && !existingRules) {
			dispatch(getAttendanceRules(activeBranch.id));
		} else if (existingRules) {
			setRules(existingRules);
		}
	}, [activeBranch, existingRules, dispatch]);

	const handleSwitchChange = (checked) => {
		setRules({
			...rules,
			lateDeductions: {
				...rules.lateDeductions,
				enabled: checked,
			},
		});
	};

	const handleDeductionTypeChange = (value) => {
		setRules({
			...rules,
			lateDeductions: {
				...rules.lateDeductions,
				deductionType: value,
			},
		});
	};

	const handleInputChange = (field, value) => {
		setRules({
			...rules,
			lateDeductions: {
				...rules.lateDeductions,
				[field]: parseFloat(value),
			},
		});
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);

		try {
			await dispatch(saveAttendanceRules({ branchId: activeBranch.id, rules })).unwrap();
			toast.success("Attendance rules saved successfully");
		} catch (error) {
			toast.error(`Failed to save rules: ${error.message}`);
		} finally {
			setLoading(false);
		}
	};

	if (!activeBranch) {
		return (
			<Alert variant="warning" className="mb-6">
				<AlertCircle className="h-4 w-4" />
				<AlertDescription>Please select a branch first to configure attendance rules.</AlertDescription>
			</Alert>
		);
	}

	return (
		<Card className="w-full">
			<CardHeader>
				<CardTitle>Attendance Rules Configuration</CardTitle>
				<CardDescription>Configure attendance deduction rules for your school payroll system</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit}>
					<div className="flex items-center space-x-2 mb-6">
						<Switch id="enableLateDeductions" checked={rules.lateDeductions.enabled} onCheckedChange={handleSwitchChange} />
						<Label htmlFor="enableLateDeductions" className="font-medium">
							Enable Late Deductions
						</Label>
					</div>

					{rules.lateDeductions.enabled && (
						<>
							<Separator className="my-4" />

							<div className="mb-6">
								<Label className="text-base font-medium mb-3 block">Deduction Calculation Method</Label>
								<RadioGroup value={rules.lateDeductions.deductionType} onValueChange={handleDeductionTypeChange} className="flex flex-col space-y-2">
									<div className="flex items-center space-x-2">
										<RadioGroupItem value="percentage" id="percentage" />
										<Label htmlFor="percentage">Percentage of daily wage</Label>
									</div>
									<div className="flex items-center space-x-2">
										<RadioGroupItem value="fixed" id="fixed" />
										<Label htmlFor="fixed">Fixed amount in rupees</Label>
									</div>
								</RadioGroup>
							</div>

							<Tabs defaultValue="deductions" className="w-full mb-6">
								<TabsList className="grid w-full grid-cols-2">
									<TabsTrigger value="deductions">Deduction Rates</TabsTrigger>
									<TabsTrigger value="thresholds">Time Thresholds</TabsTrigger>
								</TabsList>

								<TabsContent value="deductions" className="pt-4">
									{rules.lateDeductions.deductionType === "percentage" ? (
										<div className="space-y-2">
											<Label htmlFor="deductPerMinute">Deduction per Minute (% of daily wage)</Label>
											<Input id="deductPerMinute" type="number" value={rules.lateDeductions.deductPerMinute} onChange={(e) => handleInputChange("deductPerMinute", e.target.value)} min="0" max="100" step="0.01" />
											<p className="text-sm text-muted-foreground">Example: 0.5 means 0.5% of daily wage per minute late</p>
										</div>
									) : (
										<div className="space-y-2">
											<Label htmlFor="fixedAmountPerMinute">Fixed Deduction per Minute (₹)</Label>
											<Input id="fixedAmountPerMinute" type="number" value={rules.lateDeductions.fixedAmountPerMinute} onChange={(e) => handleInputChange("fixedAmountPerMinute", e.target.value)} min="0" step="1" />
											<p className="text-sm text-muted-foreground">Example: ₹5 means ₹5 will be deducted per minute late</p>
										</div>
									)}
								</TabsContent>

								<TabsContent value="thresholds" className="pt-4">
									<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
										<div className="space-y-2">
											<Label htmlFor="maxDeductionTime">Maximum Per-Minute Deduction Time</Label>
											<Input id="maxDeductionTime" type="number" value={rules.lateDeductions.maxDeductionTime} onChange={(e) => handleInputChange("maxDeductionTime", e.target.value)} min="0" />
											<p className="text-sm text-muted-foreground">Minutes until per-minute deductions stop</p>
										</div>

										<div className="space-y-2">
											<Label htmlFor="halfDayThreshold">Half-Day Threshold</Label>
											<Input id="halfDayThreshold" type="number" value={rules.lateDeductions.halfDayThreshold} onChange={(e) => handleInputChange("halfDayThreshold", e.target.value)} min="0" />
											<p className="text-sm text-muted-foreground">Minutes late for half-day deduction (50%)</p>
										</div>

										<div className="space-y-2">
											<Label htmlFor="absentThreshold">Absent Threshold</Label>
											<Input id="absentThreshold" type="number" value={rules.lateDeductions.absentThreshold} onChange={(e) => handleInputChange("absentThreshold", e.target.value)} min="0" />
											<p className="text-sm text-muted-foreground">Minutes late for absent deduction (100%)</p>
										</div>
									</div>
								</TabsContent>
							</Tabs>
						</>
					)}
				</form>
			</CardContent>
			<CardFooter>
				<Button type="submit" onClick={handleSubmit} disabled={loading} className="w-full sm:w-auto">
					{loading ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
						</>
					) : (
						"Save Rules"
					)}
				</Button>
			</CardFooter>
		</Card>
	);
};

export default AttendanceRulesForm;
