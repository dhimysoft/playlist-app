import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import PlaylistList from "./pages/PlaylistList.jsx";
import PlaylistDetail from "./pages/PlaylistDetail.jsx";
import "./index.css";

// two pages, both inside Layout. :id is the playlist id in the url
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<PlaylistList />} />
          <Route path="/playlists/:id" element={<PlaylistDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
