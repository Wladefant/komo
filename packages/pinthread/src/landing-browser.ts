import { initPinthread } from "./index.js";

const project = document.currentScript?.getAttribute("data-project") ?? document.querySelector("script[data-project]")?.getAttribute("data-project");
if (!project) throw new Error("landing: data-project is missing");
initPinthread({ endpoint: location.origin, project, repo: project });
