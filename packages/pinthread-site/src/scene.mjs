export const scene = `<section class="review-scene" aria-label="Animated team walkthrough">
  <div class="scene-bar"><div class="scene-controls"><button data-scene-play aria-label="Pause walkthrough"><span data-icon="pause"></span></button><button data-scene-replay aria-label="Replay walkthrough"><span data-icon="replay"></span></button></div></div>
  <div class="scene-stage" data-phase="comment" data-story="0">
    <div class="hero-browser">
      <div class="desktop-titlebar"><span class="window-lights" aria-hidden="true"><i></i><i></i><i></i></span><span class="hero-site-label">Studio</span></div>
      <div class="hero-site hero-studio" data-site="0" role="img" aria-label="Studio website with a highlighted headline">
        <div class="hero-site-nav"><i></i><span></span></div>
        <div class="hero-studio-heading" data-review-target="0"><i></i><i></i></div><div class="hero-studio-copy"></div><div class="hero-studio-button"></div><div class="hero-studio-art"></div>
      </div>
      <div class="hero-site hero-shop" data-site="1" role="img" aria-label="Storefront with a highlighted add to cart button" aria-hidden="true">
        <div class="hero-site-nav"><i></i><span></span></div>
        <div class="hero-product-art"><i></i></div><div class="hero-product-info"><i></i><i></i><span></span></div><div class="hero-buy-button" data-review-target="1"></div>
      </div>
      <div class="hero-site hero-dashboard" data-site="2" role="img" aria-label="Dashboard with highlighted sidebar navigation" aria-hidden="true">
        <div class="hero-dashboard-nav" data-review-target="2"><i></i><i></i><i></i></div><div class="hero-dashboard-content"><span></span><div class="hero-metrics"><i></i><i></i><i></i></div><div class="hero-chart"><i></i><i></i><i></i><i></i><i></i></div></div>
      </div>
    </div>
    <div class="scene-target" aria-hidden="true"></div>
    <div class="agent-cursor" data-agent="D" aria-hidden="true"><span data-icon="multiplayer"></span><span data-cursor-name>Designer</span></div>
    <button class="scene-pin pin-design" data-story="0" aria-label="View headline review" aria-pressed="true">D</button>
    <button class="scene-pin pin-code" data-story="1" aria-label="View storefront review" aria-pressed="false">E</button>
    <button class="scene-pin pin-qa" data-story="2" aria-label="View dashboard review" aria-pressed="false">P</button>
    <article class="agent-card" aria-label="Example comment thread">
      <div class="agent-message"><span class="agent-avatar" data-author-initial>D</span><div><div class="agent-meta"><strong data-author>Designer</strong><span>now</span></div><p data-comment>Give the headline a little more room to breathe.</p></div><span class="agent-menu" aria-hidden="true"><span data-icon="dots"></span></span></div>
      <div class="agent-reply"><div><div class="agent-message"><span class="agent-avatar reply-avatar" data-reply-initial>E</span><div><div class="agent-meta"><strong data-reply-author>Engineer</strong><span>now</span></div><p data-reply>On it. Adjusting the spacing without changing the mobile layout.</p></div></div></div></div>

    </article>
    <div class="scene-resolved"><span data-icon="check"></span><span>Resolved</span></div>
  </div>
  <div class="scene-bottom"><div class="scene-people" aria-hidden="true"><span>D</span><span>E</span><span>P</span></div><span data-scene-status>Designer left a comment</span><div class="scene-steps" role="group" aria-label="Walkthrough scenes"><button data-scene-step="0" aria-label="Studio review" aria-pressed="true"></button><button data-scene-step="1" aria-label="Storefront review" aria-pressed="false"></button><button data-scene-step="2" aria-label="Dashboard review" aria-pressed="false"></button></div></div>
</section>`;
