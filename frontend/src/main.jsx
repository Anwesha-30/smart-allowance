import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import App from "./App";
import { WalletProvider } from "./context/WalletContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <WalletProvider>
        {/* Global toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: "12px",
              fontFamily: "Inter, sans-serif",
              fontSize: "14px",
              fontWeight: "500",
              boxShadow: "0 4px 12px 0 rgb(0 0 0 / 0.12)",
            },
            success: {
              iconTheme: { primary: "#10b981", secondary: "#fff" },
            },
            error: {
              iconTheme: { primary: "#ef4444", secondary: "#fff" },
            },
          }}
        />
        <App />
      </WalletProvider>
    </BrowserRouter>
  </React.StrictMode>
);
