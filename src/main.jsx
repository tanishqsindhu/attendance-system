import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
// import { PersistGate } from "redux-persist/integration/react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { Provider } from "react-redux";
import { store } from "./store/store";
import { ClerkProvider } from "@clerk/clerk-react";
import { rootAuthLoader } from "@clerk/react-router/ssr.server";

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
		<ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/users/login">
			<Provider store={store}>
				{/* <PersistGate loading={null} persistor={persistor}> */}
				<ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
					<BrowserRouter>
						<App />
					</BrowserRouter>
				</ThemeProvider>
				{/* </PersistGate> */}
			</Provider>
		</ClerkProvider>
	</StrictMode>
);
