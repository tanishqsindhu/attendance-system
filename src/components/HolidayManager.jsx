import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { addHoliday, selectHolidays, selectHolidaysLoading } from "@/firebase/index.js";

const HolidayManager = () => {
	const dispatch = useDispatch();
	const holidays = useSelector(selectHolidays);
	const loading = useSelector(selectHolidaysLoading);

	const [formState, setFormState] = useState({
		date: "",
		name: "",
		type: "full", // "full" or "half"
	});

	useEffect(() => {
		// Fetch holidays for the current year
		const currentYear = new Date().getFullYear();
		const startDate = `${currentYear}-01-01`;
		const endDate = `${currentYear}-12-31`;
		dispatch(fetchHolidays({ startDate, endDate }));
	}, [dispatch]);

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormState({
			...formState,
			[name]: value,
		});
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!formState.date || !formState.name) {
			toast("Date and name are required");
			return;
		}

		try {
			await dispatch(addHoliday(formState)).unwrap();
			toast("Holiday added successfully");
			// Reset form
			setFormState({
				date: "",
				name: "",
				type: "full",
			});
		} catch (error) {
			toast(`Failed to add holiday: ${error.message}`);
		}
	};

	return (
		<div className="card">
			<div className="card-header">
				<h3>Holiday Management</h3>
			</div>
			<div className="card-body">
				<form onSubmit={handleSubmit} className="mb-4">
					<div className="row">
						<div className="col-md-4 mb-3">
							<label htmlFor="holidayDate">Date</label>
							<input type="date" className="form-control" id="holidayDate" name="date" value={formState.date} onChange={handleChange} required />
						</div>

						<div className="col-md-4 mb-3">
							<label htmlFor="holidayName">Holiday Name</label>
							<input type="text" className="form-control" id="holidayName" name="name" value={formState.name} onChange={handleChange} placeholder="e.g., Christmas Day" required />
						</div>

						<div className="col-md-4 mb-3">
							<label htmlFor="holidayType">Type</label>
							<select className="form-control" id="holidayType" name="type" value={formState.type} onChange={handleChange}>
								<option value="full">Full Holiday</option>
								<option value="half">Half Holiday</option>
							</select>
						</div>
					</div>

					<button type="submit" className="btn btn-primary" disabled={loading}>
						{loading ? "Adding..." : "Add Holiday"}
					</button>
				</form>

				<h4>Holidays List</h4>
				{loading ? (
					<div className="text-center">
						<div className="spinner-border" role="status">
							<span className="visually-hidden">Loading...</span>
						</div>
					</div>
				) : holidays.length === 0 ? (
					<div className="alert alert-info">No holidays added yet</div>
				) : (
					<div className="table-responsive">
						<table className="table table-striped">
							<thead>
								<tr>
									<th>Date</th>
									<th>Name</th>
									<th>Type</th>
								</tr>
							</thead>
							<tbody>
								{holidays.map((holiday) => (
									<tr key={holiday.id}>
										<td>{new Date(holiday.date).toLocaleDateString()}</td>
										<td>{holiday.name}</td>
										<td>{holiday.type === "full" ? "Full Holiday" : "Half Holiday"}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
};

export default HolidayManager;
