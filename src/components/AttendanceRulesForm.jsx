import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { saveAttendanceRules, getAttendanceRules, selectAttendanceRules, selectActiveBranch } from "@/store/employees/employees.reducer.js";

const AttendanceRulesForm = () => {
	const dispatch = useDispatch();
	const activeBranch = useSelector(selectActiveBranch);
	const existingRules = useSelector(selectAttendanceRules);
	const [loading, setLoading] = useState(false);

	const [rules, setRules] = useState({
		lateDeductions: {
			enabled: false,
			deductPerMinute: 0,
			maxDeductionTime: 60,
			halfDayThreshold: 120,
			absentThreshold: 240,
		},
		customDaySchedules: {},
	});

	useEffect(() => {
		if (activeBranch && !existingRules) {
			dispatch(getAttendanceRules(activeBranch));
		} else if (existingRules) {
			setRules(existingRules);
		}
	}, [activeBranch, existingRules, dispatch]);

	const handleChange = (e) => {
		const { name, value, type, checked } = e.target;

		if (name.startsWith("lateDeductions.")) {
			const field = name.split(".")[1];
			setRules({
				...rules,
				lateDeductions: {
					...rules.lateDeductions,
					[field]: type === "checkbox" ? checked : parseFloat(value),
				},
			});
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);

		try {
			await dispatch(saveAttendanceRules({ branchId: activeBranch, rules })).unwrap();
			toast("Attendance rules saved successfully");
		} catch (error) {
			toast(`Failed to save rules: ${error.message}`);
		} finally {
			setLoading(false);
		}
	};

	if (!activeBranch) {
		return <div className="alert alert-warning">Please select a branch first</div>;
	}

	return (
		<div className="card">
			<div className="card-header">
				<h3>Attendance Rules Configuration</h3>
			</div>
			<div className="card-body">
				<form onSubmit={handleSubmit}>
					<div className="form-check mb-3">
						<input type="checkbox" className="form-check-input" id="enableLateDeductions" name="lateDeductions.enabled" checked={rules.lateDeductions.enabled} onChange={handleChange} />
						<label className="form-check-label" htmlFor="enableLateDeductions">
							Enable Late Deductions
						</label>
					</div>

					{rules.lateDeductions.enabled && (
						<div className="row">
							<div className="col-md-6 mb-3">
								<label htmlFor="deductPerMinute">Deduction per Minute (% of daily wage)</label>
								<input type="number" className="form-control" id="deductPerMinute" name="lateDeductions.deductPerMinute" value={rules.lateDeductions.deductPerMinute} onChange={handleChange} min="0" max="100" step="0.01" />
								<small className="text-muted">Example: 0.5 means 0.5% of daily wage per minute late</small>
							</div>

							<div className="col-md-6 mb-3">
								<label htmlFor="maxDeductionTime">Maximum Per-Minute Deduction Time (minutes)</label>
								<input type="number" className="form-control" id="maxDeductionTime" name="lateDeductions.maxDeductionTime" value={rules.lateDeductions.maxDeductionTime} onChange={handleChange} min="0" />
								<small className="text-muted">Per-minute deductions apply up to this many minutes late</small>
							</div>

							<div className="col-md-6 mb-3">
								<label htmlFor="halfDayThreshold">Half-Day Threshold (minutes)</label>
								<input type="number" className="form-control" id="halfDayThreshold" name="lateDeductions.halfDayThreshold" value={rules.lateDeductions.halfDayThreshold} onChange={handleChange} min="0" />
								<small className="text-muted">If late by this many minutes, count as half-day (50% deduction)</small>
							</div>

							<div className="col-md-6 mb-3">
								<label htmlFor="absentThreshold">Absent Threshold (minutes)</label>
								<input type="number" className="form-control" id="absentThreshold" name="lateDeductions.absentThreshold" value={rules.lateDeductions.absentThreshold} onChange={handleChange} min="0" />
								<small className="text-muted">If late by this many minutes, count as absent (100% deduction)</small>
							</div>
						</div>
					)}

					<button type="submit" className="btn btn-primary" disabled={loading}>
						{loading ? "Saving..." : "Save Rules"}
					</button>
				</form>
			</div>
		</div>
	);
};

export default AttendanceRulesForm;
