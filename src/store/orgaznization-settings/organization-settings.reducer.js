import { createSlice } from "@reduxjs/toolkit";

const INITIAL_STATE = {
	organizationSettings: null,
};

export const organizationSettingsSlice = createSlice({
	name: "organizationSettings",
	initialState: INITIAL_STATE,
	reducers: {
		setOrganizationSettings(state, action) {
			state.organizationSettings = action.payload;
		},
	},
});

export const { setOrganizationSettings } = organizationSettingsSlice.actions;

export const organizationSettingsReducer = organizationSettingsSlice.reducer;
