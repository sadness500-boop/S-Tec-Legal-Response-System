/* =====================================================================
 * Legal Response System (법률 대응 시스템) — 상단 기능 · 사업장 선정 · 대표 사례
 * (Attendance Management Software 상단 기능과 동일: 담당 지정 · 다운로드 QR · 친구 추천 · 내 계정 · 주간/야간/시스템)
 * Designed & Developed by Rat Rae Choi
 * ===================================================================== */
const UI_KEY = 'stlr_ui';
let UI = { theme: 'system', manager: null, br: '' };
try { UI = Object.assign(UI, JSON.parse(localStorage.getItem(UI_KEY) || '{}')); } catch (e) { }
function saveUI() { try { localStorage.setItem(UI_KEY, JSON.stringify(UI)); } catch (e) { } }   // 로그인 시 여러 기기 동기화(auth 모듈이 감쌈)

/* ---------- 테마: 주간 / 야간 / 시스템 ---------- */
const MQ = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
function applyTheme(t) {
  if (!['light', 'dark', 'system'].includes(t)) t = 'system';
  const dark = t === 'dark' || (t === 'system' && MQ && MQ.matches);
  document.body.classList.toggle('dark', dark);
  if (t === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
  UI.theme = t; saveUI();
  document.querySelectorAll('[data-theme-set]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.themeSet === t)));
}
if (MQ && MQ.addEventListener) MQ.addEventListener('change', () => { if (UI.theme === 'system') applyTheme('system'); });

/* ---------- 모달 ---------- */
function closeModal() { document.querySelectorAll('.modal-bg').forEach(n => n.remove()); }
function openModal(html, bind) {
  closeModal(); const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}<div class="m-sign">Designed &amp; Developed by Rat Rae Choi</div></div>`;
  bg.addEventListener('click', e => { if (e.target === bg) closeModal(); }); bg.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  document.body.appendChild(bg); const md = bg.querySelector('.modal'); bind && bind(md);
}
function copyText(t, ok) {
  const done = () => toast(ok || '복사했습니다');
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, fallback); else fallback();
  function fallback() { const x = document.createElement('textarea'); x.value = t; document.body.appendChild(x); x.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('복사하지 못했습니다'); } x.remove(); }
}

/* ---------- QR (qrcode-generator, 내장 — 인터넷 없이 동작) ---------- */
function makeQR(el, text, size) {
  el.innerHTML = '';
  try {
    const q = qrcode(0, 'M'); q.addData(text); q.make();
    const n = q.getModuleCount(), cell = Math.max(2, Math.floor(size / (n + 4)));
    const img = new Image(); img.alt = 'QR'; img.src = q.createDataURL(cell, cell * 2); img.style.width = size + 'px'; img.style.height = size + 'px'; img.style.imageRendering = 'pixelated';
    el.appendChild(img);
  } catch (e) { el.innerHTML = '<b style="color:#0b1757">QR</b>'; }
}
const shareUrl = () => APP.shareUrl;
function urlBox(id, v) { return `<div class="urlbox"><input id="${id}" readonly value="${esc(v || shareUrl())}" aria-label="주소"><button class="btn" data-copy="${id}">주소 복사</button></div>`; }
function bindCopies(md) { md.querySelectorAll('[data-copy]').forEach(b => b.onclick = () => copyText(md.querySelector('#' + b.dataset.copy).value, '복사했습니다')); }
function openQR() {
  let mode = 'web';
  const draw = md => {
    const url = mode === 'web' ? shareUrl() : APP.apkUrl;
    makeQR(md.querySelector('#qrBig'), url, 240); md.querySelector('#qrUrl').value = url;
    md.querySelectorAll('[data-qm]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.qm === mode)));
    md.querySelector('#qrTip').innerHTML = mode === 'web' ? '북마크: PC는 Ctrl+D · 휴대폰은 브라우저 메뉴 → 홈 화면에 추가' : '안드로이드 앱(APK) 설치 파일입니다. 내려받은 뒤 "출처를 알 수 없는 앱 설치"를 허용하고 설치하세요. Play 프로텍트 경고가 뜨면 "무시하고 설치"를 누릅니다.';
  };
  openModal(`<h2>다운로드 QR</h2><div class="sub">휴대폰 카메라로 찍으면 바로 열립니다.</div>
    <div class="subtabs" role="group" aria-label="QR 종류"><button data-qm="web" aria-pressed="true">웹 버전 (사이트 주소)</button><button data-qm="apk" aria-pressed="false">안드로이드 앱 (APK)</button></div>
    <div class="qrbig" id="qrBig"></div>${urlBox('qrUrl')}<p class="hint" id="qrTip"></p>
    <div class="mrow"><button class="btn pri" id="mClose">닫기</button></div>`, md => {
    bindCopies(md); md.querySelector('#mClose').onclick = closeModal;
    md.querySelectorAll('[data-qm]').forEach(b => b.onclick = () => { mode = b.dataset.qm; draw(md); }); draw(md);
  });
}
function openRef() {
  const mg = UI.manager || {};
  const msg = `[에스텍 그룹] Legal Response System(법률 대응 시스템) ${APP.version}\n고객사의 부당한 클레임과 근무자로 인해 생긴 노무·법률 사안을 고르면 법령(국가법령정보센터 기준) 근거와 대응방안을 Word·PPT·PDF로 만들어 주는 프로그램입니다.\n${shareUrl()}${mg.name ? `\n추천: ${mg.name}${mg.title ? ' ' + mg.title : ''}${mg.org ? ' (' + mg.org + ')' : ''}` : ''}`;
  openModal(`<h2>친구 추천</h2><div class="sub">QR을 보여주거나 주소·추천 메시지를 복사해 카카오톡·문자로 보내세요.</div>
    <div class="qrbig" id="refQr"></div>${urlBox('refUrl')}
    <div class="field"><label for="refMsg">추천 메시지</label><textarea id="refMsg" rows="5">${esc(msg)}</textarea></div>
    <div class="mrow"><button class="btn" data-copy="refMsg">메시지 복사</button><button class="btn pri" id="mClose">닫기</button></div>`, md => {
    makeQR(md.querySelector('#refQr'), shareUrl(), 220); bindCopies(md); md.querySelector('#mClose').onclick = closeModal;
  });
}

/* ---------- 법률대응 담당 (지정되어야 프로그램 구동) ---------- */
function readPhoto(file, cb) {
  const rd = new FileReader();
  rd.onload = () => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); const z = 128; c.width = c.height = z; const g = c.getContext('2d'); const mm = Math.min(img.width, img.height); g.drawImage(img, (img.width - mm) / 2, (img.height - mm) / 2, mm, mm, 0, 0, z, z); cb(c.toDataURL('image/jpeg', .85)); }; img.onerror = () => toast('사진을 읽을 수 없습니다. JPG나 PNG를 선택하세요'); img.src = rd.result; };
  rd.readAsDataURL(file);
}
function mgrFormHtml() {
  const m = UI.manager || { name: '', title: '', org: APP.branch, phone: '', photo: '', br: '' };
  return `<div class="avatar-edit"><div class="av" id="mgAv">${m.photo ? `<img src="${m.photo}" alt="">` : esc((m.name || '담')[0])}</div>
    <div><label class="btn sm" for="mgFile">사진 선택</label><input type="file" id="mgFile" accept="image/*" hidden> <button class="btn sm" id="mgNoPh" type="button">사진 빼기</button></div></div>
    <div class="grid2"><div class="field"><label for="mgName">성명 (필수)</label><input id="mgName" value="${esc(m.name)}" autocomplete="name"></div>
    <div class="field"><label for="mgTitle">직책</label><input id="mgTitle" value="${esc(m.title)}" placeholder="예: 지사장, 과장"></div></div>
    <div class="grid2"><div class="field"><label for="mgBr">담당 지사 (사업장 목록을 이 지사로 시작)</label><select id="mgBr"><option value="">회사 전체</option>${BRANCHES.map(b => `<option value="${b.key}" ${b.key === m.br ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></div>
    <div class="field"><label for="mgOrg">소속</label><input id="mgOrg" value="${esc(m.org)}"></div></div>
    <div class="field"><label for="mgPhone">연락처</label><input id="mgPhone" value="${esc(m.phone)}" inputmode="tel"></div>
    <div class="err" id="mgErr"></div>`;
}
function bindMgrForm(root, done) {
  let photo = (UI.manager && UI.manager.photo) || '';
  root.querySelector('#mgFile').onchange = ev => { const f = ev.target.files[0]; if (f) readPhoto(f, d => { photo = d; root.querySelector('#mgAv').innerHTML = `<img src="${d}" alt="">`; }); };
  root.querySelector('#mgNoPh').onclick = () => { photo = ''; root.querySelector('#mgAv').textContent = (root.querySelector('#mgName').value || '담')[0]; };
  return () => {
    const name = root.querySelector('#mgName').value.trim();
    if (!name) { root.querySelector('#mgErr').textContent = '법률대응 담당 성명을 입력해야 프로그램이 시작됩니다.'; root.querySelector('#mgName').focus(); return false; }
    UI.manager = { name, title: root.querySelector('#mgTitle').value.trim(), br: root.querySelector('#mgBr').value, org: root.querySelector('#mgOrg').value.trim(), phone: root.querySelector('#mgPhone').value.trim(), photo, since: (UI.manager && UI.manager.since) || fmtD(kstNow()) };
    UI.br = UI.manager.br; saveUI(); applyManager(); renderHeader(); renderSites(); done && done(); return true;
  };
}
function openMgr() {
  openModal(`<h2>법률대응 담당 지정</h2><div class="sub">법률대응 담당이 지정되어 있어야 프로그램이 구동됩니다.</div>${mgrFormHtml()}
    <div class="mrow"><span id="mgCf"></span>${UI.manager ? '<button class="btn warn" id="mgOff">담당 해제</button>' : ''}<button class="btn" id="mClose">취소</button><button class="btn pri" id="mgOk">저장</button></div>`, md => {
    const commit = bindMgrForm(md, () => { closeModal(); toast('법률대응 담당을 저장했습니다'); });
    md.querySelector('#mgOk').onclick = commit; md.querySelector('#mClose').onclick = closeModal;
    const off = md.querySelector('#mgOff');
    if (off) off.onclick = () => {
      md.querySelector('#mgCf').innerHTML = `<span class="confirm">해제하면 프로그램이 잠깁니다. <button class="btn sm warn" id="mgY">해제</button></span>`;
      md.querySelector('#mgY').onclick = () => { UI.manager = null; saveUI(); closeModal(); renderHeader(); showGate(); };
    };
  });
}
function applyManager() {   // 작성자·작성 부서 기본값
  const m = UI.manager; if (!m) return;
  const a = $('#f_author'), d = $('#f_dept');
  if (a && !a.dataset.touched) a.value = [m.title, m.name].filter(Boolean).join(' ');
  if (d && !d.dataset.touched && m.org) d.value = m.org;
}
function renderHeader() {
  const m = UI.manager;
  $('#mgrPh').innerHTML = m && m.photo ? `<img src="${m.photo}" alt="">` : `<b style="color:#14267e;font-size:19px">${esc(m ? m.name[0] : '?')}</b>`;
  $('#mgrName').innerHTML = m ? `<em>${esc(m.name)}</em> ${esc(m.title || '')}` : '미지정';
  $('#mgrOrg').textContent = m ? ((m.br ? m.br + '지사 담당 · ' : '전체 통합 관리 · ') + (m.org || '')) : '눌러서 지정';
  makeQR($('#qrMini'), shareUrl(), 42);
}
function showGate() {
  const gt = $('#mgrGate');
  if (UI.manager) { gt.classList.add('hidden'); document.body.classList.remove('gate-locked'); return; }
  gt.classList.remove('hidden'); document.body.classList.add('gate-locked');
  $('#gateForm').innerHTML = mgrFormHtml() + '<button class="btn pri" id="gateGo" style="width:100%;padding:11px;font-size:15px">법률대응 담당 지정하고 시작</button>';
  const commit = bindMgrForm($('#gateForm'), () => { showGate(); toast('법률 대응 시스템을 시작합니다'); });
  $('#gateGo').onclick = commit;
  $('#mgName').addEventListener('keydown', e => { if (e.key === 'Enter') commit(); });
}

/* =====================================================================
 * ① 발생 사업장 선정 — 에스텍 그룹 사업장 목록
 * ===================================================================== */
function siteMatches(st, q) { return !q || (st.name + ' ' + st.addr + ' ' + st.work + ' ' + st.type + ' ' + (st.mgr || '')).toLowerCase().includes(q); }
function renderSites() {
  const q = ($('#sq').value || '').trim().toLowerCase(), br = UI.br || '';
  document.querySelectorAll('#brChips button').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.br || '') === br)));
  const allow = (window.APP_ACCESS && APP_ACCESS.branches && APP_ACCESS.branches.length) ? APP_ACCESS.branches : null;   // 프로그램별 권한 · 관리 범위(지사)
  const list = SITES.filter(st => (!allow || allow.includes(st.br)) && (!br || st.br === br) && siteMatches(st, q));
  state.siteList = list; if (typeof drawPins === 'function') drawPins();
  $('#siteCnt').textContent = `${list.length}곳 · ${list.reduce((a, s) => a + (s.total || 0), 0)}명`;
  $('#siteList').innerHTML = list.length ? list.map(st => `<li class="st ${state.site && state.site.id === st.id ? 'on' : ''}" data-id="${st.id}">
      <span class="brb b-${st.br}">${st.br}</span><span class="nm">${esc(st.name)}<small>${esc(st.addr)}</small></span>
      <span class="wk">${esc(st.work)}<b>${st.total}명</b></span></li>`).join('') : '<li class="empty">검색 결과가 없습니다. 아래 [직접 입력]을 쓰세요.</li>';
}
function selectSite(st, silent) {
  state.site = st;
  $('#f_client').value = st.name; $('#f_job').value = st.work || '';
  renderSiteInfo(); renderSites();
  if (!silent) { toast(`발생 사업장: ${st.name} (${st.br}지사)`); if (innerWidth < 1250) $('#formCard').scrollIntoView({ behavior: 'smooth' }); }
}
function manualSite() {
  state.site = null; renderSiteInfo(); renderSites();
  $('#f_client').value = ''; $('#f_client').focus(); toast('고객사명(사업장명)을 직접 입력하세요.');
}
function renderSiteInfo() {
  const st = state.site, box = $('#siteInfo');
  if (!st) {
    box.className = 'siteinfo empty';
    box.innerHTML = `<b>① 발생 사업장</b><span>${$('#f_client').value ? '직접 입력: <em>' + esc($('#f_client').value) + '</em> (사업장 목록 정보 없이 출력됩니다)' : '왼쪽 「① 발생 사업장 선정」에서 사안이 발생한 사업장을 고르세요.'}</span>`;
    return;
  }
  box.className = 'siteinfo';
  box.innerHTML = `<div class="si-h"><span class="brb b-${st.br}">${st.br}지사</span><b>${esc(st.name)}</b><button class="btn sm" id="siClear" type="button">변경</button></div>
    <div class="si-g">
      <span><i>주소</i>${esc(st.addr || '-')}</span>
      <span><i>계약일</i>${esc(st.since || '-')}</span><span><i>유형</i>${esc(st.type || '-')}</span>
      <span><i>계약 업종</i>${esc(st.work || '-')}</span><span><i>근무형태</i>${esc(st.shift || '-')}</span>
      <span><i>계약 인원</i>총 <b>${st.total}</b>명 (남 ${st.m} · 여 ${st.f})</span><span><i>업종별</i>보안 ${st.sec} · 미화 ${st.cln} · 기타 ${st.etc}</span>
      <span><i>현장 책임자</i>${esc([st.pos, st.mgr].filter(Boolean).join(' ') || '-')} ${esc(st.mtel || '')}</span><span><i>사업장 전화</i>${esc(st.stel || '-')}</span>
    </div>`;
  $('#siClear').onclick = () => { $('#siteCard').scrollIntoView({ behavior: 'smooth' }); $('#sq').focus(); };
}

function uiInit() {
  $('#appIcon').src = ASSET.icon; $('#gateLogo').src = ASSET.logo;
  $('#ver').textContent = APP.version;
  const chips = () => { const allow = (window.APP_ACCESS && APP_ACCESS.branches && APP_ACCESS.branches.length) ? APP_ACCESS.branches : null;
    $('#brChips').innerHTML = `<button data-br="">${allow ? '담당 전체' : '전체'}</button>` + BRANCHES.filter(b => !allow || allow.includes(b.key)).map(b => `<button data-br="${b.key}">${b.key}</button>`).join('');
    if (allow && UI.br && !allow.includes(UI.br)) UI.br = ''; };
  chips();
  window.addEventListener('app-access', () => { chips(); renderSites(); });
  $('#brChips').onclick = e => { const b = e.target.closest('button'); if (!b) return; UI.br = b.dataset.br; saveUI(); renderSites(); };
  $('#sq').addEventListener('input', renderSites);
  $('#siteList').onclick = e => { const li = e.target.closest('li.st'); if (li) selectSite(SITES.find(x => x.id === +li.dataset.id)); };
  $('#siteManual').onclick = manualSite;
  $('#f_client').addEventListener('input', () => { if (state.site && $('#f_client').value !== state.site.name) { state.site = null; renderSites(); } renderSiteInfo(); });
  ['f_author', 'f_dept'].forEach(id => $('#' + id).addEventListener('input', e => e.target.dataset.touched = '1'));
  $('#mgrCard').onclick = openMgr; $('#qrCard').onclick = openQR; $('#refCard').onclick = openRef;
  document.querySelectorAll('[data-theme-set]').forEach(b => b.onclick = () => applyTheme(b.dataset.themeSet));
  applyTheme(UI.theme); renderHeader(); renderSites(); renderSiteInfo(); applyManager(); showGate(); initMap(); initCases(); initIntake(); fitTree(); setTimeout(fitTree, 400); addEventListener('resize', fitTree);
}

/* =====================================================================
 * 사업장 위치 지도 — 카카오맵 (회사 공용 JavaScript 키 · 등록 도메인 sadness500-boop.github.io)
 * 웹 주소·안드로이드 앱에서 표시, 그 밖(PC에 내려받은 HTML 등)에서는 「카카오맵에서 열기」 바로가기
 * ===================================================================== */
const KAKAO_KEY = '8453c0a68310133484b3b92ed0f0a1f7';
const BR_COLOR = { 동부: '#1E8B3A', 서부: '#0B1F8F', 남부: '#C2410C', 중부: '#6D28D9' };
try{ if(window.StecMaster) StecMaster.colors(BR_COLOR); }catch(e){} /*sm-col*/
const MAP = { ready: null, map: null, pins: [] };
function mapCanLoad() { return (location.protocol === 'https:' && /(^|\.)sadness500-boop\.github\.io$/.test(location.hostname)) || !!window.Capacitor; }
function loadKakao() {
  if (MAP.ready) return MAP.ready;
  MAP.ready = new Promise((res, rej) => {
    if (window.kakao && kakao.maps) { kakao.maps.load(res); return; }
    const s = document.createElement('script'); s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false`;
    s.onload = () => { try { kakao.maps.load(res); } catch (e) { rej(e); } }; s.onerror = rej; document.head.appendChild(s);
    setTimeout(() => rej(new Error('timeout')), 10000);
  });
  return MAP.ready;
}
async function initMap() {
  if (!mapCanLoad()) { mapFallback('지도는 웹 주소(sadness500-boop.github.io) 또는 안드로이드 앱에서 표시됩니다.'); return; }
  try {
    await loadKakao(); const k = kakao.maps, box = $('#siteMap'); box.classList.remove('nomap'); box.innerHTML = '';
    MAP.map = new k.Map(box, { center: new k.LatLng(35.55, 128.95), level: 11 });
    MAP.map.addControl(new k.ZoomControl(), k.ControlPosition.RIGHT);
    drawPins();
  } catch (e) { MAP.ready = null; mapFallback('카카오맵을 불러오지 못했습니다(인터넷 연결을 확인하세요).'); }
}
function mapFallback(msg) {
  const box = $('#siteMap'); box.classList.add('nomap');
  box.innerHTML = `<div class="nomap-in"><b>🗺 사업장 위치</b><span>${esc(msg)}</span><span id="mapLink"></span></div>`; updMapLink();
}
function updMapLink() {
  const l = $('#mapLink'), st = state.site;
  const html = st && st.lat ? `<a href="https://map.kakao.com/link/map/${encodeURIComponent(st.name)},${st.lat},${st.lng}" target="_blank" rel="noopener">📍 ${esc(st.name)} — 카카오맵에서 열기</a>` : '사업장을 고르면 카카오맵 바로가기가 나타납니다.';
  if (l) l.innerHTML = html;
  const cap = $('#mapCap'); if (cap) cap.innerHTML = st && st.lat ? `📍 <b>${esc(st.name)}</b> · ${esc(st.addr)} <a href="https://map.kakao.com/link/to/${encodeURIComponent(st.name)},${st.lat},${st.lng}" target="_blank" rel="noopener">길찾기</a>` : '지도의 점을 누르면 그 사업장이 선택됩니다.';
}
function drawPins() {
  updMapLink();
  if (!MAP.map) return;
  const k = kakao.maps; MAP.pins.forEach(o => o.setMap(null)); MAP.pins = [];
  const list = state.siteList || SITES, bounds = new k.LatLngBounds(); let n = 0;
  list.forEach(st => {
    if (!st.lat) return; const pos = new k.LatLng(st.lat, st.lng); bounds.extend(pos); n++;
    const on = state.site && state.site.id === st.id;
    const el = document.createElement('div'); el.className = 'kpin' + (on ? ' on' : ''); el.style.setProperty('--c', BR_COLOR[st.br] || '#333'); el.title = `${st.name} (${st.br}지사)`;
    el.innerHTML = on ? `<i></i><span>${esc(st.name)}</span>` : '<i></i>';
    el.addEventListener('click', () => selectSite(st, true));
    const ov = new k.CustomOverlay({ position: pos, content: el, xAnchor: on ? 0.08 : 0.5, yAnchor: 0.5, zIndex: on ? 10 : 1, clickable: true }); ov.setMap(MAP.map); MAP.pins.push(ov);
  });
  MAP.map.relayout();
  if (state.site && state.site.lat) { MAP.map.setLevel(6); MAP.map.panTo(new k.LatLng(state.site.lat, state.site.lng)); }
  else if (n) MAP.map.setBounds(bounds, 30, 30, 30, 30);
}

/* ===== 메인 화면 — 대응이 난감했던 대표 사례 (누르면 ③에 자동 작성) — Designed & Developed by Rat Rae Choi ===== */
const CASES = [
  { id: 'consulate', ic: '🏛', tag: '고객사 갑질', t: '부산 일본영사관 — 영사관 직원 갑질 대응', s: '공식 항의·정직 징계 후 복귀한 영사관 직원의 부적절 언행이 재발 — 계약 유지와 근무자 보호를 함께',
    codes: ['D1-01'], f: { f_client: '주부산일본국총영사관', f_site: '영사관 정문 경비실', f_job: '보안(경비)', f_channel: '대면', f_occur: '2026년 10월 복귀 이후 반복', f_raiser: '영사관 소속 노 주임(행위자)', f_workers: '당사 경비원(보안) 다수',
      f_content: '영사관 소속 노 주임이 당사 경비원들에게 반말·고성·인격 모독성 발언 등 부적절한 언행을 반복함.\n2026년 여름 당사의 공식 항의 후 영사관 측이 정직 징계를 하였으나, 10월 업무 복귀 이후 같은 행위가 다시 발생함.\n경비원들이 정신적 고통을 호소하며 근무 지속에 어려움을 표시함.',
      f_demand: '(당사 요구) 행위자에 대한 재발방지 조치 및 결과 회신\n(당사 요구) 경비원과 행위자의 업무 접촉 최소화\n11월 초 영사관 측과 미팅 예정',
      f_facts: '1차 공식 항의(2026년 여름) → 영사관 측 정직 징계 처분 확인\n10월 복귀 후 재발 — 경비원 진술서 확보 필요(일시·발언 내용·목격자)\n영사관과의 용역계약 유지가 최우선 — 강경책(고소 등)은 최후 수단',
      f_goal: '계약관계를 유지하면서 재발을 확실히 막는 단계적 대응' } },
  { id: 'gmb', ic: '🤝', tag: '근무자 갈등', t: 'GMB 사업장 — 보안팀 갈등에 따른 인사조치', s: '보안팀장(C)과 보안요원(D)의 갈등 — 해고·강제 전보 시 법적 리스크와 원·하청 구조 리스크',
    codes: ['I1-01', 'A1-01'], f: { f_client: 'GMB 사업장', f_site: '보안팀', f_job: '보안(경비)', f_channel: '대면', f_occur: '2026년 7~8월 지속', f_raiser: '보안팀장 C / 원청 담당자', f_workers: '보안요원 D',
      f_content: '보안팀장 C와 보안요원 D 사이에 업무지시 이행을 둘러싼 갈등이 지속되어 팀 운영에 차질이 발생함.\nC는 D의 업무지시 불이행을, D는 C의 고압적 언행(괴롭힘)을 각각 주장함.\n원청 측에서도 D의 교체를 언급하고 있음.',
      f_demand: '보안요원 D의 교체(퇴출) 요구\n팀 분위기 정상화',
      f_facts: '양측 진술서 확보 전 — 「업무지시 불이행」인지 「직장 내 괴롭힘」인지 사실 확인이 우선\nD의 징계 이력 없음(확인 필요)\n대체 근무지(전보 후보) 및 통근 거리 확인 필요',
      f_goal: '해고 대신 사실 확인 후 공정한 분리(전보) — 부당해고·부당전보·불법파견 리스크 차단' } },
  { id: 'injury', ic: '🚑', tag: '산재', t: '대한제강 — 경비원 B 산재 철회 후 복직 요청', s: '사업장 내 포터 화물차 사고 → 자동차보험 처리 → 산재 신청 → 2~3일 만에 취하·즉시 복직 요청',
    codes: ['H1-02', 'H1-03'], f: { f_client: '대한제강', f_site: '사업장 내 차량 출입로', f_job: '보안(경비)', f_channel: '대면', f_occur: '근무 중(사고 약 10일 후 산재 신청)', f_raiser: '경비원 B 본인', f_workers: '경비원 B',
      f_content: '근무 중 사업장에 진입한 포터 화물차량에 의해 경비원 B가 교통사고를 당함.\n처음에는 가해 차량 자동차보험으로 처리하기로 하여 산재를 신청하지 않았고 보험사가 약 270만원 보상금을 제시함.\n사고 약 10일 후 근로자 요청으로 회사가 근로복지공단에 산재를 신청했으나, 2~3일 뒤 근로자가 산재 취하와 즉시 복직을 요청함.',
      f_demand: '(근로자) 산재 신청 취하\n(근로자) 즉시 복직',
      f_facts: '산재 신청일·취하 요청일 기록 확인\n주치의 업무 복귀 소견서 미확보\n회사 우려: 복직 후 사고를 이유로 반복적인 근무 조정 요구 가능성',
      f_goal: '근로자 의사 존중 + 은폐 오해 차단 + 복직 후 근무 조정 요구에 대한 기준 마련' } },
  { id: 'petition', ic: '🏛', tag: '노동청 진정', t: '노동청 진정 — 휴게시간·야간수당 미지급', s: '퇴사 경비원이 휴게시간에도 대기했다며 휴게시간 임금·야간수당 차액을 진정',
    codes: ['F1-02', 'F1-01'], f: { f_client: '', f_site: '정문 초소', f_job: '보안(경비)', f_channel: '공문', f_occur: '재직기간 전체(최근 3년)', f_raiser: '부산지방고용노동청 근로감독관', f_workers: '퇴사 경비원 1명',
      f_content: '퇴사한 경비원이 「야간 휴게시간에도 초소를 비울 수 없었고 무전 호출에 응해야 했다」며 휴게시간 임금과 야간근로수당 차액을 청구하는 진정을 제기함.\n노동청에서 출석 요구서가 도착함.',
      f_demand: '휴게시간 임금 및 야간수당 차액 지급\n출석 조사(근로감독관)',
      f_facts: '감시·단속적 근로 승인 여부 확인 필요\n휴게시간표·휴게 공지문 존재 여부 확인\n고객사가 휴게 중 대기를 지시했는지 확인',
      f_goal: '사실에 맞게 정산하고 처벌불원으로 종결, 휴게 운영 개선' } },
  { id: 'probation', ic: '📑', tag: '수습 종료', t: '수습 종료 통보 — 본채용 거부 다툼', s: '수습 3개월 만료 직전 문자로 종료 통보 → 근로자가 부당해고 구제신청 예고',
    codes: ['G1-01', 'G2-03'], f: { f_client: '', f_site: '', f_job: '미화', f_channel: '메신저', f_occur: '수습 만료 3일 전', f_raiser: '해당 근로자', f_workers: '미화원 1명(수습)',
      f_content: '수습기간 3개월 만료 직전 현장 책임자가 문자로 「수습 종료, 내일부터 안 나와도 된다」고 통보함.\n근로자는 평가를 받은 적이 없고 이유도 모른다며 부당해고 구제신청을 하겠다고 함.',
      f_demand: '(근로자) 해고 철회 및 복직 또는 보상',
      f_facts: '근로계약서에 수습기간 조항은 있으나 평가 기준은 없음(확인 필요)\n수습 평가표·지도 기록 없음\n문자 통보 외 서면통지 없음',
      f_goal: '절차 하자 시정 — 통보 철회 후 평가 재진행 또는 합의 종결 판단' } },
  { id: 'termination', ic: '💰', tag: '계약 해지', t: '고객사 계약 해지 통보 + 근무자 고용 종료', s: '고객사가 대금 감액에 이어 30일 후 용역 종료를 통보 — 해지 효력·근무자 고용 대책',
    codes: ['C2-01', 'C1-01', 'G1-03'], f: { f_client: '', f_site: '', f_job: '보안/미화', f_channel: '공문', f_occur: '', f_raiser: '고객사 총무팀장', f_workers: '현장 근무자 전원',
      f_content: '고객사가 지난달 용역대금에서 「서비스 미흡」을 이유로 일방적으로 일부를 공제한 데 이어, 30일 후 용역계약을 종료하겠다는 공문을 보냄.\n종료 사유는 구체적으로 적혀 있지 않음.',
      f_demand: '30일 후 용역계약 종료\n공제한 대금은 지급하지 않겠다는 입장',
      f_facts: '계약서 해지 조항(사유·통지기간·시정 기회) 확인 필요\n공제 근거 조항 확인 필요\n현장 근무자 근로계약의 기간·용역 연동 조항 확인 필요',
      f_goal: '해지 재검토·정산 협의, 근무자는 승계·배치로 고용 유지' } },
  { id: 'fire', ic: '🔥', tag: '화재 사고', t: '한국제지 온산공장 — 흡연부스 화재', s: '새벽 순찰 통과 후 제품창고 옆 흡연부스 뒤편 화재 — 감시 사각지대·책임 범위 소명',
    codes: ['M1-01', 'E1-01'], f: { f_client: '한국제지 온산공장', f_site: '4호기 제품창고 옆 흡연부스', f_job: '보안(경비)', f_channel: '대면', f_occur: '2026-09-23 02:00경', f_raiser: '고객사 공장 관리팀', f_workers: '야간 경비원',
      f_content: '새벽 02:00경 4호기 제품창고 옆 흡연부스 뒤편에서 화재가 발생함.\n당사 경비원은 01:10경 해당 구역 순찰을 통과했으며, 이후 발화한 것으로 추정됨.\n고객사는 경비 근무 중 화재를 조기에 발견하지 못한 책임을 묻고 있음.',
      f_demand: '화재사고 경위 보고서 제출\n경비 책임 여부 해명 및 재발방지 대책',
      f_facts: '순찰 기록상 01:10경 해당 구역 통과 확인\n발화 지점은 경비실 화재수신기·CCTV 미연동 사각지대\n초기 신고·진화 경과 시간대별 정리 필요',
      f_goal: '순찰 의무 이행을 소명하고 감시 설비 개선으로 재발 방지 — 계약 관계 유지' } },
  { id: 'dispatch', ic: '🍱', tag: '파견·교체', t: '한국하우톤 — 조리원 파견 교체·급식 위탁 검토', s: '에스텍플러스 파견 조리원 2명 — 조리능력을 이유로 교체 또는 급식업체 위탁 검토',
    codes: ['A1-01', 'Q1-02', 'C2-01'], f: { f_client: '한국하우톤', f_site: '구내식당', f_job: '조리', f_channel: '대면', f_occur: '2026년 9월', f_raiser: '고객사 총무 담당', f_workers: '파견 조리원 2명',
      f_content: '에스텍플러스가 파견한 조리원 2명(중식 70~80명, 평일 운영)에 대해 고객사가 메뉴 단순화 등 조리능력 문제를 이유로 인력 교체 또는 급식 전문업체 위탁 전환을 검토하고 있음.',
      f_demand: '조리원 교체\n또는 급식 위탁 전환(계약 종료)',
      f_facts: '파견계약 기간·대상업무·파견 기간(2년) 확인 필요\n조리능력 관련 구체적 지적 사례·개선 요청 이력 확인 필요\n교체 시 기존 조리원 타 사업장 배치 가능성 확인',
      f_goal: '근거 있는 개선으로 계약 유지, 교체 시에도 고용 유지' } }
];
function initCases() {
  const box = document.getElementById('caseBox'); if (!box) return;
  box.innerHTML = `<div class="cs-h"><b>⚖ 대응이 난감했던 사례로 바로 시작</b><small>누르면 ② 항목과 ③ 내용이 채워집니다(마우스를 올리면 요약) — 실제 내용으로 고쳐 쓰세요</small></div>
    <div class="cs-grid">${CASES.map((c, i) => `<button type="button" class="cs" data-i="${i}" title="${esc(c.t + ' — ' + c.s)}"><span class="cs-ic">${c.ic}</span><span class="cs-b"><em>${esc(c.tag)}</em><b>${esc(c.t)}</b><small>${esc(c.s)}</small>
      <span class="cs-chips">${c.codes.map(code => { const x = findSmall(code); return x ? `<i class="s${x.S.s}">${code}</i>` : ''; }).join('')}</span></span></button>`).join('')}</div>`;
  box.onclick = e => { const b = e.target.closest('.cs'); if (b) loadCase(+b.dataset.i); };
}
function loadCase(i) {
  const c = CASES[i]; if (!c) return;
  state.site = null; renderSites();
  Object.entries(c.f).forEach(([id, v]) => { const el = $('#' + id); if (el) el.value = v; });
  if (!c.f.f_client) $('#f_client').value = '(사업장명 입력)';
  renderSiteInfo();
  state.picked = c.codes.filter(findSmall); state.plan = null;
  renderTree($('#q').value); renderPicked();
  toast(`「${c.t}」 사례를 채웠습니다. 사업장·내용을 실제에 맞게 고친 뒤 [법률 검토 생성]을 누르세요.`, 4200);
  const fc = $('#formCard'); if (fc) fc.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


/* ② 사안 분류가 첫 화면 안에 보이도록 — 트리 높이를 화면 아래 끝에 맞춤 */
function fitTree() {
  const t = document.getElementById('tree'); if (!t) return;
  t.style.maxHeight = ''; return;   // v1.1.0: ② 사안 분류는 오른쪽 열 — CSS 높이(56vh) 사용
  if (innerWidth <= 820) { t.style.maxHeight = ''; return; }
  const top = t.getBoundingClientRect().top + scrollY, foot = (document.querySelector('.foot') || {}).offsetHeight || 0;
  t.style.maxHeight = Math.max(140, Math.round(innerHeight - top - 66 - (getComputedStyle(document.querySelector('.foot') || document.body).position === 'fixed' ? foot : 0))) + 'px';
}
