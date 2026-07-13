import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type DragEvent } from 'react';
import { DOMAINS, DOMAIN_NAMES, type Domain, type Segment } from './data/segments';
import { generateContent, productCopy, type BlockKey } from './lib/content';
import { recommendTheme, THEME_OPTIONS } from './lib/occasions';

/* ========================================================================
   Email HTML Create — Part 1 (vibe-coded).
   3 SEAMS left for other devs:
     • SEAM #1  Create Template_ID  → button only toasts, stays on screen 1.
     • SEAM #2  content generation  → src/lib/content.ts (default content now).
     • SEAM #3  product images      → src/data/segments.ts (repo images now).
   ===================================================================== */

type Phase = 'empty' | 'gen' | 'ready';
type SegPhase = 'idle' | 'busy' | 'done';
type Stack = { versions: string[]; idx: number };
const SHARED_KEYS: BlockKey[] = ['headline', 'iknow', 'offer', 'ps'];

function sanitize(html: string): string {
  return html.replace(/<\/?(script|style)[^>]*>/gi, '').replace(/ on\w+="[^"]*"/gi, '');
}
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
// Demo design-brief text pre-filled for image 1 (P1) and image 4 (P4), derived
// from the real "BraGoddess Email Content.xlsx" product copy.
const BRIEF_PREFILL: Record<string, string> = {
  p0: 'Hero product shot for the July Champion. Model 55–65, warm genuine smile, wearing the bra in a soft lilac shade. Add a subtle upward lift arrow. Popout badge "85% o.f.f" top-right; small tag "Sold out last week!". Pastel-pink background with gentle depth (soft petals, no hard shadows). Overlay a 5-star review: "The most comfortable bra I\'ve ever worn — a miracle for my joints." — Irene C.',
  p3: 'Front-button "do-everything" bra worn by a relaxed senior model at home. Emphasize the easy front closure and no red marks. Popout "79% o.f.f"; tag "Loved by 50,000+ seniors". Include a small before/after (back view) inset. 5-star review: "No pinching, no red marks — comfort that lasts all day." — Clarissa C.',
};
function toDate(iso: string) { return new Date(iso + 'T00:00:00'); }
function niceDate(iso: string) {
  const d = toDate(iso);
  return d.getDate() + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
}
/* recommendTheme / THEME_OPTIONS now live in ./lib/occasions (ports the real
   EmailAuto Studio occasionsInWindow date→occasion method). */

/* editable rich-text hook (avoids React/contentEditable conflicts) */
function useEditable(content: string, onCommit: (html: string) => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [editing, setEditing] = useState(false);
  // Callback ref: write innerHTML when the node mounts AND whenever content
  // changes. A plain useEffect misses the mount here because the .etext node is
  // rendered conditionally on `ready` — when it appears the content prop hasn't
  // changed, so the effect wouldn't re-run and the block would stay blank.
  const setRef = useCallback((node: HTMLDivElement | null) => {
    ref.current = node;
    if (node && !editing) node.innerHTML = content;
  }, [content, editing]);
  const start = () => { setEditing(true); setTimeout(() => ref.current?.focus(), 0); };
  const blur = () => { setEditing(false); const html = sanitize(ref.current?.innerHTML || ''); if (html && html !== content) onCommit(html); };
  return { ref: setRef, editing, start, blur };
}

function Tools({ perSeg, verText, onEdit, onRegen, onNav }:
  { perSeg: boolean; verText: string; onEdit: () => void; onRegen: () => void; onNav: (d: number) => void }) {
  return (
    <div className="blk-tools">
      <span className={'scope ' + (perSeg ? 'seg' : 'all')} title={perSeg ? 'Regenerate affects THIS segment only' : 'Shared block — regenerate affects ALL segments'}>{perSeg ? 'SEG' : 'ALL'}</span>
      <button title="Edit text" onClick={onEdit}>✏️</button><span className="sep" />
      <button title="Previous version" onClick={() => onNav(-1)}>‹</button>
      <span className="ver">{verText}</span>
      <button title="Next version" onClick={() => onNav(1)}>›</button>
      <span className="sep" /><button title="Regenerate" onClick={onRegen}>🔄</button>
    </div>
  );
}

type BlockProps = {
  keyName: BlockKey; perSeg: boolean; ready: boolean; filling: boolean;
  content: string; verText: string; ghost: string[]; center?: boolean;
  onCommit: (html: string) => void; onRegen: () => void; onNav: (d: number) => void;
};
function Block(p: BlockProps) {
  const ed = useEditable(p.content, p.onCommit);
  return (
    <div className={'eb ' + (p.center ? 'center ' : '') + (p.ready ? 'filled' : '')}>
      {!p.ready && (
        <div className={'ghost ' + (p.center ? 'g-center ' : '') + (p.filling ? 'filling' : '')}>
          {p.ghost.map((w, i) => <div key={i} className={'gl ' + w} style={i === p.ghost.length - 1 ? { marginBottom: 0 } : undefined} />)}
        </div>
      )}
      {p.ready && <div className="etext" ref={ed.ref} contentEditable={ed.editing} suppressContentEditableWarning onBlur={ed.blur} />}
      {p.ready && <Tools perSeg={p.perSeg} verText={p.verText} onEdit={ed.start} onRegen={p.onRegen} onNav={p.onNav} />}
    </div>
  );
}

function SubjectBlock({ content, verText, onCommit, onRegen, onNav }:
  { content: string; verText: string; onCommit: (h: string) => void; onRegen: () => void; onNav: (d: number) => void }) {
  const ed = useEditable(content, onCommit);
  return (
    <div className="eb inbox filled" style={{ padding: 0, boxShadow: 'none', margin: 0, background: 'transparent' }}>
      <div className="etext" ref={ed.ref} contentEditable={ed.editing} suppressContentEditableWarning onBlur={ed.blur} />
      <Tools perSeg verText={verText} onEdit={ed.start} onRegen={onRegen} onNav={onNav} />
    </div>
  );
}

function Acc({ n, title, summary, open, onToggle, children }:
  { n: number; title: string; summary: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div className={'acc ' + (open ? 'open' : '')}>
      <div className="acc-head" onClick={onToggle}>
        <div className="num">{n}</div>
        <div className="t"><b>{title}</b><span>{summary}</span></div>
        <div className="chev">▼</div>
      </div>
      <div className="acc-body"><div className="acc-inner">{children}</div></div>
    </div>
  );
}

const GHOST: Record<BlockKey, string[]> = {
  headline: ['w60','w75','w45','w60'], story: ['w90','w75','w90','w60'],
  iknow: ['w90','w75'], offer: ['w90','w90','w60'], ps: ['w75'], subject: ['w75','w90'],
};
const PL_LABEL: Record<string, string> = { stack: 'Stacked · 1 col', two: '2 per row', three: '3 per row', hero: 'Hero + 2 per row' };
const FLOW_LABEL: Record<string, string> = { continuous: 'Continuous body', opener: 'Opener + products', custom: 'Custom flow' };

export default function App() {
  const [domainName, setDomainName] = useState('BraGoddess');
  const [sendDate, setSendDate] = useState('2026-07-08');
  const [theme, setTheme] = useState(recommendTheme('2026-07-08').theme);
  const [promoType, setPromoType] = useState('% Discount');
  const [promoVal, setPromoVal] = useState('75%');
  const [ship, setShip] = useState('Orders $35+');
  const [curSeg, setCurSeg] = useState('T1');
  // Locked until Generate. On Generate the email unlocks and fills with the default
  // template content (lib/content.ts) so the regenerate/edit tools are demoable.
  // Dev plugs the real AI into the generation seam: phase 1 = fill on Generate,
  // phase 2 = Regenerate (see runGeneration + lib/content.ts).
  const [phase, setPhase] = useState<Phase>('empty');
  const [segState, setSegState] = useState<Record<string, SegPhase>>(() => Object.fromEntries(DOMAINS.BraGoddess.segs.map((s) => [s.code, 'idle'])));
  const [sharedFilled, setSharedFilled] = useState<Record<string, boolean>>({});
  const [charsEdited, setCharsEdited] = useState<Record<string, string>>({});
  const [shared, setShared] = useState<Record<string, Stack>>({});
  const [perSeg, setPerSeg] = useState<Record<string, Record<string, Stack>>>({});
  const [shimmer, setShimmer] = useState<Record<string, boolean>>({});
  const [prodLayout, setProdLayout] = useState('hero');
  const [bodyFlow, setBodyFlow] = useState('custom');
  const [moduleOrder, setModuleOrder] = useState<string[]>(['headline','story','tiles','iknow','offer','ps']);
  const [imgOverride, setImgOverride] = useState<Record<string, string>>({});
  const [bannerOverride, setBannerOverride] = useState<Record<string, string>>({});
  // Products: AI recommends the 6 slots, but a marketer can swap any slot (e.g. the
  // recommended product is sold out). `oos` = out-of-stock catalog keys (global);
  // `slotOverride` = per-segment slot assignments once edited (default = seg.prods).
  const [oos, setOos] = useState<string[]>([]);
  const [slotOverride, setSlotOverride] = useState<Record<string, string[]>>({});
  // Design-brief popup (Task 2): opens after Generate; per-image brief text keyed
  // by 'banner' | 'p0'..'p5'. activeImg = the image whose brief panel is open.
  const [briefOpen, setBriefOpen] = useState(false);
  const [activeImg, setActiveImg] = useState<string | null>(null);
  const [briefText, setBriefText] = useState<Record<string, string>>(BRIEF_PREFILL);
  const [width, setWidth] = useState<'desktop' | 'mobile'>('desktop');
  const [dark, setDark] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [subjStyle, setSubjStyle] = useState(0);
  const [accOpen, setAccOpen] = useState([true, true, true, true]);
  const [saved, setSaved] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState('');
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const savedT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const toastT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dragKey = useRef<string | null>(null);

  const D: Domain = DOMAINS[domainName];
  const codes = useMemo(() => D.segs.map((s) => s.code), [D]);
  const seg = (code: string): Segment => D.segs.find((s) => s.code === code) || D.segs[0];
  const prod = (key: string) => D.catalog[key] || { name: key, img: '', price: '' };
  const locked = phase === 'empty';

  // The 6 product keys currently in a segment's slots (AI default, or the marketer's edits).
  const slotsFor = (code: string): string[] => slotOverride[code] ?? seg(code).prods;
  // Replacements offered for slot i: any catalog product that is in stock AND not already
  // used in one of the OTHER 5 slots of this segment (the current slot's own product stays).
  const availFor = (code: string, i: number): string[] => {
    const used = new Set(slotsFor(code).filter((_, j) => j !== i));
    return Object.keys(D.catalog).filter((k) => !oos.includes(k) && !used.has(k));
  };
  function swapSlot(code: string, i: number, key: string) {
    setSlotOverride((p) => { const cur = (p[code] ?? seg(code).prods).slice(); cur[i] = key; return { ...p, [code]: cur }; });
    toast('P' + (i + 1) + ' → ' + prod(key).name); savedTick();
  }
  // Mark the slot's product out of stock and auto-swap it for the first in-stock, unused product.
  function markOOS(code: string, i: number) {
    const cur = slotsFor(code); const dead = cur[i];
    const used = new Set(cur.filter((_, j) => j !== i));
    const repl = Object.keys(D.catalog).find((k) => k !== dead && !used.has(k) && !oos.includes(k));
    setOos((p) => (p.includes(dead) ? p : [...p, dead]));
    if (repl) setSlotOverride((p) => { const c = (p[code] ?? seg(code).prods).slice(); c[i] = repl; return { ...p, [code]: c }; });
    toast(prod(dead).name + ' marked out of stock' + (repl ? ' → replaced with ' + prod(repl).name : ' — no in-stock replacement left')); savedTick();
  }
  const restoreStock = (key: string) => { setOos((p) => p.filter((k) => k !== key)); toast(prod(key).name + ' back in stock'); savedTick(); };

  useEffect(() => { document.documentElement.style.setProperty('--accent', D.accent); }, [D]);

  const toast = (m: string) => { setToastMsg(m); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToastMsg(''), 2600); };
  const savedTick = () => { if (phase !== 'ready') return; setSaved('Saving…'); clearTimeout(savedT.current); savedT.current = setTimeout(() => setSaved('Saved · just now'), 600); };

  const shipTxt = () => { if (ship === 'None') return ''; if (ship === 'All orders') return 'on all orders'; const m = ship.match(/\$(\d+)/); return m ? 'over 💲' + m[1] : 'available'; };
  const gen = (key: BlockKey, code: string, v: number) =>
    generateContent(key, { domainName, theme, val: promoVal, ship: shipTxt(), seg: seg(code), products: slotsFor(code).map((k) => prod(k).name) }, v);

  const sharedContent = (key: BlockKey) => shared[key] ? shared[key].versions[shared[key].idx] : gen(key, curSeg, 0);
  const segContent = (key: BlockKey) => { const s = perSeg[curSeg]?.[key]; return s ? s.versions[s.idx] : gen(key, curSeg, 0); };
  const sharedVer = (key: BlockKey) => shared[key] ? `${shared[key].idx + 1}/${shared[key].versions.length}` : '1/1';
  const segVer = (key: BlockKey) => { const s = perSeg[curSeg]?.[key]; return s ? `${s.idx + 1}/${s.versions.length}` : '1/1'; };

  const pushShared = (key: BlockKey, html: string) => setShared((p) => { const cur = p[key] || { versions: [gen(key, curSeg, 0)], idx: 0 }; const versions = cur.versions.slice(0, cur.idx + 1).concat(html); return { ...p, [key]: { versions, idx: versions.length - 1 } }; });
  const regenShared = (key: BlockKey) => setShared((p) => { const cur = p[key] || { versions: [gen(key, curSeg, 0)], idx: 0 }; const versions = cur.versions.slice(0, cur.idx + 1).concat(gen(key, curSeg, cur.versions.length)); return { ...p, [key]: { versions, idx: versions.length - 1 } }; });
  const navShared = (key: BlockKey, d: number) => setShared((p) => { const cur = p[key]; if (!cur) return p; return { ...p, [key]: { ...cur, idx: Math.max(0, Math.min(cur.versions.length - 1, cur.idx + d)) } }; });
  const pushSeg = (code: string, key: BlockKey, html: string) => setPerSeg((p) => { const sg = p[code] || {}; const cur = sg[key] || { versions: [gen(key, code, 0)], idx: 0 }; const versions = cur.versions.slice(0, cur.idx + 1).concat(html); return { ...p, [code]: { ...sg, [key]: { versions, idx: versions.length - 1 } } }; });
  const regenSeg = (code: string, key: BlockKey) => setPerSeg((p) => { const sg = p[code] || {}; const cur = sg[key] || { versions: [gen(key, code, 0)], idx: 0 }; const versions = cur.versions.slice(0, cur.idx + 1).concat(gen(key, code, cur.versions.length)); return { ...p, [code]: { ...sg, [key]: { versions, idx: versions.length - 1 } } }; });
  const navSeg = (code: string, key: BlockKey, d: number) => setPerSeg((p) => { const sg = p[code]; if (!sg?.[key]) return p; const cur = sg[key]; return { ...p, [code]: { ...sg, [key]: { ...cur, idx: Math.max(0, Math.min(cur.versions.length - 1, cur.idx + d)) } } }; });

  const doneCount = () => codes.filter((c) => segState[c] === 'done').length;
  function runGeneration(regenAll: boolean) {
    if (phase === 'gen') return;
    setPhase('gen'); setLayoutOpen(false); timers.current = [];
    let t = 400;
    SHARED_KEYS.forEach((k) => {
      if (sharedFilled[k] && !regenAll) return;
      timers.current.push(setTimeout(() => setShimmer((p) => ({ ...p, [k]: true })), t));
      timers.current.push(setTimeout(() => { setShimmer((p) => ({ ...p, [k]: false })); setSharedFilled((p) => ({ ...p, [k]: true })); if (regenAll && sharedFilled[k]) regenShared(k); }, t + 430));
      t += 460;
    });
    const tg = codes.filter((c) => regenAll || segState[c] !== 'done');
    tg.forEach((c, i) => {
      timers.current.push(setTimeout(() => setSegState((p) => ({ ...p, [c]: 'busy' })), t + i * 600));
      timers.current.push(setTimeout(() => { setSegState((p) => ({ ...p, [c]: 'done' })); if (regenAll) { regenSeg(c, 'subject'); regenSeg(c, 'story'); } }, t + i * 600 + 540));
    });
    timers.current.push(setTimeout(() => { setPhase('ready'); setSaved('Saved · just now'); toast('Draft ready — all ' + codes.length + ' segments · Score 86'); }, t + tg.length * 600 + 300));
  }
  function cancelGeneration() {
    timers.current.forEach(clearTimeout); timers.current = [];
    setSegState((p) => { const n = { ...p }; codes.forEach((c) => { if (n[c] === 'busy') n[c] = 'idle'; }); return n; });
    setShimmer({});
    setPhase(doneCount() > 0 ? 'ready' : 'empty');
    toast('Cancelled — kept ' + doneCount() + ' segments');
  }

  function switchDomain(name: string) {
    timers.current.forEach(clearTimeout); timers.current = [];
    const dm = DOMAINS[name];
    setDomainName(name);
    setSegState(Object.fromEntries(dm.segs.map((s) => [s.code, 'idle'])));
    setCurSeg(dm.segs[0].code);
    setShared({}); setPerSeg({}); setSharedFilled({}); setCharsEdited({}); setShimmer({});
    setImgOverride({}); setBannerOverride({}); setOos([]); setSlotOverride({}); setPhase('empty'); setLayoutOpen(false);
    setBriefOpen(false); setActiveImg(null); setBriefText(BRIEF_PREFILL);
    setTheme(recommendTheme(sendDate).theme);
    toast(name + (dm.real ? ' selected — real segment data loaded' : ' selected — sample data'));
  }
  function onDate(iso: string) { setSendDate(iso); const r = recommendTheme(iso); setTheme(r.theme); toast('Send date set — theme re-recommended: ' + r.theme); }

  const tiles = slotsFor(curSeg).map((key, i) => {
    const p = prod(key); const ov = imgOverride[`${curSeg}_${i}`];
    return { key, i, name: p.name, price: p.price, src: ov || p.img, oos: oos.includes(key), copy: productCopy(key) };
  });
  function changeTileUrl(i: number) {
    const cur = imgOverride[`${curSeg}_${i}`] || prod(slotsFor(curSeg)[i]).img;
    const u = window.prompt('Paste new image URL:', cur);
    if (u) { setImgOverride((p) => ({ ...p, [`${curSeg}_${i}`]: u.trim() })); toast('Image updated'); savedTick(); }
  }
  const bannerSrc = bannerOverride[domainName] || D.banner;
  const briefLabel = (k: string) => k === 'banner' ? 'Banner (1200×420 px)' : `Image ${+k.slice(1) + 1} · ${tiles[+k.slice(1)]?.name ?? ''}`;
  const dockSide = (k: string) => (k !== 'banner' && +k.slice(1) % 2 === 1) ? 'right' : 'left';
  const briefImg = (k: string, src: string) => {
    const has = !!(briefText[k] || '').trim();
    return (
      <div className={'brief-img' + (activeImg === k ? ' active' : '') + (has ? ' has' : '')}>
        <img src={src} alt={briefLabel(k)} draggable={false} />
        <button className="brief-edit" onClick={() => setActiveImg(k)}>✎ Brief new design</button>
        {has && <span className="brief-has">✓ brief</span>}
      </div>
    );
  };
  function changeBannerUrl() {
    const u = window.prompt('Paste new banner image URL:', bannerSrc);
    if (u) { setBannerOverride((p) => ({ ...p, [domainName]: u.trim() })); toast('Banner updated'); savedTick(); }
  }

  function applyFlow(f: string) {
    setBodyFlow(f);
    if (f === 'continuous') setModuleOrder(['headline','story','iknow','offer','ps','tiles']);
    else if (f === 'opener') setModuleOrder(['headline','story','tiles','iknow','offer','ps']);
    toast('Body placement: ' + FLOW_LABEL[f]); savedTick();
  }
  function onDragOver(e: DragEvent<HTMLDivElement>, key: string) {
    if (bodyFlow !== 'custom' || !dragKey.current || dragKey.current === key) return;
    e.preventDefault();
    setModuleOrder((order) => {
      const from = order.indexOf(dragKey.current as string); const to = order.indexOf(key);
      if (from < 0 || to < 0) return order;
      const n = order.slice(); n.splice(from, 1); n.splice(to, 0, dragKey.current as string); return n;
    });
  }

  function applySubjStyle(k: number) {
    if (segState[curSeg] !== 'done') { toast('Generate first — subject styles apply to generated segments'); return; }
    setSubjStyle(k); pushSeg(curSeg, 'subject', gen('subject', curSeg, k)); toast('Subject style ' + (k + 1) + ' applied (' + curSeg + ')'); savedTick();
  }

  function download(name: string, html: string) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' })); a.download = name; a.click();
  }
  // Final export from the design-brief popup: one card per image that has a brief —
  // each shows the CURRENT image (so the designer sees which asset, on what base) +
  // the brief text. Then close the popup and return to screen 1 (Email HTML Create).
  function exportDesignBrief() {
    const entries = Object.keys(briefText).filter((k) => (briefText[k] || '').trim());
    const srcFor = (k: string) => k === 'banner' ? bannerSrc : (imgOverride[`${curSeg}_${+k.slice(1)}`] || prod(slotsFor(curSeg)[+k.slice(1)]).img);
    const abs = (src: string) => /^https?:/i.test(src) ? src : location.origin + src;
    const cards = entries.map((k) => {
      const src = srcFor(k);
      return `<div class="bcard"><h3>${escapeHtml(briefLabel(k))}</h3><div class="cur"><img src="${abs(src)}" alt=""><div class="cap">Current image to redesign<br><code>${escapeHtml(src.split('/').pop() || '')}</code></div></div><div class="lbl">Brief</div><pre>${escapeHtml(briefText[k])}</pre></div>`;
    }).join('');
    const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Design brief — ${domainName}</title><style>body{font-family:Arial,sans-serif;max-width:820px;margin:24px auto;padding:0 16px;color:#172018}h1{font-size:22px;margin-bottom:2px}.sub{color:#667;font-size:13px;margin-bottom:18px}.bcard{border:1px solid #e2e6f0;border-radius:10px;padding:16px;margin-bottom:14px;background:#f8f9fc}.bcard h3{margin:0 0 10px;font-size:15px;color:#22409A}.cur{display:flex;gap:14px;align-items:center;margin-bottom:12px}.cur img{width:150px;height:auto;border-radius:8px;border:1px solid #dfe4ee;background:#fff}.cur .cap{font-size:12px;color:#667;line-height:1.5}.cur code{font-family:Consolas,monospace;font-size:11px;color:#334}.lbl{font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.4px;color:#8a8f9c;margin-bottom:4px}.bcard pre{white-space:pre-wrap;font:inherit;font-size:13px;line-height:1.55;margin:0}</style></head><body><h1>🎨 Design brief — ${domainName}</h1><div class="sub">${curSeg} · ${escapeHtml(seg(curSeg).name)} · ${niceDate(sendDate)} · ${escapeHtml(theme)} · ${entries.length} image brief(s)</div>${cards || '<p>No image briefs added.</p>'}</body></html>`;
    download(`design_brief_${domainName}_${curSeg}_${sendDate}.html`, doc);
    toast('🎨 Design brief exported — ' + entries.length + ' image brief(s)');
    setBriefOpen(false); setActiveImg(null);
  }
  function currentSubjectText() { const m = segContent('subject').match(/s-subj">([^<]*)/); return m ? m[1] : ''; }
  function buildEmailHtml() {
    const tileHtml = tiles.map((t) => `<div style="flex:1 1 calc(50% - 6px)"><img src="${t.src}" style="width:100%;display:block"><div style="text-align:center;font-weight:700;padding-top:6px">${t.name}</div><div style="text-align:center;color:${D.accent};font-weight:800">${t.price}</div></div>`).join('');
    const body = `<img src="${bannerSrc}" style="width:100%;display:block">
      <div style="padding:6px 10px;text-align:center">${sharedContent('headline')}</div>
      <div style="padding:6px 10px">${segContent('story')}</div>
      <div style="display:flex;flex-wrap:wrap;gap:12px;padding:12px 10px">${tileHtml}</div>
      <div style="padding:6px 10px">${sharedContent('iknow')}</div>
      <div style="padding:6px 10px">${sharedContent('offer')}</div>
      <div style="padding:6px 10px">${sharedContent('ps')}</div>
      <div style="padding:16px;text-align:center;color:#8a8f9c;font-size:11px">Unsubscribe: {{unsubscribe}}</div>`;
    const head = `<!--\n  Domain: ${domainName}\n  Segment: ${curSeg} · ${seg(curSeg).name}\n  Subject: ${currentSubjectText()}\n  Merge tags preserved — replaced by SendGrid at send time.\n-->\n`;
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>.accent{color:${D.accent};font-weight:700}.rev{font-style:italic}.tagchip{font-family:monospace}p{margin:0 0 8px}</style></head><body>${head}<div style="max-width:600px;margin:0 auto;font-family:arial,sans-serif">${body}</div></body></html>`;
  }
  // SEAM #1 — Part 2: create a SendGrid Dynamic Template + auto-log to the tracking
  // sheet. Backend: /api/create-template (Vercel serverless, same repo). Same-origin
  // on the Vercel deploy; set VITE_API_BASE to the Vercel URL for GitHub Pages builds.
  // Sheet naming convention (matches existing tracking-sheet rows):
  // {Domain}_{Ddd}{D}{Mon}{YY}_{segCode} — e.g. BraGoddess_Fri10Jul26_21 (day unpadded).
  function templateName() {
    const d = toDate(sendDate);
    const ddd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
    const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
    return `${domainName}_${ddd}${d.getDate()}${mon}${String(d.getFullYear()).slice(-2)}_${curSeg}`;
  }

  async function createTemplateId() {
    if (segState[curSeg] !== 'done' || pushing) return;
    setPushing(true);
    toast('Creating SendGrid template… (' + curSeg + ')');
    const name = templateName();
    try {
      const base = (import.meta.env.VITE_API_BASE as string | undefined) || '';
      const res = await fetch(base + '/api/create-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          subject: currentSubjectText(),
          html: buildEmailHtml(),
          segment: curSeg,
          domain: domainName,
          sendDate,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { templateId?: string; sheetLogged?: boolean; error?: string; sheetError?: string };
      if (!res.ok || !data.templateId) throw new Error(data.error || 'HTTP ' + res.status);
      setPushResult({
        ok: true,
        msg: `${name}\nTemplate ID: ${data.templateId}\nGoogle Sheet: ${data.sheetLogged ? 'row added ✓' : 'write FAILED ✗' + (data.sheetError ? '\n' + data.sheetError : '')}`,
      });
    } catch (err) {
      setPushResult({ ok: false, msg: `${name}\n${err instanceof Error ? err.message : 'unknown error'}` });
    } finally {
      setPushing(false);
    }
  }

  const themeRec = recommendTheme(sendDate);
  const canHandoff = segState[curSeg] === 'done';
  const sumPromo = promoVal + ' off · ' + (ship === 'None' ? 'no free ship' : ship === 'All orders' ? 'free ship all' : 'free ship ' + ship.replace('Orders ', ''));
  const toggleAcc = (i: number) => setAccOpen((a) => a.map((v, j) => (j === i ? !v : v)));

  function renderModule(key: string) {
    if (key === 'tiles') {
      return (
        <div className={'tiles l-' + prodLayout}>
          {tiles.map((t) => (
            <div className={'tile' + (t.oos ? ' oos' : '')} key={t.i}>
              <div className="eimg">
                <span className="pbadge">P{t.i + 1}</span>
                {t.oos ? <span className="oosrib">Out of stock</span> : <span className="popout">{t.copy.popout}</span>}
                <img src={t.src} alt={t.name} draggable={false} />
                {!locked && <span className="eimg-ovl"><span className="cap">🖼 {t.name}</span><span><button onClick={() => changeTileUrl(t.i)}>Change URL</button></span></span>}
              </div>
              <div className="tiletag">{t.copy.tag}</div>
              <div className="tilecap">{t.name}</div>
              <div className="tilemain">{t.copy.main}</div>
              <div className="tilereview">★★★★★ “{t.copy.review}” — {t.copy.reviewer}</div>
              <div className="tileprice">{t.price}</div>
              <div className="tilecta">🛒 Add to cart</div>
            </div>
          ))}
        </div>
      );
    }
    const k = key as BlockKey;
    const isSeg = k === 'story';
    const ready = isSeg ? segState[curSeg] === 'done' : !!sharedFilled[k];
    const filling = !!shimmer[k] || (isSeg && segState[curSeg] === 'busy');
    return (
      <Block keyName={k} perSeg={isSeg} ready={ready} filling={filling} center={k === 'headline'}
        content={isSeg ? segContent(k) : sharedContent(k)} verText={isSeg ? segVer(k) : sharedVer(k)} ghost={GHOST[k]}
        onCommit={(html) => { if (isSeg) pushSeg(curSeg, k, html); else pushShared(k, html); toast('New version saved' + (isSeg ? ' (' + curSeg + ')' : '')); savedTick(); }}
        onRegen={() => { if (isSeg) regenSeg(curSeg, k); else regenShared(k); toast('AI regenerated' + (isSeg ? ' — ' + curSeg + ' only' : ' — applied to ALL segments')); savedTick(); }}
        onNav={(d) => { if (isSeg) navSeg(curSeg, k, d); else navShared(k, d); savedTick(); }} />
    );
  }

  return (
    <>
      <header className="topbar">
        <div className="logo">{domainName[0]}</div>
        <div className="name">EmailAuto <span className="sub">· Email HTML Create</span></div>
      </header>

      <div className="tabpage on">
        <div className="app">
          <aside className="left">
            <div className="steps">
              <Acc n={1} title="Domain" summary={domainName} open={accOpen[0]} onToggle={() => toggleAcc(0)}>
                <div className="field"><label>Domain</label>
                  <div className="dcards">
                    {DOMAIN_NAMES.map((name) => (
                      <button key={name} className={'dcard ' + (name === domainName ? 'on' : '')} onClick={() => switchDomain(name)}>
                        <span className="dc-logo" style={{ background: DOMAINS[name].accent }}>{name[0]}</span>{name}
                        {DOMAINS[name].real && <span className="dc-tag">● real data</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </Acc>

              <Acc n={2} title="Send date & Theme" summary={niceDate(sendDate) + ' · ' + theme} open={accOpen[1]} onToggle={() => toggleAcc(1)}>
                <div className="field"><label>Send date</label><input className="inp" type="date" value={sendDate} onChange={(e) => onDate(e.target.value)} /></div>
                <div className="field"><label>Theme <span className="recstar">★ recommended from send date</span></label>
                  <select className="sel" value={theme} onChange={(e) => setTheme(e.target.value)}>
                    {THEME_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="hint">Send date → recommended theme <b>{themeRec.theme}</b> ({themeRec.why}). Change it anytime.</div>
              </Acc>

              <Acc n={3} title="Products & content" summary={seg(curSeg).name + ' · 6 products'} open={accOpen[2]} onToggle={() => toggleAcc(2)}>
                <div className="field"><label>Segment (focus) — all {codes.length} segments generate</label>
                  <select className="sel" value={curSeg} onChange={(e) => setCurSeg(e.target.value)}>
                    {codes.map((c) => <option key={c} value={c}>{c} · {seg(c).name}{segState[c] === 'done' ? ' ✓' : ''}</option>)}
                  </select>
                </div>
                <div className="field"><label>Products — P1–P{tiles.length} <span className="recstar">★ AI-recommended</span></label>
                  <div className="pslots">
                    {tiles.map((t) => (
                      <div className={'pslot' + (t.oos ? ' oos' : '')} key={t.i}>
                        <span className="sl">P{t.i + 1}</span>
                        <select className="psel" value={t.key} onChange={(e) => swapSlot(curSeg, t.i, e.target.value)} title="Swap this product (in-stock, not already used)">
                          {t.oos && <option value={t.key} disabled>{t.name} — out of stock</option>}
                          {availFor(curSeg, t.i).map((k) => <option key={k} value={k}>{prod(k).name}</option>)}
                        </select>
                        <button className="oosbtn" title="Mark out of stock & auto-replace with an available product" onClick={() => markOOS(curSeg, t.i)}>⊘</button>
                      </div>
                    ))}
                  </div>
                  {oos.length > 0 && (
                    <div className="ooslist"><span className="oostag">Out of stock:</span>{oos.map((k) => (
                      <button className="ooschip" key={k} title="Mark back in stock" onClick={() => restoreStock(k)}>{prod(k).name} ✕</button>
                    ))}</div>
                  )}
                  <div className="hint">AI recommends 6 products per segment. Swap any slot if a product is sold out — the picker only offers in-stock products not already used in this segment. “⊘” marks it out of stock and auto-replaces it.</div>
                </div>
                <div className="field"><label>Content characteristics (steers the AI)</label>
                  <textarea className="chars" value={charsEdited[curSeg] ?? seg(curSeg).chars} onChange={(e) => { setCharsEdited((p) => ({ ...p, [curSeg]: e.target.value })); savedTick(); }} />
                  <div className="hint">Prefilled from the segment's characteristics. Edit to steer tone/angle before Generate.</div>
                </div>
              </Acc>

              <Acc n={4} title="Promo" summary={sumPromo} open={accOpen[3]} onToggle={() => toggleAcc(3)}>
                <div className="row2">
                  <div className="field"><label>Promo type</label><select className="sel" value={promoType} onChange={(e) => setPromoType(e.target.value)}>{['% Discount','Buy X get Y','Free gift','Flash sale'].map((o) => <option key={o}>{o}</option>)}</select></div>
                  <div className="field small"><label>Value</label><input className="inp" value={promoVal} onChange={(e) => setPromoVal(e.target.value)} /><div className="hint">default 75%</div></div>
                </div>
                <div className="field"><label>Free shipping</label><select className="sel" value={ship} onChange={(e) => setShip(e.target.value)}>{['Orders $35+','Orders $50+','All orders','None'].map((o) => <option key={o}>{o}</option>)}</select></div>
              </Acc>
            </div>

            <div className="genwrap">
              <button className="btn-gen" disabled={phase === 'gen'} onClick={() => runGeneration(doneCount() === codes.length)}>
                {phase === 'gen' ? `⏳ Generating… ${doneCount()}/${codes.length} segments` : doneCount() === codes.length ? '↻ Regenerate All' : doneCount() > 0 ? '⚡ Generate remaining segments' : '⚡ Generate Email'}
              </button>
              {phase === 'gen' && <button className="btn-cancel" onClick={cancelGeneration}>✕ Cancel</button>}
            </div>
          </aside>

          <main className="right">
            <div className="pv-top">
              <h2>Draft Overview</h2>
              {saved && <span className="saved">{saved}</span>}
              <div className="spacer" />
              <div className="seg">
                <button className={width === 'desktop' ? 'on' : ''} onClick={() => setWidth('desktop')}>Desktop</button>
                <button className={width === 'mobile' ? 'on' : ''} onClick={() => setWidth('mobile')}>Mobile</button>
              </div>
              <label className="toggle" onClick={() => setDark((v) => !v)}>Dark inbox <span className={'switch ' + (dark ? 'on' : '')} /></label>
              <button className="btn-exp" disabled={!canHandoff} title={canHandoff ? '' : 'Generate first'} onClick={() => { setBriefOpen(true); setActiveImg(null); }}>🎨 Export design brief</button>
            </div>

            <div className="segbar">
              <span className="segpick">
                <span className="sp-let">{curSeg}</span>
                <span><span className="sp-lbl">Segment</span><br />
                  <select value={curSeg} onChange={(e) => setCurSeg(e.target.value)}>
                    {codes.map((c) => <option key={c} value={c}>{c} · {seg(c).name}{segState[c] === 'done' ? ' ✓' : segState[c] === 'busy' ? ' ⏳' : ''}</option>)}
                  </select>
                </span>
                <span className={'sp-status ' + (segState[curSeg] === 'done' ? 'done' : segState[curSeg] === 'busy' ? 'busy' : 'idle')}>
                  {segState[curSeg] === 'done' ? 'generated' : segState[curSeg] === 'busy' ? 'generating…' : 'not generated'}
                </span>
              </span>
              {phase === 'ready' && <button className="qchip" onClick={() => toast('⚠ Segment T8 repurchase 27% — below target · ⚠ 1 subject over 60 chars')}>Score 86 · 2 ⚠</button>}
              <span className="spacer" />
              <button className="laybtn" disabled={locked} onClick={() => setLayoutOpen((v) => !v)}>🧩 Layout <span>· {PL_LABEL[prodLayout]} · {FLOW_LABEL[bodyFlow]}</span> <span className="car">▾</span></button>
            </div>

            {layoutOpen && (
              <div className="laypanel">
                <div className="lgroup"><div className="glbl">Subject style · 3 styles</div>
                  <div className="lrow">{['S1 · Direct','S2 · Benefit','S3 · Urgency'].map((s, i) => <button key={i} className={'schip ' + (subjStyle === i ? 'on' : '')} onClick={() => applySubjStyle(i)}>{s}</button>)}</div>
                </div>
                <div className="lgroup"><div className="glbl">Product layout</div>
                  <div className="lrow">
                    {(['stack','two','three','hero'] as const).map((l) => (
                      <div key={l} className={'lopt ' + (prodLayout === l ? 'on' : '')} onClick={() => { setProdLayout(l); toast('Product layout: ' + PL_LABEL[l]); savedTick(); }}>
                        <div className="g"><div className="gb" style={{ width: 22, height: 6 }} /></div>{PL_LABEL[l]}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="lgroup"><div className="glbl">Body placement</div>
                  <div className="lrow">
                    {(['continuous','opener','custom'] as const).map((f) => (
                      <div key={f} className={'fopt ' + (bodyFlow === f ? 'on' : '')} onClick={() => applyFlow(f)}><b>{FLOW_LABEL[f]}</b>{f === 'custom' ? <><div className="frow">Drag</div><div className="frow">modules</div></> : <div className="frow">preset order</div>}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {locked && <div className="pv-hint">🔒 Preview locked — pick your setup on the left, then press <b>Generate Email</b> to build it</div>}
            {phase === 'gen' && <div className="pv-hint"><b>Generating…</b> foundation first, then one patch per segment</div>}

            <div className={'canvas ' + (dark ? 'dark' : '')}>
              <div className={'pvcol ' + (width === 'mobile' ? 'mobile' : '')}>
                <div className="inbox">
                  <div className="inbox-row">
                    <div className="avatar">{domainName[0]}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="meta">{D.sender} · 7:00 PM · Inbox preview</div>
                      {segState[curSeg] === 'done'
                        ? <SubjectBlock content={segContent('subject')} verText={segVer('subject')} onCommit={(h) => { pushSeg(curSeg, 'subject', h); toast('New version saved (' + curSeg + ')'); savedTick(); }} onRegen={() => { regenSeg(curSeg, 'subject'); toast('AI regenerated — ' + curSeg + ' only'); savedTick(); }} onNav={(d) => { navSeg(curSeg, 'subject', d); savedTick(); }} />
                        : <div className={'ghost ' + (segState[curSeg] === 'busy' ? 'filling' : '')}><div className="gl w75" /><div className="gl w90" style={{ marginBottom: 0 }} /></div>}
                    </div>
                  </div>
                </div>

                <div className={'email ' + (locked ? 'locked ' : '') + (bodyFlow === 'custom' && !locked ? 'dragmode' : '')}>
                  {locked && <div className="lockovl"><div className="lockcard"><div className="ic">🔒</div><b>Preview locked</b><p>Press <b>⚡ Generate Email</b> to build your on-brand email — then edit text & images inline.</p></div></div>}

                  <a className="eimg" style={{ display: 'block' }} href="#" onClick={(e) => e.preventDefault()}>
                    <img src={bannerSrc} alt="banner" draggable={false} />
                    {!locked && <span className="eimg-ovl"><span className="cap">🖼 Banner — designed asset</span><span><button onClick={changeBannerUrl}>Change URL</button></span></span>}
                  </a>

                  {moduleOrder.map((key) => (
                    <div key={key} className="mod" data-mod={key}
                      draggable={bodyFlow === 'custom' && !locked}
                      onDragStart={() => { dragKey.current = key; }}
                      onDragEnd={() => { dragKey.current = null; savedTick(); }}
                      onDragOver={(e) => onDragOver(e, key)}>
                      {renderModule(key)}
                    </div>
                  ))}

                  <div className="foot">
                    Thanks for shopping at {domainName}<br />
                    Want exclusive deals & comfort tips? We'd love to keep in touch.<br />
                    <a href="#" onClick={(e) => e.preventDefault()}>{domainName}.com</a> · 1851 Central Park Loop, Morrow, GA 30260<br />
                    © 2026 | Privacy Policy | Exchanges & Returns | <span className="unsub">Unsubscribe</span><br />
                    <span className="tagchip">{'{{unsubscribe}}'}</span> <span style={{ opacity: .7 }}>← preserved on export · replaced by SendGrid at send time</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="expwrap"><button className="btn-push" disabled={!canHandoff || pushing} title={canHandoff ? '' : 'Generate first'} onClick={createTemplateId}>{pushing ? 'Creating…' : 'Create Template_ID →'}</button></div>
          </main>
        </div>
      </div>

      {pushResult && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,14,20,.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setPushResult(null)}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '22px 26px', maxWidth: 440, width: '90%', boxShadow: '0 18px 60px rgba(0,0,0,.3)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>{pushResult.ok ? '✅' : '❌'}</div>
            <h3 style={{ margin: '0 0 6px' }}>{pushResult.ok ? 'Template created' : 'Create failed'}</h3>
            <p style={{ margin: 0, fontSize: 13.5, color: '#3c4453', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{pushResult.msg}</p>
            <button className="btn-push" style={{ marginTop: 16 }} onClick={() => setPushResult(null)}>OK</button>
          </div>
        </div>
      )}

      {briefOpen && (
        <div className="briefov" onClick={(e) => { if (e.target === e.currentTarget) setActiveImg(null); }}>
          <div className="brief-head">
            <b>🎨 Design brief</b>
            <span>{domainName} · {curSeg} · {niceDate(sendDate)} · {theme}</span>
            <span className="bh-hint">Hover any image → <b>✎ Brief new design</b> to request a redesign</span>
          </div>

          <div className="brief-scroll">
            <div className="brief-email">
              {briefImg('banner', bannerSrc)}
              <div className="be-txt center" dangerouslySetInnerHTML={{ __html: sanitize(sharedContent('headline')) }} />
              <div className="be-txt" dangerouslySetInnerHTML={{ __html: sanitize(segContent('story')) }} />
              <div className="be-tiles">
                {tiles.map((t) => (
                  <div className="be-tile" key={t.i}>
                    {briefImg('p' + t.i, t.src)}
                    <div className="be-main">{t.copy.main}</div>
                    <div className="be-review">★★★★★ “{t.copy.review}” — {t.copy.reviewer}</div>
                    <div className="be-price">{t.price}</div>
                  </div>
                ))}
              </div>
              <div className="be-txt" dangerouslySetInnerHTML={{ __html: sanitize(sharedContent('offer')) }} />
              <div className="be-txt" dangerouslySetInnerHTML={{ __html: sanitize(sharedContent('ps')) }} />
            </div>
          </div>

          {activeImg && (
            <div className={'brief-panel ' + dockSide(activeImg)} onClick={(e) => e.stopPropagation()}>
              <div className="bp-head"><b>Brief · {briefLabel(activeImg)}</b><button onClick={() => setActiveImg(null)}>✕</button></div>
              <textarea className="bp-ta" autoFocus placeholder="Describe the new design you want the designer to create for this image…"
                value={briefText[activeImg] || ''} onChange={(e) => setBriefText((p) => ({ ...p, [activeImg]: e.target.value }))} />
              <div className="bp-hint">This note is included in the exported brief for the designer.</div>
            </div>
          )}

          <div className="brief-bar" onClick={(e) => e.stopPropagation()}>
            <span className="bb-info">{Object.keys(briefText).filter((k) => (briefText[k] || '').trim()).length} image brief(s) added</span>
            <span className="spacer" />
            <button className="bb-cancel" onClick={() => setBriefOpen(false)}>Close</button>
            <button className="bb-exp" onClick={exportDesignBrief}>⬇ Final export design brief →</button>
          </div>
        </div>
      )}

      <div className={'toast ' + (toastMsg ? 'on' : '')}>{toastMsg}</div>
    </>
  );
}
