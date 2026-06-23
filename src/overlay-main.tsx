import React from "react";
import ReactDOM from "react-dom/client";
import { TrackingOverlayView } from "./components/TrackingOverlayView";
import "./overlay.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TrackingOverlayView />
  </React.StrictMode>
);
