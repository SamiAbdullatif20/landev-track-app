import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { TrackingOverlayView } from "./components/TrackingOverlayView";
import "./index.css";

const isOverlayView = new URLSearchParams(window.location.search).get("view") === "overlay";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isOverlayView ? <TrackingOverlayView /> : <App />}
  </React.StrictMode>
);
