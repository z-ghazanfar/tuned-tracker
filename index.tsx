import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error: any) {
  console.error("Application failed to mount:", error);
  rootElement.innerHTML = `
    <div style="padding: 40px; color: white; background: #050505; font-family: sans-serif; text-align: center;">
      <h1 style="color: #ff4444;">Application Load Error</h1>
      <p style="opacity: 0.7;">Something went wrong during the initial load.</p>
      <pre style="background: #111; padding: 20px; border-radius: 8px; text-align: left; overflow: auto; max-width: 600px; margin: 20px auto;">${error.message}</pre>
      <button onclick="window.location.reload()" style="background: #00f5ff; color: black; border: none; padding: 12px 24px; border-radius: 99px; font-weight: bold; cursor: pointer;">
        Try Reloading
      </button>
    </div>
  `;
}
