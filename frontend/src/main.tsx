import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AnalysisProvider } from "./state/AnalysisContext";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/layout.css";
import "./styles/print.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AnalysisProvider>
      <App />
    </AnalysisProvider>
  </React.StrictMode>
);
