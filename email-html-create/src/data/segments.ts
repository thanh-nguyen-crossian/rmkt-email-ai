// ============================================================================
// DATA MODEL — domains, catalog, and the 8 tệp (segments) from
// `segment_mapping.csv`. BraGoddess is wired with real data + real images.
//
// SEAM #3 (AI product images): every product's `img` points at a static file
// in /public/img (shipped from the design repo). The image-generation dev
// replaces these paths with AI-generated / CDN image URLs per product.
// Nothing else needs to change — the UI just reads `product.img`.
// ============================================================================

export type Product = { name: string; img: string; price: string };
export type Catalog = Record<string, Product>;

export type Segment = {
  code: string;      // T1..T8
  name: string;      // Vietnamese tệp name
  rate: number;      // repurchase probability %
  prods: string[];   // 6 catalog keys, p1..p6
  chars: string;     // tinh_chat — content characteristics (steers the AI)
};

export type Domain = {
  accent: string;
  sender: string;
  real: boolean;
  banner: string;
  catalog: Catalog;
  segs: Segment[];
};

// Base-aware image dir: "/img/" in dev, "/rmkt-email-ai/img/" on GitHub Pages.
const IMG = import.meta.env.BASE_URL + 'img/';

// ---- BraGoddess catalog (12 products, real designed images) ----
export const CATALOG: Catalog = {
  lushfitting:  { name: 'LushFitting',   img: IMG + 'lushfitting.jpg',  price: '$29.99' },
  stretchactive:{ name: 'StretchActive', img: IMG + 'stretchactive.jpg',price: '$27.99' },
  daisybra:     { name: 'Daisy Bra',     img: IMG + 'daisybra.jpg',     price: '$19.99' },
  zenchic:      { name: 'ZenChic Bra',   img: IMG + 'zenchic.jpg',      price: '$22.99' },
  doveloom:     { name: 'DoveLoom',      img: IMG + 'doveloom.jpg',     price: '$24.99' },
  icyshorts:    { name: 'Icy Shorts',    img: IMG + 'icyshorts.jpg',    price: '$16.99' },
  rosylift:     { name: 'RosyLift',      img: IMG + 'rosylift.jpg',     price: '$25.99' },
  sonashape:    { name: 'SonaShape',     img: IMG + 'sonashape.jpg',    price: '$26.99' },
  zoeshape:     { name: 'ZoeShape',      img: IMG + 'zoeshape.jpg',     price: '$24.99' },
  veracomfort:  { name: 'VeraComfort',   img: IMG + 'veracomfort.jpg',  price: '$23.99' },
  sofilace:     { name: 'SofiLace',      img: IMG + 'sofilace.jpg',     price: '$21.99' },
  posybra:      { name: 'Posy Bra',      img: IMG + 'posybra.jpg',      price: '$22.99' },
};

// ---- 8 tệp from segment_mapping.csv ----
export const BRA_SEGS: Segment[] = [
  { code: 'T1', name: 'Tệp Bra Định Hình', rate: 46,
    prods: ['lushfitting','stretchactive','daisybra','zenchic','doveloom','icyshorts'],
    chars: 'Mua 1 lần bra định hình/nâng ngực, 46-150 ngày chưa quay lại. Quan tâm tôn dáng, nâng đỡ, che khuyết điểm. Content: nhấn hiệu ứng định hình & lợi ích lần mua tiếp theo; p3-p4 là bra thoải mái để mở gu so sánh.' },
  { code: 'T2', name: 'Tệp Bra Thoải Mái', rate: 44,
    prods: ['zenchic','stretchactive','lushfitting','rosylift','doveloom','icyshorts'],
    chars: 'Mua 1 lần bra thoải mái/không gọng, 46-150 ngày chưa quay lại. Ưu tiên dễ chịu, chất liệu mềm, mặc hằng ngày. Content: nhấn cảm giác thoải mái cả ngày; p3-p4 là bra định hình để gợi nâng cấp (26% khách đổi dòng khi quay lại).' },
  { code: 'T3', name: 'Tệp Mua 1 Lần – Khác', rate: 31,
    prods: ['sonashape','doveloom','rosylift','daisybra','zoeshape','veracomfort'],
    chars: 'Mua 1 lần sản phẩm ngoài bra (quần, panties...), 46-150 ngày chưa quay lại. Chưa rõ gu bra. Content: giới thiệu danh mục bra chủ lực qua bestseller, thông điệp khám phá sản phẩm signature.' },
  { code: 'T4', name: 'Tệp Khách Mới', rate: 52,
    prods: ['sonashape','doveloom','rosylift','daisybra','zoeshape','veracomfort'],
    chars: 'Mua đơn đầu trong 45 ngày gần đây — đang trong giai đoạn hứng thú nhất. Content: chào mừng, khẳng định lựa chọn đúng, gợi sản phẩm bán chạy; nhịp quay lại điển hình ~57 ngày nên đây là email gieo mầm đơn thứ 2.' },
  { code: 'T5', name: 'Tệp Tiềm Năng Trung Thành', rate: 49,
    prods: ['sonashape','rosylift','doveloom','sofilace','daisybra','zoeshape'],
    chars: 'Đã mua 2 đơn, vẫn active (≤90 ngày). Đang định hình gu và thói quen. Content: nuôi dưỡng quan hệ, gợi ý cân bằng giữa hợp gu và khám phá, đẩy sang đơn thứ 3 (mốc thành khách trung thành).' },
  { code: 'T6', name: 'Tệp Trung Thành – Gu Cố Định', rate: 58,
    prods: ['sonashape','posybra','daisybra','doveloom','sofilace','rosylift'],
    chars: '≥3 đơn, active, mua tập trung 1-2 dòng quen. Biết mình thích gì. Content: tôn trọng gu — sản phẩm cùng dòng là chính, tri ân/độc quyền, tránh thay đổi thông điệp quá mạnh.' },
  { code: 'T7', name: 'Tệp Trung Thành – Thích Khám Phá', rate: 55,
    prods: ['posybra','daisybra','sonashape','doveloom','sofilace','rosylift'],
    chars: '≥3 đơn, active, mua trải nhiều dòng. Thích cái mới, phản hồi tốt với đa dạng. Content: tuyển tập nhiều danh mục, phối đồ, cross-sale mạnh tay.' },
  { code: 'T8', name: 'Tệp Sắp Rời Bỏ', rate: 27,
    prods: ['sonashape','posybra','doveloom','rosylift','daisybra','zoeshape'],
    chars: 'Từng mua ≥2 đơn nhưng im 90-150 ngày — lệch khỏi nhịp mua của 2/3 khách. Content: win-back nhẹ nhàng, nhắc giá trị đã trải nghiệm, kèm hàng đang hot; cân nhắc ưu đãi giới hạn thời gian.' },
];

// ---- generic sample domains so the domain picker still demos ----
function genericDomain(accent: string, sender: string): Domain {
  const names = ['Signature Tee','Classic Polo','Linen Shirt','Wool Coat','Chino Pant','Leather Belt','Suede Shoe','Silk Scarf','Knit Sweater'];
  const catalog: Catalog = {};
  names.forEach((n, i) => {
    catalog['g' + i] = { name: n, img: `https://picsum.photos/seed/${encodeURIComponent(sender + n)}/420/320`, price: `$${19 + i * 10}.99` };
  });
  const keys = Object.keys(catalog);
  const segs: Segment[] = [
    { code: 'S1', name: 'New subscribers', rate: 42, prods: keys.slice(0, 6), chars: 'Sample segment — real tệp data comes from the Segmentation module (only BraGoddess is wired in this prototype).' },
    { code: 'S2', name: 'Repeat buyers',   rate: 56, prods: keys.slice(1, 7), chars: 'Sample segment — real tệp data pending.' },
    { code: 'S3', name: 'Lapsed 90-day',   rate: 24, prods: keys.slice(2, 8), chars: 'Sample segment — real tệp data pending.' },
  ];
  return { accent, sender, real: false, banner: `https://picsum.photos/seed/${encodeURIComponent(sender + 'banner')}/1200/420`, catalog, segs };
}

export const DOMAINS: Record<string, Domain> = {
  BraGoddess: { accent: '#c12a4e', sender: 'Sandra @ BraGoddess', real: true, banner: IMG + 'banner.gif', catalog: CATALOG, segs: BRA_SEGS },
  GentsLux:   genericDomain('#1f3a5f', 'GentsLux'),
  LuxFitting: genericDomain('#6b4e9e', 'LuxFitting'),
  SantaFare:  genericDomain('#b8342b', 'SantaFare'),
};

export const DOMAIN_NAMES = Object.keys(DOMAINS);
