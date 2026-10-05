import "../../packages/pinthread-site/src/site";
// Review-only harness. Not imported by the package or production website.
import { initPinthread } from "../../packages/pinthread/src/index";
const project = "pinthread_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const user = { id: "google:sample", name: "Sample reviewer", verified: true };
let threads: unknown[] = [];
const originalFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = new URL(String(input), location.href);
  if (url.origin !== location.origin) return originalFetch(input, init);
  if (url.pathname === "/config") return Response.json({ google: true, github: false, guests: true, guestResolve: true });
  if (url.pathname === "/me") return Response.json({ user });
  if (url.pathname === "/usage") return Response.json({ hosted: true, projects: { used: 1, limit: 3 }, comments: { used: threads.length, limit: 250 } });
  if (url.pathname === "/threads" && init?.method === "POST") {
    const data = JSON.parse(String(init.body));
    const thread = { id: crypto.randomUUID(), page: data.page, anchor: data.anchor, resolved: false, resolvedBy: null, createdAt: Date.now(), updatedAt: Date.now(), comments: [{ id: crypto.randomUUID(), body: data.body, author: user, createdAt: Date.now(), editedAt: null, reactions: {} }] };
    threads.push(thread);
    return Response.json({ id: thread.id, commentId: thread.comments[0].id }, { status: 201 });
  }
  if (url.pathname === "/threads") return Response.json({ threads, next: null });
  return originalFetch(input, init);
};
const mode = new URLSearchParams(location.search).get("mode");
initPinthread({ endpoint: location.origin, project: mode ? project : "setup_review", repo: "sample/website", pageRoot: document.querySelector<HTMLElement>("#site-content")!, ...(mode ? {} : { onboarding: { inProject: true, code: crypto.randomUUID(), sites: ["https://preview.example.com"] } }) });
