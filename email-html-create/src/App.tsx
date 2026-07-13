import { useEffect, useMemo, useRef, useState, type ReactNode, type DragEvent } from 'react';
import { DOMAINS, DOMAIN_NAMES, type Domain, type Segment } from './data/segments';
import { generateContent, type BlockKey } from './lib/content';
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
function toDate(iso: string) { return new Date(iso + 'T00:00:00'); }
function niceDate(iso: string) {
  const d = toDate(iso);
  return d.getDate() + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
}
/* recommendTheme / THEME_OPTIONS now live in ./lib/occasions (ports the real
   EmailAuto Studio occasionsInWindow date→occasion method). */

/* editable rich-text hook (avoids React/contentEditable conflicts) */
function useEditable(content: string, onCommit: (html: string) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (ref.current && !editing) ref.current.innerHTML = content; }, [content, editing]);
  const start = () => { setEditing(true); setTimeout(() => ref.current?.focus(), 0); };
  const blur = () => { setEditing(false); const html = sanitize(ref.current?.innerHTML || ''); if (html && html !== content) onCommit(html); };
  return { ref, editing, start, blur };
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
  const [tab, setTab] = useState<'create' | 'template'>('create');
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
  const [width, setWidth] = useState<'desktop' | 'mobile'>('desktop');
  const [dark, setDark] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [subjStyle, setSubjStyle] = useState(0);
  const [accOpen, setAccOpen] = useState([true, true, true, true]);
  const [saved, setSaved] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState('');
  const [pushing, setPushing] = useState(false);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const savedT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const toastT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dragKey = useRef<string | null>(null);

  const D: Domain = DOMAINS[domainName];
  const codes = useMemo(() => D.segs.map((s) => s.code), [D]);
  const seg = (code: string): Segment => D.segs.find((s) => s.code === code) || D.segs[0];
  const prod = (key: string) => D.catalog[key] || { name: key, img: '', price: '' };
  const locked = phase === 'empty';

  useEffect(() => { document.documentElement.style.setProperty('--accent', D.accent); }, [D]);

  const toast = (m: string) => { setToastMsg(m); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToastMsg(''), 2600); };
  const savedTick = () => { if (phase !== 'ready') return; setSaved('Saving…'); clearTimeout(savedT.current); savedT.current = setTimeout(() => setSaved('Saved · just now'), 600); };

  const shipTxt = () => { if (ship === 'None') return ''; if (ship === 'All orders') return 'on all orders'; const m = ship.match(/\$(\d+)/); return m ? 'over 💲' + m[1] : 'available'; };
  const gen = (key: BlockKey, code: string, v: number) =>
    generateContent(key, { domainName, theme, val: promoVal, ship: shipTxt(), seg: seg(code), products: seg(code).prods.map((k) => prod(k).name) }, v);

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
    timers.current.push(setTimeout(() => { setPhase('ready'); setSaved('Saved · just now'); toast('Draft ready — all ' + codes.length + ' tệp · Score 86'); }, t + tg.length * 600 + 300));
  }
  function cancelGeneration() {
    timers.current.forEach(clearTimeout); timers.current = [];
    setSegState((p) => { const n = { ...p }; codes.forEach((c) => { if (n[c] === 'busy') n[c] = 'idle'; }); return n; });
    setShimmer({});
    setPhase(doneCount() > 0 ? 'ready' : 'empty');
    toast('Cancelled — kept ' + doneCount() + ' tệp');
  }

  function switchDomain(name: string) {
    timers.current.forEach(clearTimeout); timers.current = [];
    const dm = DOMAINS[name];
    setDomainName(name);
    setSegState(Object.fromEntries(dm.segs.map((s) => [s.code, 'idle'])));
    setCurSeg(dm.segs[0].code);
    setShared({}); setPerSeg({}); setSharedFilled({}); setCharsEdited({}); setShimmer({});
    setImgOverride({}); setBannerOverride({}); setPhase('empty'); setLayoutOpen(false);
    setTheme(recommendTheme(sendDate).theme);
    toast(name + (dm.real ? ' selected — real segment data loaded' : ' selected — sample data'));
  }
  function onDate(iso: string) { setSendDate(iso); const r = recommendTheme(iso); setTheme(r.theme); toast('Send date set — theme re-recommended: ' + r.theme); }

  const tiles = seg(curSeg).prods.map((key, i) => {
    const p = prod(key); const ov = imgOverride[`${curSeg}_${i}`];
    return { key, i, name: p.name, price: p.price, src: ov || p.img };
  });
  function changeTileUrl(i: number) {
    const cur = imgOverride[`${curSeg}_${i}`] || prod(seg(curSeg).prods[i]).img;
    const u = window.prompt('Paste new image URL:', cur);
    if (u) { setImgOverride((p) => ({ ...p, [`${curSeg}_${i}`]: u.trim() })); toast('Image updated'); savedTick(); }
  }
  const bannerSrc = bannerOverride[domainName] || D.banner;
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
    if (segState[curSeg] !== 'done') { toast('Generate first — subject styles apply to generated tệp'); return; }
    setSubjStyle(k); pushSeg(curSeg, 'subject', gen('subject', curSeg, k)); toast('Subject style ' + (k + 1) + ' applied (' + curSeg + ')'); savedTick();
  }

  function download(name: string, html: string) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' })); a.download = name; a.click();
  }
  function exportBrief() {
    const rows = codes.map((code) => {
      const s = seg(code);
      const pr = s.prods.map((key, i) => { const p = prod(key); return `<tr><td>P${i + 1}</td><td>${p.name}</td><td>${p.price}</td><td>${p.img.split('/').pop()}</td><td>564×564 px · product on brand background</td></tr>`; }).join('');
      return `<h3>${code} · ${s.name} <span style="font-weight:400;color:#667">(repurchase ${s.rate}%)</span></h3><p style="color:#444;font-size:13px;background:#f6f7fb;padding:10px 12px;border-radius:8px"><b>Creative characteristics:</b> ${charsEdited[code] ?? s.chars}</p><table><thead><tr><th>Slot</th><th>Product</th><th>Price</th><th>Image asset</th><th>Spec / notes</th></tr></thead><tbody>${pr}</tbody></table>`;
    }).join('<hr>');
    download(`design_brief_${domainName}_${sendDate}.html`,
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Design brief</title><style>body{font-family:Arial,sans-serif;max-width:900px;margin:24px auto;padding:0 16px;color:#172018}h1{font-size:22px}h3{margin:22px 0 6px}table{width:100%;border-collapse:collapse;font-size:12.5px;margin-bottom:8px}th,td{border:1px solid #ddd;padding:7px 9px;text-align:left}th{background:#f2f4f8;font-size:10.5px;text-transform:uppercase}hr{border:none;border-top:2px solid #eee;margin:22px 0}</style></head><body><h1>🎨 Design brief — ${domainName} · ${niceDate(sendDate)} · ${theme}</h1><p style="color:#667">Banner 1200×420 · ${codes.length} tệp · ${codes.length * 6} product images.</p>${rows}</body></html>`);
    toast('🎨 Design brief exported — ' + codes.length + ' tệp · ' + codes.length * 6 + ' images');
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
    const head = `<!--\n  Domain: ${domainName}\n  Tệp: ${curSeg} · ${seg(curSeg).name}\n  Subject: ${currentSubjectText()}\n  Merge tags preserved — replaced by SendGrid at send time.\n-->\n`;
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>.accent{color:${D.accent};font-weight:700}.rev{font-style:italic}.tagchip{font-family:monospace}p{margin:0 0 8px}</style></head><body>${head}<div style="max-width:600px;margin:0 auto;font-family:arial,sans-serif">${body}</div></body></html>`;
  }
  function exportHTML() {
    download(`email_${domainName}_${curSeg}.html`, buildEmailHtml());
    toast('HTML exported (' + domainName + ' · ' + curSeg + ')');
  }

  // SEAM #1 — Part 2: create a SendGrid Dynamic Template + auto-log to the tracking
  // sheet. Backend: /api/create-template (Vercel serverless, same repo). Same-origin
  // on the Vercel deploy; set VITE_API_BASE to the Vercel URL for GitHub Pages builds.
  async function createTemplateId() {
    if (segState[curSeg] !== 'done' || pushing) return;
    setPushing(true);
    toast('Creating SendGrid template… (' + curSeg + ')');
    try {
      const base = (import.meta.env.VITE_API_BASE as string | undefined) || '';
      const res = await fetch(base + '/api/create-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${domainName} · ${curSeg} · ${sendDate} · ${theme}`,
          subject: currentSubjectText(),
          html: buildEmailHtml(),
          segment: curSeg,
          domain: domainName,
          sendDate,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { templateId?: string; sheetLogged?: boolean; error?: string };
      if (!res.ok || !data.templateId) throw new Error(data.error || 'HTTP ' + res.status);
      toast('✓ Template ' + data.templateId + ' created' + (data.sheetLogged ? ' · sheet row added' : ' · sheet log FAILED'));
    } catch (err) {
      toast('✗ Template create failed: ' + (err instanceof Error ? err.message : 'unknown error'));
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
            <div className="tile" key={t.i}>
              <div className="eimg">
                <span className="pbadge">P{t.i + 1}</span>
                <img src={t.src} alt={t.name} draggable={false} />
                {!locked && <span className="eimg-ovl"><span className="cap">🖼 {t.name}</span><span><button onClick={() => changeTileUrl(t.i)}>Change URL</button></span></span>}
              </div>
              <div className="tilecap">{t.name}</div>
              <div className="tileprice">{t.price}</div>
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
        <div className="name">EmailAuto <span className="mtag">Part 1</span></div>
        <div className="t3wrap">
          <button className={'t3 ' + (tab === 'create' ? 'on' : '')} onClick={() => setTab('create')}><span className="n">1</span>Email HTML Create</button>
          <button className={'t3 ' + (tab === 'template' ? 'on' : '')} onClick={() => setTab('template')}><span className="n">2</span>Template_ID Create</button>
        </div>
      </header>

      <div className={'tabpage ' + (tab === 'create' ? 'on' : '')}>
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
                <div className="field"><label>Tên tệp (focus segment) — all {codes.length} tệp generate</label>
                  <select className="sel" value={curSeg} onChange={(e) => setCurSeg(e.target.value)}>
                    {codes.map((c) => <option key={c} value={c}>{c} · {seg(c).name}{segState[c] === 'done' ? ' ✓' : ''}</option>)}
                  </select>
                </div>
                <div className="field"><label>Products — p1–p6 <span className="recstar">★ AI-recommended · locked</span></label>
                  <div className="pchips">
                    {tiles.map((t) => <span className="pchip" key={t.i} title="AI-recommended · locked"><span className="sl">P{t.i + 1}</span>{t.name} <span className="lk">🔒</span></span>)}
                  </div>
                  <div className="hint">Products are AI-recommended per tệp from the segment mapping and locked. You can still change an image in the preview (hover → Change URL).</div>
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
              <button className="btn-brief" onClick={exportBrief}>🎨 Export design brief</button>
              <button className="btn-gen" disabled={phase === 'gen'} onClick={() => runGeneration(doneCount() === codes.length)}>
                {phase === 'gen' ? `⏳ Generating… ${doneCount()}/${codes.length} tệp` : doneCount() === codes.length ? '↻ Regenerate All' : doneCount() > 0 ? '⚡ Generate remaining tệp' : '⚡ Generate Email'}
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
              <button className="btn-exp" disabled={!canHandoff} title={canHandoff ? '' : 'Generate first'} onClick={exportHTML}>⬇ Export HTML</button>
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
              {phase === 'ready' && <button className="qchip" onClick={() => toast('⚠ Tệp T8 repurchase 27% — below target · ⚠ 1 subject over 60 chars')}>Score 86 · 2 ⚠</button>}
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
            {phase === 'gen' && <div className="pv-hint"><b>Generating…</b> foundation first, then one patch per tệp</div>}

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

      <div className={'tabpage ' + (tab === 'template' ? 'on' : '')}>
        <div className="uc">
          <div className="icn">🚧</div>
          <h3>Template_ID Create</h3>
          <p>Built by another module (Part 2). When you press <b>Create Template_ID</b> on screen 1, the finished email is handed off here to become a SendGrid <code>template_id</code>. Out of scope for Part 1.</p>
        </div>
      </div>

      <div className={'toast ' + (toastMsg ? 'on' : '')}>{toastMsg}</div>
    </>
  );
}
