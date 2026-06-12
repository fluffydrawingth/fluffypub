const zlib = require('zlib');
const { supabase, requireAuth } = require('./_lib');

// ── CRC32 (needed for ZIP) ────────────────────────────────────────────────────
let _crcTable = null;
function crcTable() {
  if (_crcTable) return _crcTable;
  _crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    _crcTable[i] = c;
  }
  return _crcTable;
}
function crc32(buf) {
  const t = crcTable(); let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ t[(c ^ buf[i]) & 0xFF];
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ── Minimal ZIP builder ───────────────────────────────────────────────────────
function makeZip(files) {
  // files: [{name: string, data: Buffer}]
  const parts = [], central = [];
  let offset = 0;
  for (const { name, data } of files) {
    const nb = Buffer.from(name, 'utf8');
    const comp = zlib.deflateRawSync(data, { level: 6 });
    const crc = crc32(data);
    const lh = Buffer.alloc(30 + nb.length);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0, 6);
    lh.writeUInt16LE(8, 8);  lh.writeUInt16LE(0, 10); lh.writeUInt16LE(0, 12);
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(nb.length, 26); lh.writeUInt16LE(0, 28); nb.copy(lh, 30);
    parts.push(lh, comp);
    const cd = Buffer.alloc(46 + nb.length);
    cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8); cd.writeUInt16LE(8, 10); cd.writeUInt16LE(0, 12); cd.writeUInt16LE(0, 14);
    cd.writeUInt32LE(crc, 16); cd.writeUInt32LE(comp.length, 20); cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(nb.length, 28); cd.writeUInt16LE(0, 30); cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34); cd.writeUInt16LE(0, 36); cd.writeUInt32LE(0, 38); cd.writeUInt32LE(offset, 42);
    nb.copy(cd, 46); central.push(cd);
    offset += lh.length + comp.length;
  }
  const cdb = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(0, 4); eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8); eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cdb.length, 12); eocd.writeUInt32LE(offset, 16); eocd.writeUInt16LE(0, 20);
  return Buffer.concat([...parts, cdb, eocd]);
}

// ── XLSX XML helpers ──────────────────────────────────────────────────────────
const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function colLetter(n) {
  let r = ''; n++;
  while (n > 0) { r = String.fromCharCode(64 + (n % 26 || 26)) + r; n = Math.floor((n-1)/26); }
  return r;
}
function sheetXml(rows) {
  const xml = rows.map((row, r) => {
    const cells = row.map((v, c) => {
      if (v === null || v === undefined || v === '') return '';
      const ref = colLetter(c) + (r + 1);
      return typeof v === 'number'
        ? `<c r="${ref}"><v>${v}</v></c>`
        : `<c r="${ref}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`;
    }).join('');
    return `<row r="${r+1}">${cells}</row>`;
  }).join('');
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${xml}</sheetData></worksheet>`, 'utf8');
}

function buildXlsx(sheets) {
  // sheets: [{name, rows}]
  const ct = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`;
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const wb = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s,i)=>`<sheet name="${esc(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`;
  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}</Relationships>`;
  return makeZip([
    { name: '[Content_Types].xml',       data: Buffer.from(ct, 'utf8') },
    { name: '_rels/.rels',               data: Buffer.from(rootRels, 'utf8') },
    { name: 'xl/workbook.xml',           data: Buffer.from(wb, 'utf8') },
    { name: 'xl/_rels/workbook.xml.rels',data: Buffer.from(wbRels, 'utf8') },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i+1}.xml`, data: sheetXml(s.rows) })),
  ]);
}

// ── Handler ───────────────────────────────────────────────────────────────────
const SALES_STATUSES = ['paid', 'packing', 'shipped', 'delivered'];

module.exports = async function handler(req, res) {
  const user = await requireAuth(req, res, ['admin']);
  if (!user) return;

  const { month, year } = req.query;
  const now = new Date();
  const filterYear  = year  ? parseInt(year)  : now.getFullYear();
  const filterMonth = month ? parseInt(month) : now.getMonth() + 1;
  const monthStart  = new Date(filterYear, filterMonth - 1, 1);
  const monthEnd    = new Date(filterYear, filterMonth, 1);

  const { data: allOrders } = await supabase
    .from('orders')
    .select('id,created_at,customer_name,customer_phone,customer_email,shipping_address,items,subtotal_thb,shipping_thb,total_thb,total_amount,total,payment_status,status,tracking_number,shipping_provider')
    .order('created_at', { ascending: false });

  const monthOrders = (allOrders || []).filter(o => {
    const d = new Date(o.created_at);
    return d >= monthStart && d < monthEnd;
  });

  // ── Sheet 1: Orders ───────────────────────────────────────────────────────
  const ordersRows = [
    ['Order #','Date','Customer','Phone','Email','Address','Products','Variants','Qty','Subtotal THB','Shipping THB','Total THB','Payment Status','Order Status','Tracking'],
  ];
  for (const o of monthOrders) {
    const sa = o.shipping_address || {};
    const addr = typeof sa === 'string' ? sa : [sa.address, sa.province, sa.postal_code, sa.country].filter(Boolean).join(', ');
    const items = Array.isArray(o.items) ? o.items : [];
    const thb = o.total_thb || o.total_amount || Math.round(parseFloat(o.total || '0') * 35);
    ordersRows.push([
      (o.id || '').slice(-8).toUpperCase(),
      new Date(o.created_at).toLocaleString('th-TH'),
      o.customer_name || '', o.customer_phone || '', o.customer_email || '', addr,
      items.map(i => i.title || '').join(' | '),
      items.map(i => i.optionName || i.variantName || i.variant?.name || '').join(' | '),
      items.map(i => i.qty || 1).join(' | '),
      o.subtotal_thb || 0, o.shipping_thb || 0, thb,
      o.payment_status || '', o.status || '', o.tracking_number || '',
    ]);
  }

  // ── Sheet 2: Product Sales Summary ───────────────────────────────────────
  const salesOrders = monthOrders.filter(o => SALES_STATUSES.includes(o.status));
  const salesMap = {};
  for (const o of salesOrders) {
    for (const item of (Array.isArray(o.items) ? o.items : [])) {
      const key = `${item.productId||item.product_id||item.title}__${item.optionName||item.variantName||item.variant?.name||''}`;
      if (!salesMap[key]) salesMap[key] = { productName: item.title||'', artistName: item.artistName||item.artist_name||'', variantName: item.optionName||item.variantName||item.variant?.name||'', qty:0, grossSales:0, orderIds: new Set() };
      const up = item.price_thb || item.unitPriceTHB || item.priceTHB || 0;
      salesMap[key].qty += (item.qty || 1);
      salesMap[key].grossSales += up * (item.qty || 1);
      salesMap[key].orderIds.add(o.id);
    }
  }
  const productSales = Object.values(salesMap)
    .map(s => ({ ...s, grossSales: Math.round(s.grossSales), orderCount: s.orderIds.size }))
    .sort((a, b) => b.qty - a.qty);

  const salesRows = [['Product','Artist','Variant','Qty Sold','Gross Sales (THB)','Order Count']];
  for (const s of productSales) salesRows.push([s.productName, s.artistName, s.variantName, s.qty, s.grossSales, s.orderCount]);
  salesRows.push(['TOTAL','','', productSales.reduce((s,r)=>s+r.qty,0), productSales.reduce((s,r)=>s+r.grossSales,0), productSales.reduce((s,r)=>s+r.orderCount,0)]);

  // ── Sheet 3: Artist Summary ────────────────────────────────────────────────
  const artistMap = {};
  for (const s of productSales) {
    const key = s.artistName || '(No Artist)';
    if (!artistMap[key]) artistMap[key] = { artistName: key, unitsSold: 0, grossRevenue: 0 };
    artistMap[key].unitsSold   += s.qty;
    artistMap[key].grossRevenue += s.grossSales;
  }
  const artistSummary = Object.values(artistMap).sort((a, b) => b.grossRevenue - a.grossRevenue);
  const artistRows = [['Artist','Units Sold','Gross Revenue (THB)','Royalty Payout (THB)','Platform Share (THB)']];
  for (const a of artistSummary) artistRows.push([a.artistName, a.unitsSold, a.grossRevenue, '', '']);
  artistRows.push(['TOTAL', artistSummary.reduce((s,r)=>s+r.unitsSold,0), artistSummary.reduce((s,r)=>s+r.grossRevenue,0), '', '']);

  // ── Build & send ──────────────────────────────────────────────────────────
  const buf = buildXlsx([
    { name: 'Orders',          rows: ordersRows },
    { name: 'Product Sales',   rows: salesRows },
    { name: 'Artist Summary',  rows: artistRows },
  ]);
  const mm = String(filterMonth).padStart(2, '0');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="fluffy-report-${filterYear}-${mm}.xlsx"`);
  res.status(200).end(buf);
};
