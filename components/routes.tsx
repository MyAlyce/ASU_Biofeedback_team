import React from "react";
import { createBrowserRouter } from "react-router-dom";
import Layout from "./layout";

import HomePage from "./homePage";
import GamePage from "./ballGame";
import SoundPage from "./soundPage";
import SettingsPage from "./settingsPage";
// import ScorePage from './scorePage'; // if you have one

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { path: "", element: <HomePage /> },
      { path: "games", element: <GamePage /> },
      { path: "playSound", element: <SoundPage /> },
      { path: "settings", element: <SettingsPage /> },
      // { path: 'score', element: <ScorePage /> },
    ],
  },
]);

export default router;
