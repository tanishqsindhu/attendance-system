// main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { Provider } from "react-redux";
import { ClerkProvider, ClerkLoaded } from "@clerk/clerk-react";
import { rootAuthLoader } from "@clerk/react-router/ssr.server";
import { dark } from "@clerk/themes";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "@/store/store.js";

// Import your Publishable Key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export async function loader(args) {
	return rootAuthLoader(args);
}

if (!PUBLISHABLE_KEY) {
	throw new Error("Missing Publishable Key");
}

createRoot(document.getElementById("root")).render(
	<StrictMode>
		<ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
			<ClerkProvider
				appearance={{
					baseTheme: dark,
				}}
				publishableKey={PUBLISHABLE_KEY}
				afterSignOutUrl="/users/login"
			>
				<Provider store={store}>
					<PersistGate loading={null} persistor={persistor}>
						<BrowserRouter>
							<ClerkLoaded>
								<App />
							</ClerkLoaded>
						</BrowserRouter>
					</PersistGate>
				</Provider>
			</ClerkProvider>
		</ThemeProvider>
	</StrictMode>
);
