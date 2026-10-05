import { readFileSync, writeFileSync } from "node:fs";
import { parseHTML } from "linkedom";
import { build } from "esbuild";
import { resolve } from "node:path";
const root = resolve(process.argv[2] || "../pinthread");
await build({
  entryPoints: [root + "/packages/pinthread/src/agent-prompt.ts"],
  outfile: "/tmp/pinthread-agent-prompt.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
});
const { agentPrompt } = await import("/tmp/pinthread-agent-prompt.mjs");
const n = JSON.parse(
  readFileSync(root + "/tools/launch-video/remotion/native.json"),
);
const doc = (s) => parseHTML(s).document;
const threads = n.rows.map((r, i) => ({
  id: `fixture-${i + 1}`,
  page: "/",
  resolved: false,
  createdAt: 1789603200000 + i * 1000,
  anchor: {
    selector: `[data-demo-section="${i + 1}"]`,
    text: "Launch fixture",
    x: 0.5,
    y: 0.5,
    pageX: 480,
    pageY: 360 + i * 100,
    viewportWidth: 1440,
  },
  comments: [
    {
      body:
        doc(r).querySelector(".preview")?.textContent ||
        doc(r).textContent ||
        "Love this direction.",
      author: { name: doc(r).querySelector(".author")?.textContent || "Maya" },
      createdAt: 1789603200000 + i * 1000,
      reactions: {},
    },
  ],
}));
const conversation = n.messages.map((m, i) => ({
  body: doc(m).querySelector(".message-text").textContent,
  author: { name: doc(m).querySelector(".author").textContent },
  createdAt: 1789603200000 + i * 1000,
  reactions: i === 0 ? { "💜": ["fixture-user"] } : {},
}));
const first = threads.find((t) => t.comments[0].body === conversation[0].body);
if (first) {
  first.comments = conversation;
  first.resolved = true;
}
const extra = {
  shortcuts: [...doc(n.bar).querySelectorAll("button")].map((b) => b.outerHTML),
  symbol: readFileSync(root + "/packages/pinthread-site/public/favicon.svg", "utf8"),
  prompt: agentPrompt(threads, {
    project: "launch-fixture",
    repo: "pinthread/launch-fixture",
    branch: "demo",
    origin: "https://pinthread.example",
  }),
};
writeFileSync(
  root + "/tools/launch-video/remotion/extra.json",
  JSON.stringify(extra, null, 2),
);
