import { createFileRoute } from "@tanstack/react-router";
import MidwayWalk from "~/components/MidwayWalk";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return <MidwayWalk />;
}
