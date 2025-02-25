import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
// import { PersistGate } from "redux-persist/integration/react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { Provider } from "react-redux";
import { store } from "./store/store";

createRoot(document.getElementById("root")).render(
	<StrictMode>
		<Provider store={store}>
			{/* <PersistGate loading={null} persistor={persistor}> */}
				<ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
					<BrowserRouter>
						<App />
					</BrowserRouter>
				</ThemeProvider>
			{/* </PersistGate> */}
		</Provider>
	</StrictMode>
);
