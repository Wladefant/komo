const params = new URLSearchParams(location.search),
  mode = params.get("mode") || "after",
  count = Number(params.get("comments") ?? 250),
  sidebar = params.get("sidebar") === "background" ? "background" : "edge";
if (!Number.isInteger(count) || count < 0 || count > 5000)
  throw new Error("comments must be an integer between 0 and 5000");
// Every run starts with the requested workload, never a previous benchmark cache.
for (const key of Object.keys(localStorage)) {
  if (
    key.startsWith(`branch-comments:${location.origin}/api/:perf`) ||
    (key.startsWith("branch-comments:") && key.endsWith(":perf:perf"))
  )
    localStorage.removeItem(key);
}
const content = document.querySelector("#content"),
  stats = document.querySelector("#stats");
for (let i = 0; i < 5000; i++) {
  const row = document.createElement("div");
  row.className = "target";
  row.id = `target-${i}`;
  row.textContent = `Component ${i}`;
  content.append(row);
}
const rows = [...content.children];
const threads = Array.from({ length: count }, (_, i) => ({
  id: `thread-${i}`,
  project: "perf",
  repo: "perf",
  branch: "main",
  page: "/",
  anchor: {
    selector: `#target-${i}`,
    x: 0.5,
    y: 0.5,
    width: 0,
    height: 0,
    pageX: 100,
    pageY: i * 32,
    viewportWidth: 390,
    viewportHeight: 844,
    text: `Component`,
  },
  createdAt: 1,
  updatedAt: 1,
  resolved: false,
  resolvedBy: null,
  comments: [
    {
      id: `comment-${i}`,
      body: "Review this component. ".repeat(90),
      createdAt: 1,
      editedAt: null,
      author: { id: `user-${i}`, name: `Reviewer ${i}`, verified: true },
      reactions: {},
    },
  ],
}));
const realFetch = window.fetch;
window.fetch = async (url, ...args) =>
  String(url).includes("/api/")
    ? Response.json(
        String(url).includes("threads")
          ? { threads, revision: 1, next: null }
          : { user: null },
      )
    : realFetch(url, ...args);
let measuring = false;
const calls = { rect: 0, query: 0, queryAll: 0, hit: 0 };
for (const [proto, key, metric] of [
  [Element.prototype, "getBoundingClientRect", "rect"],
  [Document.prototype, "querySelector", "query"],
  [Element.prototype, "querySelector", "query"],
  [Document.prototype, "querySelectorAll", "queryAll"],
  [Element.prototype, "querySelectorAll", "queryAll"],
  [DocumentFragment.prototype, "querySelector", "query"],
  [DocumentFragment.prototype, "querySelectorAll", "queryAll"],
  [Document.prototype, "elementFromPoint", "hit"],
  [Document.prototype, "elementsFromPoint", "hit"],
]) {
  const original = proto[key];
  proto[key] = function (...args) {
    if (measuring) calls[metric]++;
    return original.apply(this, args);
  };
}
let controller;
if (mode !== "none") {
  const { initComments } = await import(`./${mode}/index.js`);
  controller = initComments({
    endpoint: `${location.origin}/api/`,
    project: "perf",
    repo: "perf",
    branch: "main",
    page: () => "/",
    pageRoot: content,
    sidebar,
    autoHideDrawer: false,
    pollInterval: 60000,
  });
}
controller?.open();
await new Promise((resolve) => setTimeout(resolve, 2000));
const shadow = [...document.querySelectorAll("*")]
  .map((node) => node.shadowRoot)
  .find((root) => root?.querySelector(".toolbar"));
const loadedCount =
  shadow?.querySelectorAll(".list > [data-thread]").length ?? 0;
if (
  mode !== "none" &&
  (!shadow ||
    loadedCount !== count ||
    /Comments didn.t load|Could not read comments/.test(shadow.textContent))
) {
  controller?.destroy();
  stats.dataset.error = "true";
  stats.textContent = `Invalid workload: expected ${count} threads, loaded ${loadedCount}.`;
  throw new Error(stats.textContent);
}
let frames = 0,
  last = performance.now();
const intervals = [];
measuring = true;
stats.textContent = "Measuring 180 frames…";
function step(now) {
  intervals.push(now - last);
  last = now;
  for (let i = 500; i < 600; i++)
    rows[i].firstChild.data = `Component ${i}: ${frames}`;
  if (++frames < 180) requestAnimationFrame(step);
  else {
    measuring = false;
    const result = {
      mode,
      sidebar,
      comments: count,
      loadedCount,
      frames,
      calls,
      meanFrameMs: intervals.reduce((a, b) => a + b, 0) / intervals.length,
      worstFrameMs: Math.max(...intervals),
    };
    controller?.destroy();
    result.cleanedUp = ![...document.querySelectorAll("*")].some((node) =>
      node.shadowRoot?.querySelector(".toolbar"),
    );
    stats.textContent = JSON.stringify(result, null, 2);
    stats.dataset.complete = "true";
  }
}
requestAnimationFrame(step);
