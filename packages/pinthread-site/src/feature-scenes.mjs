const controls = (label) =>
  `<div class="scene-controls"><button data-example-play aria-label="Pause ${label}"><span data-icon="pause"></span></button><button data-example-replay aria-label="Replay ${label}"><span data-icon="replay"></span></button></div>`;
const lines = `<span class="abstract-lines" aria-hidden="true"><i></i><i></i></span>`;
const message = (initial, name, text, blue = false) =>
  `<div class="product-thread" role="img" aria-label="${name}: ${text}"><span class="product-avatar${blue ? " blue" : ""}" aria-hidden="true"></span><div class="product-message"><span class="abstract-name" aria-hidden="true"></span>${lines}</div></div>`;
const queueCard = (
  index
) => `<article class="product-preview conversation-card" data-thread="${index}">
 ${message("", ["Maya", "Jules", "Alex"][index], ["Give the headline more room.", "Make the button clearer.", "Check the mobile spacing."][index], index === 1)}
 <div class="conversation-response"><div class="product-thread-reply">${message("", "Alex", "Updated. Ready for another look.", true)}</div></div>
 <div class="queue-resolved"><span data-icon="check"></span>Resolved</div>
</article>`;
export const commentExample = `<div class="feature-example comment-queue" data-example="comments" data-step="0" aria-label="Animated comment conversations">
 <div class="example-header">${controls("comment example")}</div>
 <div class="conversation-viewport"><div class="conversation-track">${[0, 1, 2].map(queueCard).join("")}</div></div>
 <div class="example-footer"><span data-example-status>New comments arrive</span><span class="queue-count">2 open</span></div>
</div>`;
const trafficLights = `<span class="window-lights" aria-hidden="true"><i></i><i></i><i></i></span>`;
export const promptExample = `<div class="feature-example prompt-example" data-example="prompt" data-step="0" aria-label="Animated comments passed to a coding agent">
 <div class="example-header">${controls("prompt example")}</div>
 <div class="desktop-stage">
  <section class="desktop-window website-window" aria-label="Website window">
   <div class="desktop-titlebar">${trafficLights}<span class="browser-address"><span class="abstract-address" aria-hidden="true"></span></span><span data-icon="replay"></span></div>
   <div class="captured-website abstract-website" role="img" aria-label="A simplified website: headline, image, and action button"><div class="abstract-site-nav" aria-hidden="true"><i></i><span></span></div><div class="abstract-hero" aria-hidden="true"><span class="abstract-headline"></span><span class="abstract-headline short"></span><span class="abstract-cta"></span></div><div class="abstract-media" aria-hidden="true"></div></div>
   <div class="window-comments">${message("M", "Maya", "Give the headline more room.")}${message("J", "Jules", "Make the primary action easier to find.", true)}<div class="workflow-copy-action"><span class="workflow-swap"><span class="copy-before"><span data-icon="copy"></span>Copy all comments</span><span class="copy-after"><span data-icon="check"></span>Copied</span></span></div></div>
   <div class="window-complete"><span data-icon="check"></span>Agent’s changes applied</div>
  </section>
  <section class="desktop-window coding-window" aria-label="Agent window">
   <div class="desktop-titlebar">${trafficLights}<span class="coding-title">Agent</span><span data-icon="overview"></span></div>
   <div class="coding-body">
    <div class="coding-user"><span class="prompt-attachment"><span data-icon="comment"></span>2 comments</span><p>Give the headline more room.<br />Make the primary button stand out.</p></div>
    <div class="coding-response"><span class="coding-response-title"><span data-icon="terminal"></span>On it.</span><p>I’ll adjust the spacing and bring the action into focus.</p><span class="coding-result"><span data-icon="check"></span>Updated the page</span></div>
   </div>
  </section>
 </div><div class="workflow-steps" role="group" aria-label="Prompt walkthrough stages"><button data-example-step="0" aria-pressed="true"><span>1</span>Copy comments</button><button data-example-step="2" aria-pressed="false"><span>2</span>Paste prompt</button><button data-example-step="4" aria-pressed="false"><span>3</span>Agent edits</button></div>
</div>`;
