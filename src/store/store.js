import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage"; // defaults to localStorage for web
import logger from "redux-logger";

import { rootReducer } from "./root-reducer";

// Middleware configuration
const middleWares = [process.env.NODE_ENV === "development" && logger].filter(Boolean);

// Persist configuration
const persistConfig = {
	key: "root", // key for the persist
	storage, // storage engine (localStorage by default)
	blacklist: ["user"], // optional: blacklist specific reducers
};

// Create a persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure the store with the persisted reducer
export const store = configureStore({
	reducer: persistedReducer, // Use the persisted reducer
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			// Disable serializable check for redux-persist
			serializableCheck: {
				ignoredActions: ["persist/PERSIST", "persist/REHYDRATE", "meta.arg", "payload.timestamp"],
				ignoredPaths: ["items.dates"],
			},
		}).concat(middleWares), // Add custom middleware
	devTools: process.env.NODE_ENV !== "production", // Enable Redux DevTools in development
});

// Create the persistor
export const persistor = persistStore(store);
