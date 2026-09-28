/**
 * Desktop header fit guard (template 2026.09.8), decided before first paint.
 *
 * The header bar is one flex row: logo link · desktop nav · actions. When the
 * row is wider than the bar, the logo link shrinks: its img has
 * `max-width: 100%`, so it has no min-content width, and the nav (flex-basis 0)
 * can't shrink, so the logo absorbs the whole overflow — Kinexus's logo
 * rendered 0px wide on desktop, and at 768px every live site's logo was
 * squeezed (0–126px of its natural width).
 *
 * NAV_FIT_SCRIPT is an inline <script> layout.tsx emits right after <NavBar>,
 * so it runs while the page is parsed, before first paint and long before
 * hydration. It measures the row with the logo at its NATURAL width; if that
 * doesn't fit it sets `<html data-c5-nav-fit="collapse">`, and
 * src/styles/nav-fit.css (from md up) hides the desktop nav and shows the
 * menu button. Every row that fits emits nothing, so the page is exactly
 * 2026.09.7's (NavBar/MobileNav markup is unchanged). With JavaScript off
 * nothing is set either, and nav-fit.css clips the bar (scripting: none), so
 * no-JS is never worse than 2026.09.7.
 *
 * While the logo image is still loading its natural width is unknown (next/image
 * sizes the box from width/height props, 160×32 for every logo), so the script
 * waits for the image's load rather than guess. Re-measured on window resize,
 * a resize of the bar or of its content (logo link, nav, actions) and every
 * web-font load (document.fonts loadingdone). A re-measure while collapsed PROBES: it removes the
 * attribute, measures, and sets it again in the same task, so the
 * un-collapsed state is never painted.
 *
 * Plain ES5 in a string, so the exact same code is what ships inline and what
 * the unit tests execute (new Function('d', 'w', NAV_FIT_INSTALL)).
 */
export const NAV_FIT_ATTRIBUTE = 'data-c5-nav-fit'

/** Installer body. Parameters: d (document), w (window). Returns dispose(). */
export const NAV_FIT_INSTALL = `
var A = '${NAV_FIT_ATTRIBUTE}';
var h = d.documentElement;
var bar = d.querySelector('[data-component="navbar"] > div');
if (!bar) return function () {};
var frame = 0;
var stopped = false;
function measure() {
  var logo = bar.firstElementChild;
  var nav = bar.querySelector(':scope > nav');
  if (!logo || !nav) return;
  var img = logo.querySelector('img');
  if (img && !img.complete) return;
  if (h.getAttribute(A) !== null) h.removeAttribute(A);
  if (w.getComputedStyle(nav).display === 'none') return;
  var prev = logo.style.flexShrink;
  logo.style.flexShrink = '0';
  var cs = w.getComputedStyle(bar);
  var need = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  for (var c = bar.firstElementChild; c; c = c.nextElementSibling) need += c.getBoundingClientRect().width;
  logo.style.flexShrink = prev;
  if (need > bar.clientWidth + 1) h.setAttribute(A, 'collapse');
}
function schedule() {
  if (stopped || frame) return;
  frame = w.requestAnimationFrame(function () { frame = 0; if (!stopped) measure(); });
}
measure();
var logoImg = bar.firstElementChild && bar.firstElementChild.querySelector('img');
if (logoImg && !logoImg.complete) logoImg.addEventListener('load', schedule);
w.addEventListener('resize', schedule);
if (d.fonts) {
  // Cancelled by dispose(): the promise can settle after teardown.
  if (d.fonts.ready) d.fonts.ready.then(function () { if (!stopped) schedule(); });
  // Every web-font batch, not only the first: a late swap changes label widths.
  if (d.fonts.addEventListener) d.fonts.addEventListener('loadingdone', schedule);
}
if (w.ResizeObserver) {
  // The bar (viewport width) and its content: the logo link, the nav and the
  // actions change size when labels or the logo change.
  var ro = new w.ResizeObserver(schedule);
  ro.observe(bar);
  for (var k = bar.firstElementChild; k; k = k.nextElementSibling) ro.observe(k);
}
return function dispose() {
  stopped = true;
  if (frame) w.cancelAnimationFrame(frame);
  frame = 0;
  if (logoImg) logoImg.removeEventListener('load', schedule);
  w.removeEventListener('resize', schedule);
  if (d.fonts && d.fonts.removeEventListener) d.fonts.removeEventListener('loadingdone', schedule);
  if (ro) ro.disconnect();
};
`

/** The inline script. Any failure leaves the page exactly as 2026.09.7. */
// A second install (the script evaluated twice, e.g. a cached document
// re-parsed) disposes the first, so listeners never pile up.
export const NAV_FIT_SCRIPT = `(function(d,w){try{if(w.__c5NavFit)w.__c5NavFit();w.__c5NavFit=(function(){${NAV_FIT_INSTALL}})();}catch(e){}})(document,window)`
