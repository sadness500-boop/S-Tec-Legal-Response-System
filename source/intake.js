/* =====================================================================
 * 접수 원문 불러오기 — 공문(PDF·Word·한글 HWPX)·메일(.eml)·카톡 대화(.txt)·사진/캡처(OCR)
 * 파일 내용을 읽어 ③ 사안 내용 작성 칸을 자동으로 채우고, 원문은 Word·PPT 붙임으로 넣습니다.
 * 모든 처리는 이 기기 안에서만 이뤄집니다(서버 전송 없음). — Designed & Developed by Rat Rae Choi
 * ===================================================================== */
const INTAKE = { att: [], busy: false };
function libUrl(p) { return /^(https?|capacitor):/.test(location.protocol) || location.protocol === 'http:' ? new URL(p, location.href).href : APP.shareUrl + p; }
function loadScriptOnce(src) { return new Promise((ok, no) => { if (document.querySelector(`script[data-src="${src}"]`)) return ok(); const s = document.createElement('script'); s.src = src; s.dataset.src = src; s.onload = ok; s.onerror = () => no(new Error('불러오기 실패: ' + src)); document.head.appendChild(s); }); }
function intakeAtt() { return INTAKE.att.filter(a => a.inc && (a.imgs.length || a.text)); }

/* ---------- 엔진: OCR(tesseract.js, 한국어) · PDF(pdf.js) ---------- */
let _ocrW = null, _ocrLog = null;
async function ocrWorker() {
  if (_ocrW) return _ocrW;
  await loadScriptOnce(libUrl('lib/ocr/tesseract.min.js'));
  _ocrW = await Tesseract.createWorker(['kor', 'eng'], 1, { workerPath: libUrl('lib/ocr/worker.min.js'), corePath: libUrl('lib/ocr/core'), langPath: libUrl('lib/ocr/lang'), logger: m => _ocrLog && _ocrLog(m) });
  return _ocrW;
}
async function ocrCanvas(cv, label) {
  const w = await ocrWorker();
  _ocrLog = m => { if (m.status === 'recognizing text') inProg(`${label} 글자 읽는 중 ${Math.round(m.progress * 100)}%`); };
  const r = await w.recognize(cv); _ocrLog = null;
  return cleanOcr(r.data.text || '');
}
function cleanOcr(t) {
  return t.split('\n').map(l => l.replace(/\s+/g, ' ').replace(/([가-힣])\s(?=[가-힣]\s[가-힣])/g, '$1').trim())
    .filter(l => l.length > 1 && !/^(오전|오후)?\s*\d{1,2}:\d{2}$/.test(l) && !/^[\d\s.:,|/\\\-_=~'"`]+$/.test(l)).join('\n');
}
let _pdfjs = null;
async function pdfLib() {
  if (_pdfjs) return _pdfjs;
  _pdfjs = await import(libUrl('lib/pdf/pdf.min.mjs'));
  const src = await (await fetch(libUrl('lib/pdf/pdf.worker.min.mjs'))).text();
  _pdfjs.GlobalWorkerOptions.workerPort = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })), { type: 'module' });
  return _pdfjs;
}
function imgToCanvas(src, maxW) { return new Promise((ok, no) => { const im = new Image(); im.onload = () => { const r = Math.min(1, maxW / im.naturalWidth), c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * r); c.height = Math.round(im.naturalHeight * r); const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height); ok(c); }; im.onerror = () => no(new Error('이미지를 열 수 없습니다')); im.src = src; }); }
function readAs(file, how) { return new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => no(r.error); r['readAs' + how](file); }); }
function decodeBytes(buf, cs) {
  cs = String(cs || 'utf-8').toLowerCase().replace(/^ks_c_5601-1987$|^cp949$|^x-windows-949$|^ksc5601$/, 'euc-kr');
  try { const t = new TextDecoder(cs).decode(buf); if (cs === 'utf-8' && (t.match(/�/g) || []).length > 3) return new TextDecoder('euc-kr').decode(buf); return t; } catch (e) { return new TextDecoder('utf-8').decode(buf); }
}
const xmlTxt = s => s.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&amp;/g, '&');
function htmlToText(h) { const d = document.createElement('div'); d.innerHTML = h.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|tr|li|h\d)>/gi, '\n'); return (d.textContent || '').replace(/ /g, ' ').replace(/\n{3,}/g, '\n\n').trim(); }

/* ---------- 파일 종류별 읽기 ---------- */
async function extractFile(file) {
  const name = file.name || '붙여넣은 이미지.png', ext = (name.split('.').pop() || '').toLowerCase(), out = { name, kind: '기타', text: '', imgs: [], meta: {}, inc: true };
  if (/^image\//.test(file.type) || /^(png|jpe?g|gif|bmp|webp|heic)$/.test(ext)) {
    out.kind = '사진';
    const url = await readAs(file, 'DataURL'), big = await imgToCanvas(url, 2000), small = await imgToCanvas(url, 1400);
    out.imgs.push({ src: small.toDataURL('image/jpeg', 0.85), w: small.width, h: small.height });
    out.text = await ocrCanvas(big, name);
  } else if (ext === 'pdf') {
    out.kind = '공문';
    const pdfjs = await pdfLib(), doc = await pdfjs.getDocument({ data: new Uint8Array(await readAs(file, 'ArrayBuffer')), cMapUrl: libUrl('lib/pdf/cmaps/'), cMapPacked: true }).promise;
    const pages = Math.min(doc.numPages, 10); let txt = [];
    for (let i = 1; i <= pages; i++) {
      inProg(`${name} ${i}/${pages}쪽 읽는 중`);
      const pg = await doc.getPage(i), tc = await pg.getTextContent();
      let t = ''; tc.items.forEach(it => { t += it.str + (it.hasEOL ? '\n' : ''); }); txt.push(t.trim());
      if (i <= 3) { const vp = pg.getViewport({ scale: 1.6 }), c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; await pg.render({ canvasContext: c.getContext('2d'), viewport: vp, background: '#fff' }).promise; out.imgs.push({ src: c.toDataURL('image/jpeg', 0.82), w: c.width, h: c.height, cv: c }); }
    }
    if (txt.join('').replace(/\s/g, '').length < 30 * pages) {   // 스캔본 → 그림에서 글자 읽기
      txt = []; for (const [k, im] of out.imgs.entries()) txt.push(await ocrCanvas(im.cv, `${name} ${k + 1}쪽`));
    }
    out.imgs.forEach(im => delete im.cv); out.text = txt.join('\n');
  } else if (ext === 'docx') {
    out.kind = '공문'; const z = await JSZip.loadAsync(await readAs(file, 'ArrayBuffer')), x = await z.file('word/document.xml').async('string');
    out.text = xmlTxt(x.replace(/<w:tab\/>/g, '\t').replace(/<w:br[^>]*\/>/g, '\n').replace(/<\/w:p>/g, '\n'));
  } else if (ext === 'hwpx') {
    out.kind = '공문'; const z = await JSZip.loadAsync(await readAs(file, 'ArrayBuffer'));
    const secs = Object.keys(z.files).filter(n => /^Contents\/section\d+\.xml$/i.test(n)).sort();
    for (const s of secs) out.text += xmlTxt((await z.file(s).async('string')).replace(/<\/hp:p>/g, '\n').replace(/<hp:lineBreak\/>/g, '\n')) + '\n';
  } else if (ext === 'hwp') {
    throw new Error('한글(.hwp) 파일은 바로 읽을 수 없습니다. 한글에서 「PDF로 저장」하거나 「HWPX」로 저장해 올리시거나, 화면을 사진으로 찍어 올려 주세요.');
  } else if (ext === 'eml') {
    out.kind = '이메일'; await parseEml(new Uint8Array(await readAs(file, 'ArrayBuffer')), out);
  } else if (ext === 'msg') {
    throw new Error('Outlook(.msg) 파일은 바로 읽을 수 없습니다. 메일을 「다른 이름으로 저장 → .eml」 하거나, 본문을 복사해 붙여넣기(Ctrl+V) 하세요.');
  } else if (ext === 'txt' || ext === 'csv' || /^text\//.test(file.type)) {
    const t = decodeBytes(new Uint8Array(await readAs(file, 'ArrayBuffer')));
    const k = parseKakao(t); if (k) { out.kind = '메신저'; out.text = k.text; out.meta = k.meta; } else { out.kind = '기타'; out.text = t; }
  } else throw new Error(`「${name}」은(는) 읽을 수 없는 형식입니다. PDF·Word·HWPX·메일(.eml)·카톡(.txt)·사진을 올려 주세요.`);
  out.text = String(out.text || '').replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return out;
}
/* 메일(.eml) — 머리글(보낸 사람·날짜·제목) + 본문 + 첨부 사진 */
function qpDecode(s) { const b = []; s = s.replace(/=\r?\n/g, ''); for (let i = 0; i < s.length; i++) { if (s[i] === '=' && /[0-9A-F]{2}/i.test(s.substr(i + 1, 2))) { b.push(parseInt(s.substr(i + 1, 2), 16)); i += 2; } else b.push(s.charCodeAt(i) & 255); } return new Uint8Array(b); }
function b64Bytes(s) { const t = atob(s.replace(/[^A-Za-z0-9+/=]/g, '')); const u = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) u[i] = t.charCodeAt(i); return u; }
function mimeWord(s) { return String(s || '').replace(/=\?([^?]+)\?([BQ])\?([^?]*)\?=\s*/gi, (_, cs, enc, txt) => decodeBytes(enc.toUpperCase() === 'B' ? b64Bytes(txt) : qpDecode(txt.replace(/_/g, ' ')), cs)); }
function splitMime(raw) {
  const i = raw.search(/\r?\n\r?\n/), head = i < 0 ? raw : raw.slice(0, i), body = i < 0 ? '' : raw.slice(i).replace(/^\r?\n\r?\n/, '');
  const h = {}; head.replace(/\r?\n[ \t]+/g, ' ').split(/\r?\n/).forEach(l => { const m = /^([\w-]+):\s*(.*)$/.exec(l); if (m) h[m[1].toLowerCase()] = m[2]; });
  return { h, body };
}
async function parseEml(bytes, out) {
  const raw = new TextDecoder('latin1').decode(bytes), top = splitMime(raw), texts = [];
  out.meta.from = mimeWord(top.h.from || ''); out.meta.subject = mimeWord(top.h.subject || ''); out.meta.date = top.h.date ? new Date(top.h.date) : null;
  async function walk(part) {
    const ct = (part.h['content-type'] || 'text/plain').toLowerCase(), cte = (part.h['content-transfer-encoding'] || '').toLowerCase(), cs = (/charset="?([^";]+)/i.exec(part.h['content-type'] || '') || [])[1];
    const bnd = /boundary="?([^";]+)"?/i.exec(part.h['content-type'] || '');
    if (/^multipart\//.test(ct) && bnd) { for (const seg of part.body.split('--' + bnd[1]).slice(1)) { if (/^--/.test(seg)) break; await walk(splitMime(seg.replace(/^\r?\n/, ''))); } return; }
    const data = cte === 'base64' ? b64Bytes(part.body) : cte === 'quoted-printable' ? qpDecode(part.body) : new Uint8Array([...part.body].map(c => c.charCodeAt(0) & 255));
    const fname = mimeWord((/name="?([^";\r\n]+)"?/i.exec((part.h['content-disposition'] || '') + ';' + (part.h['content-type'] || '')) || [])[1] || '');
    if (/^text\/plain/.test(ct) && !fname) texts.push({ t: decodeBytes(data, cs), p: 2 });
    else if (/^text\/html/.test(ct) && !fname) texts.push({ t: htmlToText(decodeBytes(data, cs)), p: 1 });
    else if (/^image\//.test(ct)) { const url = `data:${ct.split(';')[0]};base64,` + btoa(String.fromCharCode(...data.subarray(0, Math.min(data.length, 8e6)))); try { const c = await imgToCanvas(url, 1400); out.imgs.push({ src: c.toDataURL('image/jpeg', 0.85), w: c.width, h: c.height }); } catch (e) { } }
    else if (/pdf$/i.test(fname) || /application\/pdf/.test(ct)) { try { const sub = await extractFile(new File([data], fname || '첨부.pdf', { type: 'application/pdf' })); texts.push({ t: `[첨부 ${sub.name}]\n` + sub.text, p: 0 }); out.imgs.push(...sub.imgs); } catch (e) { } }
  }
  await walk(top);
  const best = texts.filter(x => x.p > 0).sort((a, b) => b.p - a.p)[0];
  out.text = [out.meta.subject ? '제목: ' + out.meta.subject : '', best ? best.t : '', ...texts.filter(x => x.p === 0).map(x => x.t)].filter(Boolean).join('\n')
    .split('\n').filter(l => !/^>/.test(l.trim())).join('\n').split(/\n-{2,}\s*Original Message|\n-+\s*원본 메시지|\n보낸 사람:\s/i)[0];
}
/* 카카오톡 「대화 내보내기」(.txt) — 휴대폰·PC 형식 */
function parseKakao(t) {
  const L = t.replace(/\r/g, '').split('\n'), msgs = []; let date = '';
  const reM = /^(\d{4})년 (\d{1,2})월 (\d{1,2})일 (오전|오후) (\d{1,2}):(\d{2}),\s*(.+?)\s*:\s(.*)$/, reP = /^\[(.+?)\] \[(오전|오후) (\d{1,2}):(\d{2})\] (.*)$/, reD = /^-+\s*(\d{4})년 (\d{1,2})월 (\d{1,2})일/;
  L.forEach(l => {
    let m;
    if ((m = reD.exec(l))) date = `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
    else if ((m = reM.exec(l))) msgs.push({ who: m[7], d: `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`, tm: `${m[4]} ${m[5]}:${m[6]}`, t: m[8] });
    else if ((m = reP.exec(l))) msgs.push({ who: m[1], d: date, tm: `${m[2]} ${m[3]}:${m[4]}`, t: m[5] });
    else if (msgs.length && l.trim() && !/^(저장한 날짜|.+님과 카카오톡 대화)/.test(l)) msgs[msgs.length - 1].t += '\n' + l;
  });
  if (msgs.length < 1) return null;
  const me = ((UI && UI.manager && UI.manager.name) || '').trim(), cnt = {};
  msgs.forEach(m => { if (!me || !m.who.includes(me)) cnt[m.who] = (cnt[m.who] || 0) + m.t.length; });
  const who = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0] || msgs[0].who, mine = msgs.filter(m => m.who === who && !/^(사진|이모티콘|동영상|파일)( \d+장)?$/.test(m.t.trim()));
  return { text: mine.map(m => m.t).join('\n'), meta: { from: who, date: mine.length ? mine[0].d : '', kakao: true } };
}

/* ---------- 내용 분석 → ③ 칸에 넣을 값 ---------- */
const PLACE_RE = /(지하\s?\d+층|\d+층|정문|후문|동문|서문|초소|경비실|보안실|로비|안내데스크|안내 데스크|상황실|방재실|관제실|주차장|주차 관리소|화장실|탕비실|회의실|사무실|복도|엘리베이터|승강기|계단|휴게실|출입구|게이트|기숙사|식당|구내식당|생산동|공장동|본관|별관|현관|하역장|물류창고)/g;
function normName(s) { return String(s || '').replace(/주식회사|\(주\)|㈜|\s|보안실|경비실/g, ''); }
function tidyText(t) {
  t = String(t).replace(/(^|\n)([가-힣])[ \t]*\n+[ \t]*([가-힣])(?=[ \t]*\n|[ \t]+\S)/g, '$1$2$3').replace(/\(\s*\n?\s*경\s*유\s*\n?\s*\)/g, '(경유)')            // 「수\n신」 → 「수신」
    .replace(/(^|[\s(])((?:[가-힣] ){2,}[가-힣])(?=[\s)]|$)/gm, (m, a, b) => a + b.replace(/ /g, ''))   // 「티 씨 씨 스 틸」 → 「티씨씨스틸」
    .replace(/(\d)\s+(명|시|분|일|월|년|층|회|건)/g, '$1$2');
  const L = t.split('\n'), out = [];
  L.forEach(l => { const p = out.length ? out[out.length - 1] : null; if (p !== null && p.length >= 18 && !/([.!?。]|니다|어요|아요|해요|세요|예요|에요|네요|지요|죠|[었았했였됐겠]다|이다|한다|된다|임|함|음|됨)\s*$/.test(p) && /^[가-힣0-9("'“]/.test(l.trim()) && !/^\s*(\d{1,2}[.)]|[가-하][.)])/.test(l) && !/^\s*(제\s*목|수\s*신|발\s*신|참\s*조|Subject|From|시\s*행)/i.test(p)) out[out.length - 1] = p.trimEnd() + ' ' + l.trim(); else out.push(l); });
  return out.join('\n');
}
function splitSent(t) { return tidyText(t).split(/\n+/).flatMap(l => l.split(/(?<=[다요음함됨임니][.!?])\s+/)).map(s => s.replace(/^\s*(?:\d{1,2}[.)]|[가-하][.)]|[\-•·○◦▪■□*>]+)\s*/, '').trim()).filter(s => s.length > 3); }
function fmtMD(y, m, d) { const dt = new Date(y || kstNow().getFullYear(), m - 1, d); return `${pad(m)}/${pad(d)}(${WKK[dt.getDay()]})`; }
function parseIntake(text, list) {
  const r = {}, T = tidyText(text).replace(/[ \t]+/g, ' ');
  // 사업장
  const nt = normName(T); let best = null;
  SITES.forEach(st => { const n = normName(st.name); if (n.length >= 2 && nt.includes(n) && (!best || n.length > normName(best.name).length)) best = st; });
  if (!best) {   // 회사명만 적힌 경우: 사업장명 첫 단어로 찾기(여러 곳이면 다른 단어도 맞는 곳)
    const c = SITES.map(st => { const w = st.name.split(/\s+/), k = normName(w[0]); return { st, k, more: w.slice(1).some(x => x.length >= 2 && T.includes(x)) }; }).filter(o => o.k.length >= 3 && nt.includes(o.k));
    if (c.length) best = (c.find(o => o.more) || c[0]).st, r.siteGuess = c.length > 1;
  }
  r.site = best;
  if (!best) { const m = /(?:발\s*신|보낸\s*사람|회사명|업체명)\s*[:：]?\s*([^\n]{2,30})/.exec(T); if (m) r.client = m[1].replace(/<.*>/, '').trim(); }
  // 접수 경로
  const kinds = list.map(a => a.kind);
  r.channel = kinds.includes('이메일') ? '이메일' : kinds.includes('메신저') ? '메신저' : /수\s*신|시\s*행|발\s*신|문서번호|제\s*목\s*:/.test(T) ? '공문' : kinds.includes('사진') ? '메신저' : kinds.includes('공문') ? '공문' : '기타';
  // 접수일
  const meta = list.map(a => a.meta || {}).find(m => m.date) || {};
  let rd = null;
  if (meta.date instanceof Date && !isNaN(meta.date)) rd = meta.date; else if (meta.date) rd = new Date(meta.date);
  const dm = /(?:시\s*행|발\s*송|일\s*자|작성일|날\s*짜)[^\n]{0,30}?(\d{4})\s*[.\-년/]\s*(\d{1,2})\s*[.\-월/]\s*(\d{1,2})/.exec(T) || /(\d{4})\s*[.\-년]\s*(\d{1,2})\s*[.\-월]\s*(\d{1,2})\s*일?/.exec(T);
  if (!rd && dm) rd = new Date(+dm[1], +dm[2] - 1, +dm[3]);
  if (!rd || isNaN(rd)) rd = kstNow();
  r.date = `${rd.getFullYear()}-${pad(rd.getMonth() + 1)}-${pad(rd.getDate())}`;
  // 발생 일시
  const om = /(?:(\d{4})\s*[.\-년]\s*)?(\d{1,2})\s*(?:[./]|월)\s*(\d{1,2})\s*일?\s*(?:\(\s*[월화수목금토일]\s*\))?\s*,?\s*((?:오전|오후|새벽|아침|저녁|밤|야간|주간|심야)\s*)?(\d{1,2})\s*(?::\s*(\d{2})|시(?:\s*(\d{1,2})\s*분)?)\s*(경|쯤|무렵)?/.exec(T);
  if (om) { const ap = (om[4] || '').trim(); r.occur = `${fmtMD(+om[1] || (rd ? rd.getFullYear() : 0), +om[2], +om[3])} ${ap ? ap + ' ' : ''}${pad(+om[5])}:${om[6] || om[7] || '00'}경`; }
  else { const om2 = /(어제|그저께|지난\s*밤|오늘\s*(?:새벽|아침|오전|오후|밤)?|금일|전일)\s*((?:오전|오후|새벽|밤)?\s*\d{1,2}\s*시(?:\s*\d{1,2}\s*분)?\s*경?)?/.exec(T); if (om2) { r.occur = om2[0].trim(); const base = rd && !isNaN(rd) ? new Date(rd) : kstNow(); if (/어제|전일|지난\s*밤/.test(om2[1])) base.setDate(base.getDate() - 1); else if (/그저께/.test(om2[1])) base.setDate(base.getDate() - 2);
    const tm = /(오전|오후|새벽|밤)?\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?/.exec(om2[0] + ' ' + T.slice(om2.index, om2.index + 40)); const ap = (/(새벽|아침|오전|오후|저녁|밤)/.exec(om2[0]) || [])[1] || (tm && tm[1]) || '';
    if (tm) r.occur = `${fmtMD(base.getFullYear(), base.getMonth() + 1, base.getDate())} ${ap ? ap + ' ' : ''}${pad(+tm[2])}:${tm[3] ? pad(+tm[3]) : '00'}경`; } }
  // 제기자
  const POS = '이사|상무|전무|부장|차장|과장|대리|주임|팀장|실장|소장|센터장|공장장|본부장|매니저|담당자?|사원|관리소장';
  const rm = new RegExp(`([가-힣A-Za-z]{1,10}(?:팀|부|과|실|센터|본부|그룹|파트))\\s*([가-힣]{2,4}\\s*)?(${POS})`).exec(T) || new RegExp(`([가-힣]{2,4})\\s*(${POS})(?:님)?`).exec(T);
  if (rm) r.raiser = rm[0].replace(/\s+/g, ' ').trim();
  const from = (list.find(a => a.meta && a.meta.from) || {}).meta;
  if (from && from.from) { const fn = from.from.replace(/<[^>]*>/, '').replace(/"/g, '').trim();
    if (new RegExp(`(${POS})$`).test(fn)) { const tm = /([가-힣]{1,8}(?:팀|부|과|실|센터))/.exec(T); r.raiser = tm && !fn.includes(tm[1]) ? fn.replace(new RegExp(`\\s*([가-힣]{2,4})\\s*(${POS})$`), ` ${tm[1]} $1 $2`).replace(/\s+/g, ' ').trim() : fn; }
    else r.raiser = r.raiser ? (r.raiser.includes(fn) ? r.raiser : `${r.raiser} (${fn})`) : fn; }
  // 관련 근무자
  const wk = new Set(); let wm; const WRE = /((?:야간|주간|당직|정문|후문|로비|상황실|주차장?|1층|\d+층)\s*)?(경비원|보안\s?요원|경비\s?근무자|미화원|미화\s?여사님|청소\s?(?:원|여사님)|주차\s?요원|시설\s?기사|근무자|보안\s?직원)(\s*(?:\d+\s*명|한\s*명|두\s*명|[가-힣]{1,3}\s*(?:씨|님)))?/g;
  while ((wm = WRE.exec(T)) && wk.size < 6) wk.add(wm[0].replace(/\s+/g, ' ').trim());
  const wl = [...wk].filter((w, i, a) => !a.some((o, j) => j !== i && o.length > w.length && o.includes(w.replace(/\s*\d+명$/, '')))).sort((a, b) => /\d명|두|한/.test(b) - /\d명|두|한/.test(a));
  if (wl.length) r.workers = wl.slice(0, 2).join(', ');
  // 발생 장소
  const pl = [...new Set((T.match(PLACE_RE) || []).map(s => s.replace(/\s/g, '')))].slice(0, 2); if (pl.length) r.place = pl.join(' ');
  // 문장 나누기 → 요구사항 / 내용
  const DEM = /(요청|요구|바랍니다|바람\b|주시기|주십시오|주세요|해\s*주|조치\s*(?:바|해|하여|부탁)|교체|회신|제출|시정|재발\s*방지|개선\s*(?:바|해|하여|요청)|대책)/;
  const S = splitSent(text).filter(s => !/^(수\s*신|참\s*조|발\s*신|경\s*유|시\s*행|접\s*수|문서번호|보낸\s*사람|받는\s*사람|날짜|Date|From|To|Cc|첨부|붙임|전화|팩스|Tel|Fax|주소|홈페이지|담당자\s*:)/i.test(s))
    .filter(s => !/^(안녕하(세요|십니까)|수고(하|많)|감사합니다|고맙습니다|끝\.?$|이상입니다|잘 부탁)|귀사의.{0,12}(발전|번창|건승)|^제\s*목\s*[:：]/.test(s) && !/^[\-–—=]+$/.test(s))
    .filter(s => s.length >= 14 || /[다요음함됨임][.!?]?$/.test(s) || DEM.test(s))
    .filter(s => !/(지사장|대표이사|팀장|과장|부장|이사)(님)?$/.test(s) || s.length > 25);
  const subj = (/(?:^|\n)[ \t]*(?:제\s*목|Subject|건\s*명)[ \t:：]*\n?[ \t]*([^\n]{4,})/i.exec(tidyText(text)) || [])[1] || (from && from.subject) || '';
  const dem = S.filter(s => DEM.test(s) && !(subj && s.replace(/\s/g, '').includes(subj.replace(/\s/g, '')))).slice(0, 4), body = S.filter(s => !dem.includes(s) && s.length > 6 && !(subj && s.includes(subj.trim())));
  r.content = [subj ? `제목: ${subj.trim()}` : '', ...body.slice(0, 8)].filter(Boolean).join('\n');
  if (!body.length && dem.length) r.content = [subj ? `제목: ${subj.trim()}` : '', ...dem].filter(Boolean).join('\n');
  r.demand = dem.join('\n');
  return r;
}

/* ---------- 화면: 올리기 · 진행 · 확인 창 ---------- */
function inProg(msg) { const b = document.getElementById('inProg'); if (b) { b.hidden = !msg; b.querySelector('span').textContent = msg || ''; } }
async function intakeFiles(files) {
  files = [...files].filter(Boolean); if (!files.length || INTAKE.busy) return;
  INTAKE.busy = true; const got = [], errs = [];
  for (const f of files) { inProg(`${f.name || '이미지'} 읽는 중…`); try { got.push(await extractFile(f)); } catch (e) { errs.push(e.message || String(e)); } }
  inProg(''); INTAKE.busy = false;
  if (errs.length) toast(errs[0], 6000);
  if (!got.length) return;
  INTAKE.att.push(...got); renderAtt();
  const txt = got.map(a => a.text).filter(Boolean).join('\n\n');
  if (!txt.trim()) return toast('파일에서 글자를 찾지 못했습니다. 원문은 붙임으로만 넣고, 내용은 직접 입력해 주세요.', 5000);
  openIntakeReview(txt, got);
}
function renderAtt() {
  const box = document.getElementById('inFiles'); if (!box) return;
  box.innerHTML = INTAKE.att.map((a, i) => `<span class="inf ${a.inc ? 'on' : ''}" title="${esc(a.name)}"><label><input type="checkbox" data-i="${i}" ${a.inc ? 'checked' : ''}>${{ 사진: '🖼', 공문: '📄', 이메일: '✉', 메신저: '💬' }[a.kind] || '📎'} ${esc(a.name.length > 22 ? a.name.slice(0, 20) + '…' : a.name)}</label><button data-x="${i}" title="빼기">×</button></span>`).join('')
    + (INTAKE.att.length ? '<span class="hint">체크된 원문은 Word·PPT 「붙임」으로 들어갑니다</span>' : '');
}
function openIntakeReview(text, list) {
  const r = parseIntake(text, list), F = [['f_client', '고객사명(사업장)', r.site ? r.site.name : (r.client || '')], ['f_site', '발생 장소(세부)', r.place], ['f_channel', '접수 경로', r.channel], ['f_date', '접수일', r.date], ['f_occur', '발생 일시', r.occur], ['f_raiser', '제기자', r.raiser], ['f_workers', '관련 근무자', r.workers], ['f_content', 'Complaint 내용', r.content, 1], ['f_demand', '고객사 요구사항', r.demand, 1]];
  openModal(`<h2>📎 접수 원문 분석 결과</h2><div class="sub">파일 ${list.length}개에서 읽은 내용입니다. 확인·수정 후 「③에 채우기」를 누르세요. (체크한 칸만 바뀝니다)</div>
    <div class="irv">${F.map(([id, lb, v, ta]) => `<label class="ir"><input type="checkbox" data-k="${id}" ${v ? 'checked' : ''}><b>${lb}${id === 'f_client' && r.site ? ' <em>사업장 목록 일치</em>' : ''}</b>${id === 'f_channel' ? `<select data-v="${id}">${['공문', '이메일', '유선', '대면', '메신저', '기타'].map(o => `<option ${o === v ? 'selected' : ''}>${o}</option>`).join('')}</select>` : id === 'f_date' ? `<input type="date" data-v="${id}" value="${esc(v || '')}">` : ta ? `<textarea data-v="${id}" rows="${id === 'f_content' ? 5 : 3}">${esc(v || '')}</textarea>` : `<input data-v="${id}" value="${esc(v || '')}">`}</label>`).join('')}
    <details class="iraw"><summary>읽은 원문 전체 보기 · 고치고 다시 분석</summary><textarea id="irRaw" rows="8">${esc(text)}</textarea><button class="btn" id="irRe">↻ 고친 원문으로 다시 분석</button></details></div>
    <div class="m-btns" style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="btn" id="irNo">닫기</button><button class="btn pri" id="irOk">③에 채우기</button></div>`, md => {
    md.style.width = 'min(720px,100%)';
    md.querySelector('#irNo').onclick = closeModal;
    md.querySelector('#irRe').onclick = () => openIntakeReview(md.querySelector('#irRaw').value, list);
    md.querySelectorAll('[data-v]').forEach(el => el.addEventListener('input', () => { const c = md.querySelector(`[data-k="${el.dataset.v}"]`); if (c) c.checked = true; }));
    md.querySelector('#irOk').onclick = () => {
      md.querySelectorAll('[data-k]').forEach(c => { if (!c.checked) return; const v = md.querySelector(`[data-v="${c.dataset.k}"]`).value, el = $('#' + c.dataset.k); if (el) el.value = v; });
      const cOn = md.querySelector('[data-k="f_client"]').checked, cv = md.querySelector('[data-v="f_client"]').value.trim();
      if (cOn) { const st = r.site && r.site.name === cv ? r.site : SITES.find(s => normName(s.name) === normName(cv)); if (st) selectSite(st, true); else { state.site = null; $('#f_client').value = cv; renderSiteInfo(); renderSites(); } }
      closeModal(); suggest();
      if (!state.picked.length) { const btns = [...document.querySelectorAll('#sugg .sg')].filter(b => (b.querySelector('small') || {}).textContent && b.querySelector('small').textContent.length >= 2).slice(0, 3); btns.forEach(b => togglePick(b.dataset.c)); if (btns.length) suggest(); }
      toast(`접수 원문을 ③에 채웠습니다${state.picked.length ? ` · 사안 항목 ${state.picked.length}개 선택` : ''}. 내용을 확인하고 「법률 검토 생성」을 누르세요.`, 4500);
      $('#formCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  });
}
function initIntake() {
  const z = document.getElementById('intake'); if (!z || z.dataset.ready) return; z.dataset.ready = '1';
  const fi = document.getElementById('inFile'), cam = document.getElementById('inCamFile');
  document.getElementById('inPick').onclick = () => fi.click();
  document.getElementById('inCam').onclick = () => cam.click();
  fi.onchange = () => { intakeFiles(fi.files); fi.value = ''; };
  cam.onchange = () => { intakeFiles(cam.files); cam.value = ''; };
  ['dragenter', 'dragover'].forEach(ev => z.addEventListener(ev, e => { e.preventDefault(); z.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(ev => z.addEventListener(ev, e => { e.preventDefault(); z.classList.remove('drag'); }));
  z.addEventListener('drop', e => intakeFiles(e.dataTransfer.files));
  document.addEventListener('paste', e => {
    const tgt = e.target, inField = tgt && /^(INPUT|TEXTAREA|SELECT)$/.test(tgt.tagName);
    const imgs = [...(e.clipboardData ? e.clipboardData.items : [])].filter(i => i.kind === 'file').map(i => i.getAsFile()).filter(Boolean);
    if (imgs.length) { e.preventDefault(); intakeFiles(imgs.map((f, k) => new File([f], f.name && f.name !== 'image.png' ? f.name : `붙여넣은 캡처_${k + 1}.png`, { type: f.type }))); return; }
    if (!inField && tgt.closest && tgt.closest('#intake')) { const t = e.clipboardData.getData('text'); if (t && t.trim().length > 10) { e.preventDefault(); const k = parseKakao(t), a = { name: '붙여넣은 글', kind: k ? '메신저' : '기타', text: k ? k.text : t, imgs: [], meta: k ? k.meta : {}, inc: true }; INTAKE.att.push(a); renderAtt(); openIntakeReview(a.text, [a]); } }
  });
  document.getElementById('inPaste').onclick = async () => {
    try { const t = await navigator.clipboard.readText(); if (!t || t.trim().length < 5) return toast('복사된 글이 없습니다. 메일·카톡 내용을 복사한 뒤 다시 누르세요.');
      const k = parseKakao(t), a = { name: '붙여넣은 글', kind: k ? '메신저' : '기타', text: k ? k.text : t, imgs: [], meta: k ? k.meta : {}, inc: true }; INTAKE.att.push(a); renderAtt(); openIntakeReview(a.text, [a]);
    } catch (e) { toast('이 화면에서는 「Ctrl+V」로 붙여넣어 주세요.'); }
  };
  document.getElementById('inFiles').addEventListener('click', e => { const x = e.target.closest('[data-x]'); if (x) { INTAKE.att.splice(+x.dataset.x, 1); renderAtt(); } });
  document.getElementById('inFiles').addEventListener('change', e => { const c = e.target.closest('[data-i]'); if (c) { INTAKE.att[+c.dataset.i].inc = c.checked; renderAtt(); } });
}
