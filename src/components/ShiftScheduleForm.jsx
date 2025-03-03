import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { addOrganizationItem } from "@/store/orgaznization-settings/organization-settings.reducer.js";

const ShiftScheduleForm = () => {
	const dispatch = useDispatch();
	const [loading, setLoading] = useState(false);

	const [formState, setFormState] = useState({
		name: "",
		defaultTimes: {
			start: "08:00",
			end: "16:00",
		},
		flexibleTime: {
			enabled: false,
			graceMinutes: 15,
		},
		dayOverrides: {},
		useDayOverrides: false,
	});

	const daysOfWeek = [
		{ key: "monday", label: "Monday" },
		{ key: "tuesday", label: "Tuesday" },
		{ key: "wednesday", label: "Wednesday" },
		{ key: "thursday", label: "Thursday" },
		{ key: "friday", label: "Friday" },
		{ key: "saturday", label: "Saturday" },
		{ key: "sunday", label: "Sunday" },
	];

	const handleChange = (e) => {
		const { name, value, type, checked } = e.target;

		if (name === "name") {
			setFormState({ ...formState, name: value });
		} else if (name === "flexibleTime.enabled") {
			setFormState({
				...formState,
				flexibleTime: {
					...formState.flexibleTime,
					enabled: checked,
				},
			});
		} else if (name === "flexibleTime.graceMinutes") {
			setFormState({
				...formState,
				flexibleTime: {
					...formState.flexibleTime,
					graceMinutes: parseInt(value),
				},
			});
		} else if (name === "useDayOverrides") {
			setFormState({
				...formState,
				useDayOverrides: checked,
			});
		} else if (name.startsWith("defaultTimes.")) {
			const field = name.split(".")[1];
			setFormState({
				...formState,
				defaultTimes: {
					...formState.defaultTimes,
					[field]: value,
				},
			});
		} else if (name.includes(".")) {
			const [day, field] = name.split(".");
			setFormState({
				...formState,
				dayOverrides: {
					...formState.dayOverrides,
					[day]: {
						...(formState.dayOverrides[day] || {}),
						[field]: value,
					},
				},
			});
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!formState.name) {
			toast.error("Schedule name is required");
			return;
		}

		setLoading(true);

		// Only include day overrides if the checkbox is enabled
		const scheduleData = {
			...formState,
			dayOverrides: formState.useDayOverrides ? formState.dayOverrides : {},
		};

		// Remove the checkbox control state before saving
		delete scheduleData.useDayOverrides;

		try {
			await dispatch(
				addOrganizationItem({
					itemType: "shiftSchedules",
					newItem: scheduleData,
				})
			).unwrap();

			toast.success("Shift schedule added successfully");

			// Reset form
			setFormState({
				name: "",
				defaultTimes: {
					start: "08:00",
					end: "16:00",
				},
				flexibleTime: {
					enabled: false,
					graceMinutes: 15,
				},
				dayOverrides: {},
				useDayOverrides: false,
			});
		} catch (error) {
			toast.error(`Failed to add shift schedule: ${error.message}`);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="card">
			<div className="card-header">
				<h3>Add Shift Schedule</h3>
			</div>
			<div className="card-body">
				<form onSubmit={handleSubmit}>
					<div className="mb-3">
						<label htmlFor="scheduleName">Schedule Name</label>
						<input type="text" className="form-control" id="scheduleName" name="name" value={formState.name} onChange={handleChange} placeholder="e.g., Standard School Hours" required />
					</div>
				</form>
			</div>
		</div>
	);
};
export default ShiftScheduleForm;
