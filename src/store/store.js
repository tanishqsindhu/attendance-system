// store.js
import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { rootReducer } from "./root-reducer";
// For development environment only
import logger from "redux-logger";

const persistConfig = {
	key: "root",
	storage,
	blacklist: ["user"], // Excluded from persistence
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

// Prepare middlewares based on environment
const middlewares = [];
if (process.env.NODE_ENV === "development") {
	middlewares.push(logger);
}

export const store = configureStore({
	reducer: persistedReducer,
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			serializableCheck: {
				ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
				ignoredPaths: ["items.dates"],
			},
		}).concat(middlewares),
	devTools: process.env.NODE_ENV !== "production",
});

export const persistor = persistStore(store);
