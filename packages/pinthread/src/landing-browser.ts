import { initPinthread } from "./index.js";

const project = document.currentScript?.getAttribute("data-project") ?? document.querySelector("script[data-project]")?.getAttribute("data-project");
if (!project) throw new Error("landing: data-project is missing");
// The page tells visitors to click the pinthread button, so the dock stays on screen
// instead of hiding until the pointer comes near the bottom edge.
initPinthread({ endpoint: location.origin, project, repo: project, autoHideDrawer: false });
