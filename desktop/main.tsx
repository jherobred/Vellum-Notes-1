import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { StudioHome } from "@/components/vellum/studio";
import "@/styles.css";

document.documentElement.dataset.shell = "desktop";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <StudioHome shell="desktop" />
    </StrictMode>,
  );
}