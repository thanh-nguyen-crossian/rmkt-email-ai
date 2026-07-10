// ============================================================================
// SEAM #2 — CONTENT GENERATION (AI generate / regenerate)
//
// Default copy is modeled on the two REAL sent emails in
// `email-sent-template/*.eml` (voice: "Sandra @ BraGoddess" — warm, first-person
// thank-you, birthday/theme celebration, big o.f.f, midnight urgency, free ship
// over 💲, P.S. restock nudge). Parameterized by domain / theme / promo / segment.
//
// The content-agent dev replaces the body of `generateContent()` with a real AI
// call returning the SAME shape (HTML-string per block/segment/version). Keep the
// merge tags ({{first_name}} etc.) literal and the spam-dodge style ($→💲, off→o.f.f).
// ============================================================================

import type { Segment } from '../data/segments';

export type BlockKey = 'headline' | 'iknow' | 'offer' | 'ps' | 'story' | 'subject';

export type GenCtx = {
  domainName: string;
  theme: string;
  val: string;          // promo value, e.g. "75%"
  ship: string;         // e.g. "over 💲35", "on all orders", or ""
  seg?: Segment;        // current segment
  products: string[];   // product names p1..p6 of the segment
};

const shipLine = (s: string) => s || 'available';

export function generateContent(key: BlockKey, c: GenCtx, version: number): string {
  const v = Math.max(0, version | 0);
  const hero = c.products[0] || 'bestseller';
  const alt = c.products[3] || c.products[1] || hero;
  const chars = c.seg?.chars || '';
  const win = /rời bỏ|win-back|im /i.test(chars);
  const neu = /khách mới|đơn đầu/i.test(chars);
  const loyal = /trung thành|≥3 đơn/i.test(chars);

  switch (key) {
    case 'subject':
      return [
        `<div class="s-subj">🎁 [Thank You Gift] ${c.val} o.f.f your next upgrade</div><div class="s-pre"><span class="tagchip">{{first_name}}</span>, ${c.theme} markdowns vanish tonight!</div>`,
        `<div class="s-subj">💝 A thank-you: try our ${hero} at ${c.val} less</div><div class="s-pre"><span class="tagchip">{{first_name}}</span>, sorry but it ends TONIGHT.</div>`,
        `<div class="s-subj">Your ${c.val} o.f.f gift ends at midnight</div><div class="s-pre"><span class="tagchip">{{first_name}}</span>, a little something from ${c.domainName}.</div>`,
      ][v % 3];

    case 'headline':
      return [
        `<p><span class="accent">🎁 Happy ${c.theme} —</span><br><span class="accent">${c.val} o.f.f, gone by midnight.</span></p><p>Free shipping ${shipLine(c.ship)}. A little thank-you for your order.</p><p class="rev">Over 1,000,000 women obsessed · 4.9/5</p>`,
        `<p><span class="accent">Our ${c.theme} Flash S.a.l.e is on —</span><br><span class="accent">${c.val} o.f.f for the next 24 hours.</span></p><p>Free shipping ${shipLine(c.ship)}. This is the one that made us famous.</p><p class="rev">4.9/5 · 2,400+ reviews</p>`,
      ][v % 2];

    case 'story': {
      const opener = win
        ? `It's been a little while — and on this beautiful day, I invite you back to experience what truly made us famous.`
        : neu
        ? `Thank you so much for your first purchase with us! Trusting us with your style means everything, and I want to make your next choice even better.`
        : loyal
        ? `Thank you for coming back to us again and again — it genuinely means the world.`
        : `Thank you so much for choosing us! On this beautiful day, I wanted you to be one of the first to see this.`;
      return [
        `<p>Hello <span class="tagchip">{{first_name}}</span>,</p><p>${opener}</p><p>It's our <strong>${c.theme}</strong> celebration, and here's your gift: <strong>${c.val} o.f.f the ${hero}</strong> — gone by midnight tonight. If shaping and lift are what you love, this one pairs beautifully.</p>`,
        `<p>Hello <span class="tagchip">{{first_name}}</span>,</p><p>${opener}</p><p>For the next 24 hours, you can try our top-tier <strong>${hero}</strong> at <strong>${c.val} o.f.f</strong>. Wait until you feel this on your shoulders.</p>`,
      ][v % 2];
    }

    case 'iknow':
      return [
        `<p>A couple of our softer comfort styles are below too, in case you want to compare the feel.</p>`,
        `<p>I picked a few of our favorites for you below — see which one feels most like you.</p>`,
      ][v % 2];

    case 'offer':
      return [
        `<p>Free shipping kicks in ${shipLine(c.ship)}, so there's never been a better time to upgrade your comfort. This closes at <strong>midnight tonight</strong>.</p><p>Warmly,<br>Sandra</p>`,
        `<p>Shipping is on us ${shipLine(c.ship)} — making it the ideal time to come back and try what over 1,000,000 women are obsessed with. Ends <strong>midnight tonight</strong>.</p><p>Warmly,<br>Sandra</p>`,
      ][v % 2];

    case 'ps':
      return [
        `<p>P.S. With your eye for quality, I'm confident you'll love our newly restocked <span class="accent">${alt}</span> — but you know your needs best!</p>`,
        `<p>P.S. The ${hero} in our bestselling shade sells out fastest — midnight is closer than it feels.</p>`,
      ][v % 2];
  }
}
