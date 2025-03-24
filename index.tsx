import React from "react";
import { createRoot } from "react-dom/client";
import "./styles/dark-theme.css";
import "./styles/bootstrap.min.css";
import "./styles/index.css";

import { RouterProvider } from "react-router-dom";
import router from "./components/routes"; // Make sure this is your proper router config

async function main() {
  let root = createRoot(document.getElementById("root"));

  root.render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>
  );
}

main();
