import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { StudioHome } from "@/components/vellum/studio";
import "@/styles.css";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <StudioHome />
    </StrictMode>,
  );
}
