import { createFileRoute } from "@tanstack/react-router";
import { StudioHome } from "@/components/vellum/studio";

export const Route = createFileRoute("/")({
  component: StudioHome,
});
