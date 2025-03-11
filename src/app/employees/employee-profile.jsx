import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getEmployeeDetails } from "@/firebase/index.js";
import { selectAllDepartments, selectAllPositions, selectAllBranches, selectAllShiftSchedules, selectActiveBranch } from "@/store/organization-settings/organization-settings.slice.js";
import { Mail, Phone, MapPin, Briefcase, Calendar, User, CreditCard, Clock } from "lucide-react";
import { EditEmployeeModal } from "../../components/EditEmployeeModal";
import AttendanceTable from "../../components/attendance-table.comonent";
import femaleTeacher from "@/assets/female teacher.png?url";
import maleTeacher from "@/assets/teacher.png?url";
import ManualAttendanceForm from "../../components/ManualAttendanceForm.component";
import { toast } from "sonner";
import SalaryTransactions from "../../components/salaryTransactions.component";
import female from "@/assets/woman.png?url";
import male from "@/assets/man.png?url";

// The main component
const EmployeeProfile = () => {
	const { empId } = useParams();
	const navigate = useNavigate();
	const dispatch = useDispatch();
	const [employee, setEmployee] = useState(null);
	const [attendance, setAttendance] = useState({});
	const [availableMonths, setAvailableMonths] = useState([]);
	const [monthYear, setMonthYear] = useState("");
	const [activeTab, setActiveTab] = useState("personal");
	const branchId = useSelector(selectActiveBranch);

	// Add this state in the EmployeeProfile component
	const [showManualForm, setShowManualForm] = useState(false);

	// Add this function to handle saving manual attendance
	const handleSaveManualAttendance = async (monthYearKey) => {
		const data = await getEmployeeDetails(branchId.id, empId);
		if (!data) throw new Error("No Employee Data Found");
		setEmployee(data);
		setMonthYear(monthYearKey);
		setShowManualForm(false);
	};

	// Fetch employee details
	const fetchEmployeeDetails = useCallback(async () => {
		try {
			const data = await getEmployeeDetails(branchId.id, empId);
			if (!data) throw new Error("No Employee Data Found");
			setEmployee(data);

			// Extract available months from attendance data
			if (data.attendance) {
				const months = Object.keys(data.attendance);
				setAvailableMonths(months);

				// Set default month to the most recent one
				if (months.length > 0) {
					const sortedMonths = [...months].sort((a, b) => {
						const [monthA, yearA] = a.split("-").map(Number);
						const [monthB, yearB] = b.split("-").map(Number);

						if (yearA !== yearB) {
							return yearB - yearA; // Sort by year descending
						}
						return monthB - monthA; // Within same year, sort by month descending
					});

					setMonthYear(sortedMonths[0]);
					setAttendance(data.attendance[sortedMonths[0]] || {});
				}
			}
		} catch (error) {
			console.error("Error fetching employee details:", error);
			toast.error(error.message);
		}
	}, [branchId, empId]);

	// Inside the EmployeeProfile component, add these selector hooks
	const departments = useSelector(selectAllDepartments);
	const positions = useSelector(selectAllPositions);
	const branches = useSelector(selectAllBranches);
	const shiftSchedules = useSelector(selectAllShiftSchedules);

	// Add helper functions to map IDs to names
	const getDepartmentName = (deptId) => {
		const department = departments.find((dept) => dept.id === deptId);
		return department ? department.name : deptId;
	};

	const getPositionName = (posId) => {
		const position = positions.find((pos) => pos.id === posId);
		return position ? position.name : posId;
	};

	const getBranchName = (branchId) => {
		const branch = branches.find((b) => b.id === branchId);
		return branch ? branch.name : branchId;
	};

	const getShiftDetails = (shiftId) => {
		const shift = shiftSchedules.find((s) => s.id === shiftId);
		if (!shift) return { name: shiftId, time: "N/A" };
		return {
			name: shift.name,
			time: `${shift.defaultTimes.start} - ${shift.defaultTimes.end}`,
		};
	};

	// Fetch employee details when branch or employee ID changes
	useEffect(() => {
		if (branchId?.id) fetchEmployeeDetails();
	}, [branchId, empId, fetchEmployeeDetails]);

	// Update attendance data when month changes
	useEffect(() => {
		if (employee?.attendance && monthYear) {
			setAttendance(employee.attendance[monthYear] || {});
		}
	}, [employee, monthYear]);

	// Generate month options for the Select component from available months
	const monthOptions = useMemo(() => {
		return availableMonths
			.map((monthStr) => {
				const [month, year] = monthStr.split("-");
				const date = new Date(parseInt(year), parseInt(month) - 1);
				return {
					value: monthStr,
					label: date.toLocaleString("default", { month: "long", year: "numeric" }),
				};
			})
			.sort((a, b) => {
				const [aMonth, aYear] = a.value.split("-");
				const [bMonth, bYear] = b.value.split("-");
				return bYear - aYear || bMonth - aMonth; // Sort by year and then month in descending order
			});
	}, [availableMonths]);

	// Prepare attendance data for table
	const attendanceData = useMemo(() => {
		return Object.entries(attendance).map(([date, data]) => ({
			date,
			...data,
		}));
	}, [attendance]);

	// Format employee status
	const GetEmployeeStatusBadge = (status) => {
		const statusMap = {
			active: "success",
			"non-active": "destructive",
			"on-leave": "warning",
			probation: "secondary",
		};

		return (
			<Badge variant={statusMap[status] || "secondary"} className="capitalize w-23">
				{status?.charAt(0).toUpperCase() + status?.slice(1)}
			</Badge>
		);
	};

	// State for managing the edit modal
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);

	// Open the edit modal
	const handleEditClick = () => {
		setIsEditModalOpen(true);
	};

	// Close the edit modal
	const handleCloseEditModal = () => {
		setIsEditModalOpen(false);
	};
	return (
		<div className="container mx-auto py-6 space-y-6">
			{/* Edit Employee Modal */}
			<div className="w-full max-w-full mx-4">
				{/* Edit Employee Modal */}
				<EditEmployeeModal isOpen={isEditModalOpen} onClose={handleCloseEditModal} employeeData={employee } />
				{/* <EditEmployeeModal className="sm:w-[800px] md:w-[1000px] lg:w-[4000px]" isOpen={isEditModalOpen} onClose={handleCloseEditModal} employeeData={employee} /> */}
			</div>
			{employee ? (
				<>
					<div className="flex flex-col md:flex-row gap-6">
						<Card className="w-full md:w-1/3">
							<CardHeader className="flex flex-col items-center">
								<Avatar className="w-24 h-24 mb-4">
									<AvatarImage
										src={getDepartmentName(employee.employment?.department) == "Teacher" || getDepartmentName(employee.employment?.department) == "Teaching" ? (employee.personal?.gender == "male" ? maleTeacher : femaleTeacher) : employee.personal?.gender == "male" ? male : female}
										alt={employee.personal?.gender == "female" ? "Female Avatar" : "Male Avatar"}
									/>
									<AvatarFallback className="text-xl">
										{employee.personal?.firstName?.charAt(0)}
										{employee.personal?.lastName?.charAt(0)}
									</AvatarFallback>
								</Avatar>
								<CardTitle className="text-center text-2xl">
									{employee.personal?.firstName} {employee.personal?.lastName}
								</CardTitle>
								<CardDescription className="text-center">
									{getPositionName(employee.employment?.position)} - {getDepartmentName(employee.employment?.department)}
								</CardDescription>
								<div className="mt-2">{GetEmployeeStatusBadge(employee.employment?.employmentStatus)}</div>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									<div className="flex items-center">
										<Briefcase className="mr-2 h-4 w-4 text-muted-foreground" />
										<span className="text-sm">
											Employee ID: <strong>{empId}</strong>
										</span>
									</div>
									<div className="flex items-center">
										<Mail className="mr-2 h-4 w-4 text-muted-foreground" />
										<span className="text-sm">{employee.personal?.email || "No email provided"}</span>
									</div>
									<div className="flex items-center">
										<Phone className="mr-2 h-4 w-4 text-muted-foreground" />
										<span className="text-sm">{employee.personal?.phone || "No phone provided"}</span>
									</div>
									<div className="flex items-center">
										<Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
										<span className="text-sm">Joined: {employee.employment?.joiningDate ? format(new Date(employee.employment.joiningDate), "dd MMM yyyy") : "Unknown"}</span>
									</div>
									<div className="flex items-center">
										<Clock className="mr-2 h-4 w-4 text-muted-foreground" />
										<span className="text-sm">Shift: {employee.employment?.shiftId ? `${getShiftDetails(employee.employment.shiftId).name} (${getShiftDetails(employee.employment.shiftId).time})` : "Not assigned"}</span>
									</div>
								</div>
							</CardContent>
							<CardFooter>
								<div className="flex gap-2 w-full">
									<Button
										variant="outline"
										className="w-full"
										onClick={(e) => {
											e.stopPropagation();
											handleEditClick(); // Open the edit modal
										}}
									>
										Edit Profile
									</Button>
								</div>
							</CardFooter>
						</Card>

						<Card className="w-full md:w-2/3">
							<CardHeader>
								<CardTitle>Employee Information</CardTitle>
							</CardHeader>
							<CardContent>
								<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
									<TabsList className="grid grid-cols-3 mb-4 w-full">
										<TabsTrigger value="personal">Personal</TabsTrigger>
										<TabsTrigger value="employment">Employment</TabsTrigger>
										<TabsTrigger value="documents">Documents</TabsTrigger>
										{/* <TabsTrigger value="transactions">Transactions</TabsTrigger> */}
									</TabsList>

									<TabsContent value="personal" className="space-y-6">
										<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
											<div>
												<h3 className="text-lg font-medium mb-4">Personal Information</h3>
												<div className="space-y-3">
													<div className="grid grid-cols-2">
														<div className="text-sm text-muted-foreground">Full Name</div>
														<div className="text-sm font-medium">
															{employee.personal?.firstName} {employee.personal?.lastName}
														</div>
													</div>
													<div className="grid grid-cols-2">
														<div className="text-sm text-muted-foreground">Gender</div>
														<div className="text-sm font-medium">{employee.personal?.gender}</div>
													</div>
													<div className="grid grid-cols-2">
														<div className="text-sm text-muted-foreground">Date of Birth</div>
														<div className="text-sm font-medium">{employee.personal?.dob ? format(new Date(employee.personal.dob.seconds * 1000), "dd MMM yyyy") : "Not provided"}</div>
													</div>
													<div className="grid grid-cols-2">
														<div className="text-sm text-muted-foreground">Blood Group</div>
														<div className="text-sm font-medium">{employee.personal?.bloodGroup || "Not provided"}</div>
													</div>
													<div className="grid grid-cols-2">
														<div className="text-sm text-muted-foreground">Aadhar Number</div>
														<div className="text-sm font-medium">{employee.personal?.aadhar || "Not provided"}</div>
													</div>
												</div>
											</div>

											<div>
												<h3 className="text-lg font-medium mb-4">Contact Information</h3>
												<div className="space-y-3">
													<div className="grid grid-cols-2">
														<div className="text-sm text-muted-foreground">Email</div>
														<div className="text-sm font-medium">{employee.personal?.email || "Not provided"}</div>
													</div>
													<div className="grid grid-cols-2">
														<div className="text-sm text-muted-foreground">Phone</div>
														<div className="text-sm font-medium">{employee.personal?.phone || "Not provided"}</div>
													</div>
													<div className="grid grid-cols-2">
														<div className="text-sm text-muted-foreground">Address</div>
														<div className="text-sm font-medium">{employee.personal?.address || "Not provided"}</div>
													</div>
													<div className="grid grid-cols-2">
														<div className="text-sm text-muted-foreground">City</div>
														<div className="text-sm font-medium">{employee.personal?.city || "Not provided"}</div>
													</div>
													<div className="grid grid-cols-2">
														<div className="text-sm text-muted-foreground">State</div>
														<div className="text-sm font-medium">{employee.personal?.state || "Not provided"}</div>
													</div>
													<div className="grid grid-cols-2">
														<div className="text-sm text-muted-foreground">Pincode</div>
														<div className="text-sm font-medium">{employee.personal?.pincode || "Not provided"}</div>
													</div>
												</div>
											</div>
										</div>
									</TabsContent>

									<TabsContent value="employment" className="space-y-6">
										<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
											<div>
												<h3 className="text-lg font-medium mb-4">Employment Details</h3>
												<div className="space-y-3">
													<div className="grid grid-cols-2">
														<div className="text-sm text-muted-foreground">Branch</div>
														<div className="text-sm font-medium">{getBranchName(branchId?.id) || "Not assigned"}</div>
													</div>

													<div className="grid grid-cols-2">
														<div className="text-sm text-muted-foreground">Department</div>
														<div className="text-sm font-medium">{getDepartmentName(employee.employment?.department)}</div>
													</div>

													<div className="grid grid-cols-2">
														<div className="text-sm text-muted-foreground">Position</div>
														<div className="text-sm font-medium">{getPositionName(employee.employment?.position)}</div>
													</div>
													<div className="grid grid-cols-2">
														<div className="text-sm text-muted-foreground">Employment Type</div>
														<div className="text-sm font-medium">{employee.employment?.employmentType}</div>
													</div>
													<div className="grid grid-cols-2">
														<div className="text-sm text-muted-foreground">Salary</div>
														<div className="text-sm font-medium">₹{employee.employment?.salaryAmount?.toLocaleString("en-IN") || 0}</div>
													</div>
													<div className="grid grid-cols-2">
														<div className="text-sm text-muted-foreground">Pay Schedule</div>
														<div className="text-sm font-medium">{employee.employment?.paySchedule}</div>
													</div>
												</div>
											</div>

											<div>
												<h3 className="text-lg font-medium mb-4">Banking Information</h3>
												<div className="space-y-3">
													<div className="grid grid-cols-2">
														<div className="text-sm text-muted-foreground">Bank Name</div>
														<div className="text-sm font-medium">{employee.banking?.bankName || "Not provided"}</div>
													</div>
													<div className="grid grid-cols-2">
														<div className="text-sm text-muted-foreground">Account Type</div>
														<div className="text-sm font-medium">{employee.banking?.accountType || "Not provided"}</div>
													</div>
													<div className="grid grid-cols-2">
														<div className="text-sm text-muted-foreground">Account Number</div>
														<div className="text-sm font-medium">{employee.banking?.accountNumber || "Not provided"}</div>
													</div>
													<div className="grid grid-cols-2">
														<div className="text-sm text-muted-foreground">IFSC Code</div>
														<div className="text-sm font-medium">{employee.banking?.ifscCode || "Not provided"}</div>
													</div>
													<div className="grid grid-cols-2">
														<div className="text-sm text-muted-foreground">PAN</div>
														<div className="text-sm font-medium">{employee.banking?.pan || "Not provided"}</div>
													</div>
												</div>
											</div>
										</div>
									</TabsContent>

									<TabsContent value="documents">
										<div className="p-6 text-center">
											<h3 className="text-lg font-medium mb-2">Documents</h3>
											<p className="text-muted-foreground mb-4">Employee documents will be displayed here.</p>
											<Button>Upload Document</Button>
										</div>
									</TabsContent>
									<TabsContent value="transactions">
										<SalaryTransactions employee={employee} />
									</TabsContent>
								</Tabs>
							</CardContent>
						</Card>
					</div>

					{/* Attendance Section */}
					<Card>
						<CardHeader>
							<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
								<CardTitle>Attendance Records</CardTitle>
								<div className="flex items-center gap-2">
									<Button variant={showManualForm ? "secondary" : "default"} onClick={() => setShowManualForm(!showManualForm)}>
										{showManualForm ? "Cancel" : "Add Manual Entry"}
									</Button>
									<Label htmlFor="select-month">Select Month:</Label>
									<Select id="select-month" value={monthYear} onValueChange={setMonthYear} disabled={availableMonths.length === 0}>
										<SelectTrigger className="w-[240px]">
											<SelectValue placeholder={availableMonths.length === 0 ? "No attendance data" : "Select month"} />
										</SelectTrigger>
										<SelectContent position="popper">
											{monthOptions.map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							{showManualForm ? (
								<ManualAttendanceForm employee={employee} onSave={handleSaveManualAttendance} />
							) : (
								<AttendanceTable
									attendanceData={attendanceData}
									monthOptions={monthOptions}
									monthYear={monthYear}
									onMonthChange={setMonthYear}
									loading={false} // Pass loading state if available
									error={null} // Pass error state if available
								/>
							)}
						</CardContent>
					</Card>
					<SalaryTransactions employee={employee} />
				</>
			) : (
				<Card className="w-full p-6">
					<CardContent className="flex justify-center items-center h-40">
						<p>Loading employee details...</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
};

export default EmployeeProfile;
