/* =====================================================================
 * Legal Response System — ⑤ 근무자 조치 문서 (내부 · 대외비)
 * 사안을 초래한 당사 근무자에 대한 인사조치 계획서를 Word · PPT · PDF 3종으로 출력
 * 징계 양정(구두주의 → 서면경고 → 감급 → 정직 → 해고 검토), 절차(경위서·소명·징계위원회·서면통지), 법적 유의사항, 서식(경위서·확인서)
 * Designed & Developed by Rat Rae Choi
 * ===================================================================== */
const DLV = [
  { k: 0, n: '징계 없음', s: '교육·보호 조치', d: '근무자 귀책이 없거나 회사 관리 책임인 사안 — 교육·지원·보호 조치로 처리', c: '6B7385' },
  { k: 1, n: '구두 주의', s: '현장 교육', d: '경미한 1회성 사안 — 면담 후 구두 주의, 근무지침 재교육, 기록 보관', c: '2E8B57' },
  { k: 2, n: '서면 경고', s: '시말서 징구', d: '주의 후에도 반복되거나 고객사 신뢰를 해친 사안 — 경고장 발부·시말서 징구, 특별 직무지시서 서명', c: 'D98E04' },
  { k: 3, n: '감급', s: '근기법 제95조 한도', d: '서면 경고 후 재위반 또는 중대 위반 — 1회 1일 평균임금 1/2, 총액 월 임금 1/10 이내(징계위원회 의결)', c: 'C8553D' },
  { k: 4, n: '정직', s: '징계위원회 의결', d: '중대 위반·고의적 위반·사고 연계 — 일정 기간 출근 정지(무급), 징계위원회 의결 및 서면 통지', c: 'A33A2E' },
  { k: 5, n: '해고 검토', s: '징계위원회 · 서면통지', d: '반복된 중대 위반 등 근로관계 유지가 어려운 경우 — 정당한 사유·절차 엄격 검토, 해고예고·서면통지', c: '6D1F1F' }
];
const REPEAT = [['first', '초범 (첫 위반)', 0], ['second', '재위반 (2회째)', 1], ['third', '3회 이상 반복', 2]];
const EXTRA = ['근무지침·법정 직무교육 재실시', '특별 직무지시서 서명 징구', '근무 위치·시간 불시점검 강화(30일)', '배치전환 검토(근로자 협의)', '고객사 교체 요청 대응(배치전환 우선)', '선임자 1:1 동행 근무(OJT)'];

function itemLevel(x) {   // 소항목별 「근무자 조치 기준」 문구에 따른 1차 조치 단계
  const d = x.S.d || '';
  if (/해당 없음|징계 대상 아님|보호조치가 우선|불이익 처우 금지|징계 보류/.test(d)) return 0;
  if (/즉시 근무배제|중대 비위|해고 포함/.test(d)) return 4;
  if (/^(1회 )?(교육|구두주의)/.test(d)) return 1;
  if (/배치 불가/.test(d)) return 0;
  const head = d.split(/[,.]/)[0];
  if (/서면경고/.test(d) || /3대 중대위반/.test(d) || /귀책 확인 후 조치/.test(d)) return 2;
  if (/^관리자 책임/.test(d)) return 1;
  if (/징계위원회/.test(head)) return 3;
  if (/구두주의|교육/.test(head)) return 1;
  return { S: 3, A: 2, B: 1 }[x.S.s] || 1;
}
function recommendLevel(p, repeat) {
  const base = Math.max(0, ...p.items.map(itemLevel));
  if (base === 0) return 0;
  const add = (REPEAT.find(r => r[0] === repeat) || REPEAT[0])[2];
  return Math.min(5, base + add);
}
function readWorker(p) {
  const g = id => (($('#' + id) || {}).value || '').trim();
  const repeat = g('w_repeat') || 'first';
  const rec = recommendLevel(p, repeat);
  const sel = g('w_level');
  return {
    name: g('w_name') || p.f.workers || '(대상 근무자)', role: g('w_role'), join: g('w_join'), shift: g('w_shift') || (p.site ? p.site.shift : ''),
    repeat, repeatLabel: (REPEAT.find(r => r[0] === repeat) || REPEAT[0])[1], rec, level: sel === '' ? rec : +sel,
    plea: g('w_plea'), memo: g('w_memo'), date: g('w_date'),
    extras: [...document.querySelectorAll('#wExtras input:checked')].map(i => i.value)
  };
}
function renderWorkerForm() {
  const p = state.plan; if (!p) return;
  const box = $('#workerBox');
  if (!p.items.some(x => x.S.wd)) { box.innerHTML = ''; box.dataset.for = ''; return; } const prev = box.dataset.for === p.docNo;
  if (!prev) {
    box.dataset.for = p.docNo;
    const t = kstNow(), d3 = addDays(p.d0, 3);
    box.innerHTML = `<div class="wk-h"><b>⑤ 근무자 조치 문서</b><span class="wk-badge">내부 · 대외비</span></div>
      <p class="ed-tip">사안을 초래한 <b>당사 근무자</b>에 대한 인사조치 계획서입니다. 정당한 이유·공정한 절차·서면 통지를 갖추도록 법률 검토 문서와 별도로 Word · PPT · PDF가 만들어집니다.</p>
      <div class="grid">
        <label class="f"><span>대상 근무자 성명</span><input type="text" id="w_name" placeholder="예: 홍길동" value=""></label>
        <label class="f"><span>직책 · 직무</span><input type="text" id="w_role" placeholder="예: 야간 경비원"></label>
        <label class="f"><span>입사일</span><input type="text" id="w_join" placeholder="예: 2024.03.01"></label>
        <label class="f"><span>근무형태</span><input type="text" id="w_shift" value="${esc(p.site ? p.site.shift : '')}"></label>
        <label class="f"><span>위반 이력</span><select id="w_repeat">${REPEAT.map(r => `<option value="${r[0]}">${r[1]}</option>`).join('')}</select></label>
        <label class="f"><span>조치 수준 (<em id="wRec"></em>)</span><select id="w_level"><option value="">자동 권고 따르기</option>${DLV.map(l => `<option value="${l.k}">${l.n} — ${l.s}</option>`).join('')}</select></label>
        <label class="f"><span>조치 시행 예정일</span><input type="date" id="w_date" value="${d3.getFullYear()}-${pad(d3.getMonth() + 1)}-${pad(d3.getDate())}"></label>
        <div class="f"><span>추가 조치</span><div id="wExtras" class="wk-chk">${EXTRA.map((e, i) => `<label><input type="checkbox" value="${esc(e)}" ${i < 2 ? 'checked' : ''}> ${esc(e)}</label>`).join('')}</div></div>
        <label class="f full"><span>근무자 소명 요지 (면담 후 기재)</span><textarea id="w_plea" rows="2" placeholder="예: 화장실 이용 후 복귀가 늦었다고 진술, 재발 방지 약속"></textarea></label>
        <label class="f full"><span>조치 사유 · 특이사항 (선택)</span><textarea id="w_memo" rows="2" placeholder="예: 평소 근무태도 양호, 근속 2년 — 정상 참작"></textarea></label>
      </div>
      <div class="wk-btns"><button class="btn" id="wDocx" style="background:#2b579a;box-shadow:0 3px 0 #173361">📄 Word</button><button class="btn" id="wPptx" style="background:#C43E1C;box-shadow:0 3px 0 #7d2712">📊 PPT</button><button class="btn" id="wPdf" style="background:#B71C1C;box-shadow:0 3px 0 #6d1010">📕 PDF</button><button class="btn" id="wAll" style="background:linear-gradient(100deg,#5b6475,#18224f)">⬇ 근무자 조치 3종</button></div>`;
    if (p.f.workers && !/명$/.test(p.f.workers)) $('#w_name').value = p.f.workers;
    ['w_repeat', 'w_level'].forEach(id => $('#' + id).onchange = updRec);
    $('#wDocx').onclick = () => runWorker('docx'); $('#wPptx').onclick = () => runWorker('pptx'); $('#wPdf').onclick = () => runWorker('pdf'); $('#wAll').onclick = () => runWorker('all');
  }
  updRec();
}
function updRec() {
  const p = state.plan; if (!p) return;
  const w = readWorker(p), L = DLV[w.rec];
  $('#wRec').innerHTML = `권고: <b style="color:#${L.c}">${L.n}</b>`;
}
async function runWorker(kind) {
  const p = syncEditor(); if (!p) return toast('먼저 [법률 검토 생성]을 누르세요.');
  const w = readWorker(p);
  const base = fileBase(p).replace(/_법률대응방안\(.*\)$/, '') + '_근무자조치계획서';
  try {
    if (kind === 'docx' || kind === 'all') { busy(true, '근무자 조치 Word 생성 중…'); await download(await makeWorkerDocx(p, w), base + '.docx'); }
    if (kind === 'pptx' || kind === 'all') { busy(true, '근무자 조치 PPT 생성 중…'); await download(await makePptx(p, buildWorkerSlides(p, w), '근무자 조치 계획서'), base + '.pptx'); }
    if (kind === 'pdf' || kind === 'all') { await download(await makePdf(p, (i, n) => busy(true, `근무자 조치 PDF 변환 중… ${i}/${n}`), buildWorkerSlides(p, w), '근무자 조치 계획서'), base + '.pdf'); }
    toast('근무자 조치 문서 출력 완료');
  } catch (e) { console.error(e); toast('생성 오류: ' + e.message, 5000); }
  finally { busy(false); }
}
function workerProc(p, w) {
  const d = n => fmtD(addDays(p.d0, n));
  const heavy = w.level >= 3;
  return [
    { d: 'D+0', date: d(0), t: '사실 확인 · 경위서 징구', a: 'CCTV·근무일지 등 객관 자료 보존, 근무자 경위서(붙임 1) 징구' },
    { d: 'D+1', date: d(1), t: '면담 · 소명 기회 부여', a: '위반 사실 고지, 본인 소명 청취·기록(진술 강요 금지)' },
    { d: 'D+3', date: d(3), t: heavy ? '징계위원회 개최' : '조치 결정', a: heavy ? '취업규칙에 따른 징계위원회 소집·출석 통지, 의결' : `${DLV[w.level].n} 결정 · 지사장 결재` },
    { d: 'D+5', date: d(5), t: '결과 서면 통지', a: w.level >= 5 ? '해고 사유·시기 서면 통지(근기법 제27조), 해고예고 검토' : '조치 내용 서면 통지 · 확인서(붙임 2) 서명' },
    { d: 'D+7', date: d(7), t: '재교육 · 고객사 보고', a: '재교육·특별 직무지시 이행, 고객사에는 조치 완료 사실만 보고(개인정보 최소화)' },
    { d: 'D+30', date: d(30), t: '사후관리', a: '불시점검·근무태도 모니터링, 재위반 시 가중 조치' }
  ];
}
const W_LAWS = ['LSA23', 'LSA27', 'LSA93', 'LSA95', 'LSA26'];

/* ---------- Word ---------- */
async function makeWorkerDocx(p, w) {
  const f = p.f, L = DLV[w.level], R0 = DLV[w.rec], ch = [], st = p.site;
  ch.push(P([R('내부 문서 · 대외비', { size: 18, bold: true, color: C.brick })], { align: docx.AlignmentType.RIGHT, after: 40 }));
  ch.push(P([R('근무자 조치 계획서', { size: 40, bold: true, color: K.ink })], { align: docx.AlignmentType.CENTER, before: 120, after: 60 }));
  ch.push(P([R(`${f.client}${st ? ' (' + st.br + '지사)' : ''}  |  대상: ${w.name}${w.role ? ' · ' + w.role : ''}`, { size: 21, color: C.gray })], { align: docx.AlignmentType.CENTER, after: 80 }));
  ch.push(P([R(`관련 문서 ${p.docNo}   ·   작성일 ${fmtD(kstNow())}   ·   작성 ${f.dept}${f.author ? ' ' + f.author : ''}`, { size: 17, color: C.gray })],
    { align: docx.AlignmentType.CENTER, after: 200, border: { bottom: { style: docx.BorderStyle.DOUBLE, size: 6, color: K.ink, space: 6 } } }));
  ch.push(boxPara([P([R('□ 주요 보고내용', { size: 22, bold: true, color: C.brick })], { after: 80 })].concat([
    `대상: ${w.name}${w.role ? ' (' + w.role + ')' : ''} — ${f.client}${st ? ' · ' + st.br + '지사' : ''}`,
    `위반: ${p.names.join(' · ')} (${w.repeatLabel})`,
    `권고 조치: ${R0.n}(${R0.s})${w.level !== w.rec ? `  →  결정(안): ${L.n}(${L.s})` : ''}`,
    `절차: 경위서 징구(D+0) → 소명(D+1) → ${w.level >= 3 ? '징계위원회' : '조치 결정'}(D+3) → 서면 통지(D+5) → 사후관리(D+30)`
  ].map(l => P([R('· ', { bold: true, color: C.brick }), R(l, { size: 20 })], { indent: { left: 240, hanging: 200 }, after: 30 }))), 'FDF4F2', 'E7A99D'));
  // Ⅰ
  ch.push(H1('Ⅰ. 대상 근무자 및 발생 개요'));
  const kv = [['성명', w.name, '직책 · 직무', w.role || '-'], ['소속 사업장', `${f.client}${st ? ' (' + st.br + '지사)' : ''}`, '근무형태', w.shift || '-'], ['입사일', w.join || '-', '위반 이력', w.repeatLabel],
    ['발생 일시', f.occur || '-', '사안 접수', `${fmtD(p.d0)} · ${f.raiser || f.channel || '-'}`]];
  ch.push(table(kv.map(r => [td(r[0], 1500, { fill: C.silverL, bold: true, align: docx.AlignmentType.CENTER }), td(r[1], 3319), td(r[2], 1500, { fill: C.silverL, bold: true, align: docx.AlignmentType.CENTER }), td(r[3], 3319)]), [1500, 3319, 1500, 3319]));
  // Ⅱ
  ch.push(H1('Ⅱ. 위반 사실 및 근거'));
  const vw = [2300, 1300, 4438, 1600];
  ch.push(table([[th('위반 항목', vw[0]), th('심각도', vw[1]), th('근거(취업규칙·법령·계약)', vw[2]), th('3대 중대위반', vw[3])]].concat(p.items.map(x => {
    const laws = x.S.l.map(id => LAWS[id]).filter(Boolean).map(l => `${l.law} ${l.art}`).join(', ');
    const major = /3대 중대위반/.test(x.S.d);
    return [td(`${x.S.c} ${x.S.n}`, vw[0], { bold: true }), td(SEV[x.S.s].label, vw[1], { align: docx.AlignmentType.CENTER, bold: true, color: SEV[x.S.s].color }), td('취업규칙 복무규정 · ' + laws, vw[2], { size: 17 }), td(major ? '해당' : '-', vw[3], { align: docx.AlignmentType.CENTER, bold: major, color: major ? C.brick : C.gray })];
  })), vw, { header: true }));
  ch.push(H2('사실관계'));
  ch.push(...bullets(parseGrp(p.facts)));
  ch.push(H2('근무자 소명 요지'));
  ch.push(...bullets([{ title: '', lines: lines(w.plea).length ? lines(w.plea) : ['(면담 후 기재) 근무자 진술 요지와 확인 자료'] }]));
  // Ⅲ
  ch.push(H1('Ⅲ. 징계 양정 검토'));
  const lw = [1500, 2000, 6138];
  ch.push(table([[th('단계', lw[0]), th('조치', lw[1]), th('적용 기준', lw[2])]].concat(DLV.map(l => {
    const mark = l.k === w.level ? '  ◀ 결정(안)' : (l.k === w.rec ? '  ◀ 권고' : '');
    const fill = l.k === w.level ? 'FDF1EF' : (l.k === w.rec ? 'FFF8E6' : undefined);
    return [td(String(l.k), lw[0], { align: docx.AlignmentType.CENTER, bold: true, fill }), td(l.n + mark, lw[1], { bold: true, color: l.c, fill }), td(`${l.s} — ${l.d}`, lw[2], { size: 18, fill })];
  })), lw, { header: true }));
  ch.push(H2('항목별 조치 기준'));
  ch.push(...bullets(p.items.map(x => ({ title: `${x.S.c} ${x.S.n}`, lines: [x.S.d] }))));
  ch.push(H2('양정 고려사항'));
  ch.push(...bullets([{ title: '', lines: ['고의·과실 여부와 위반의 중대성(고객사 피해·사고 연계 여부)', `반복성 — ${w.repeatLabel}`, '근속기간·평소 근무태도·포상 이력', '반성 정도와 재발방지 의지(소명 내용)', '동일 사안 타 근무자와의 형평성'].concat(lines(w.memo)) }]));
  // Ⅳ
  ch.push(H1('Ⅳ. 조치 결정(안)'));
  ch.push(boxPara([P([R('결정(안): ', { bold: true, size: 22, color: K.ink }), R(`${L.n} (${L.s})`, { bold: true, size: 22, color: L.c })], { after: 40 }),
    P([R(L.d, { size: 19 })], { after: 40 }),
    P([R(`시행 예정일: ${w.date ? fmtD(parseD(w.date)) : '-'}`, { size: 19 })], { after: 0 })], 'F7F8FB', '9AA3B5'));
  ch.push(H2('추가 조치'));
  ch.push(...bullets([{ title: '', lines: w.extras.length ? w.extras : ['(없음)'] }]));
  ch.push(H2('결재'));
  const aw = [2409, 2410, 2410, 2409];
  ch.push(table([['담당', '지사장', '본부장', '대표이사'].map((t, i) => th(t, aw[i])), aw.map(x => cell([P([R(' ')], { after: 0 }), P([R(' ')], { after: 0 }), P([R(' ')], { after: 0 })], { w: x }))], aw));
  // Ⅴ
  ch.push(H1('Ⅴ. 진행 절차 및 법적 유의사항'));
  const tw = [1100, 1900, 2400, 4238];
  ch.push(table([[th('단계', tw[0]), th('일자', tw[1]), th('구분', tw[2]), th('주요 내용', tw[3])]].concat(workerProc(p, w).map((t, i) => [td(t.d, tw[0], { bold: true, align: docx.AlignmentType.CENTER, color: C.white, fill: i === 0 ? 'C8553D' : (i === 5 ? '1F3A73' : '2B4C9B') }), td(t.date, tw[1], { align: docx.AlignmentType.CENTER }), td(t.t, tw[2], { bold: true }), td(t.a, tw[3])])), tw, { header: true }));
  ch.push(H2('유의사항'));
  ch.push(...bullets([{ title: '', lines: [
    '징계는 취업규칙 근거 + 사실 확인(경위서·증빙) + 소명 기회 부여 + 서면 통지의 절차를 반드시 거칩니다.',
    '고객사의 교체 요구만으로는 해고할 수 없습니다 — 배치전환은 업무상 필요성과 생활상 불이익을 비교하고 근로자와 협의합니다.',
    '감급은 1회 1일 평균임금의 1/2, 총액은 1임금지급기 임금의 1/10을 넘을 수 없습니다(근기법 제95조).',
    '산재 신청·노동청 진정 등을 이유로 한 불이익 처우는 금지됩니다.',
    '고객사에는 조치 완료 사실만 알리고, 징계 세부 내용 등 개인정보는 최소한으로 제공합니다.'
  ] }]));
  const ll = W_LAWS.map(id => LAWS[id]);
  const lw2 = [1900, 2000, 5738];
  ch.push(table([[th('법령', lw2[0]), th('조항', lw2[1]), th('주요 내용', lw2[2])]].concat(ll.map(x => [td(x.law, lw2[0], { bold: true, color: C.navy }), td(`${x.art}\n${x.title}`, lw2[1], { size: 17, align: docx.AlignmentType.CENTER }), td(x.sum, lw2[2], { size: 18 })])), lw2, { header: true }));
  // Ⅵ
  ch.push(H1('Ⅵ. 재발방지 교육 · 사후관리'));
  ch.push(...bullets([{ title: '', lines: uniq(p.items.flatMap(x => x.S.sh.slice(0, 1).concat(x.S.p.slice(0, 1)))).concat(['D+30까지 불시점검으로 이행 여부 확인, 재위반 시 한 단계 가중 조치']) }]));
  { const v = VIDEO_OF[jobKey(p)]; ch.push(...imgPara(ASSET.poster[v], 3.4, `▶ 재교육 영상: ${VIDEO_TITLE[v]} (근무자 조치 PPT에서 재생)`, [16, 9])); }
  // 붙임 1 경위서
  const blank = n => Array.from({ length: n }, () => P([R(' ')], { after: 0, line: 360 }));
  ch.push(new docx.Paragraph({ children: [new docx.PageBreak()] }));
  ch.push(P([R('붙임 1', { size: 18, bold: true, color: C.gray })], { after: 40 }));
  ch.push(P([R('경 위 서', { size: 36, bold: true, color: K.ink })], { align: docx.AlignmentType.CENTER, after: 200 }));
  const fw = [1800, 7838];
  ch.push(table([['성명', w.name], ['소속 · 직책', `${f.client} · ${w.role || ''}`], ['발생 일시 · 장소', `${f.occur || ''} · ${f.site || ''}`], ['관련 사항', p.names.join(', ')]].map(r => [td(r[0], fw[0], { fill: C.silverL, bold: true, align: docx.AlignmentType.CENTER }), td(r[1], fw[1])]).concat([
    [td('경위\n(시간 순서대로)', fw[0], { fill: C.silverL, bold: true, align: docx.AlignmentType.CENTER }), cell(blank(9), { w: fw[1] })],
    [td('본인 의견\n(재발방지 다짐)', fw[0], { fill: C.silverL, bold: true, align: docx.AlignmentType.CENTER }), cell(blank(5), { w: fw[1] })]]), fw));
  ch.push(P([R('위 내용은 사실과 다름없음을 확인합니다.', { size: 20 })], { align: docx.AlignmentType.CENTER, before: 240, after: 120 }));
  ch.push(P([R('20      년      월      일          작성자 :                          (서명)', { size: 20 })], { align: docx.AlignmentType.RIGHT, after: 120 }));
  ch.push(P([R(`${f.dept} 귀하`, { size: 20, bold: true })], { align: docx.AlignmentType.LEFT }));
  // 붙임 2 확인서
  ch.push(new docx.Paragraph({ children: [new docx.PageBreak()] }));
  ch.push(P([R('붙임 2', { size: 18, bold: true, color: C.gray })], { after: 40 }));
  ch.push(P([R('확인서 (재발방지 서약)', { size: 34, bold: true, color: K.ink })], { align: docx.AlignmentType.CENTER, after: 220 }));
  ch.push(...[
    `본인은 ${fmtD(p.d0)} 고객사 「${f.client}」에서 제기된 「${p.names.join('」, 「')}」 사항과 관련하여, 회사가 확인한 사실관계를 확인하였습니다.`,
    `본인은 이에 대한 회사의 조치 「${L.n}」${w.date ? `(${fmtD(parseD(w.date))} 시행)` : ''}의 내용을 통지받았으며, 소명의 기회를 부여받았음을 확인합니다.`,
    '본인은 앞으로 근무지침과 회사·고객사의 정당한 업무 지시를 성실히 이행하며, 근무지 무단 이탈, 근무시간 미준수, 정당한 지시 불이행 등 위반 행위를 하지 않을 것을 서약합니다.',
    '같은 위반이 다시 발생하는 경우 취업규칙에 따라 가중된 조치를 받을 수 있음을 확인합니다.'
  ].map((t, i) => P([R(`${i + 1}. `, { bold: true }), R(t, { size: 20 })], { indent: { left: 300, hanging: 300 }, after: 120, line: 340 })));
  ch.push(P([R('20      년      월      일', { size: 20 })], { align: docx.AlignmentType.CENTER, before: 300, after: 200 }));
  ch.push(P([R(`소속 : ${f.client}          성명 : ${w.name}                    (서명)`, { size: 20 })], { align: docx.AlignmentType.RIGHT, after: 160 }));
  ch.push(P([R(`${f.dept} 귀하`, { size: 20, bold: true })]));
  ch.push(P([R(`※ 본 문서는 인사 관련 내부 문서로 외부 유출을 금합니다(개인정보 보호법).  |  ${APP.name} ${APP.version}`, { size: 15, color: '8A93A3' })], { align: docx.AlignmentType.CENTER, before: 300 }));
  return await packDocx(ch, '근무자 조치 계획서');
}

/* ---------- PPT · PDF 슬라이드 ---------- */
function buildWorkerSlides(p, w) {
  const f = p.f, L = DLV[w.level], R0 = DLV[w.rec], st = p.site, S = [];
  const foot = `${APP.org} · 근무자 조치 계획서 · 내부 문서(대외비)`;
  let no = 1;
  S.push(coverSlide({ eyebrow: `${APP.org}  ·  내부 문서 · 대외비`, title: '근무자 조치 계획서', fig: figName('cute', jobKey(p)),
    lines: [`${w.name}${w.role ? ' · ' + w.role : ''}  |  ${f.client}${st ? ' (' + st.br + '지사)' : ''}`, p.names.join(' / ')],
    meta: `${fmtD(kstNow())}   |   ${f.dept}${f.author ? ' ' + f.author : ''}   |   관련 ${p.docNo}`, badge: `결정(안) ${L.n}`, badgeColor: L.c })); no++;

  /* 01 대상·개요 */
  const a = frame('01  대상 근무자 및 발생 개요', '사실관계와 위반 이력', no, p, foot);
  const kv = [['성명', w.name], ['직책 · 직무', w.role || '-'], ['소속 사업장', `${f.client}${st ? ' (' + st.br + '지사)' : ''}`], ['근무형태', w.shift || '-'], ['입사일', w.join || '-'], ['위반 이력', w.repeatLabel], ['발생 일시', f.occur || '-'], ['사안 접수', `${fmtD(p.d0)} · ${f.raiser || f.channel || '-'}`]];
  kv.forEach((r, i) => { const y = 1.7 + i * 0.58; a.push(Rc(0.6, y, 1.75, 0.5, K.tint)); a.push(T(0.6, y, 1.75, 0.5, r[0], { pt: 12, bold: true, color: K.navy, align: 'center', valign: 'middle' })); a.push(Rc(2.35, y, 4.35, 0.5, C.white, { line: K.line })); a.push(T(2.5, y, 4.1, 0.5, r[1], { max: 12.5, min: 9, valign: 'middle' })); });
  a.push(Rc(7.0, 1.7, 5.75, 4.6, 'FAFBFC', { line: K.line })); a.push(Rc(7.0, 1.7, 5.75, 0.06, K.red));
  a.push(T(7.25, 1.85, 5.3, 0.4, [{ text: '사실관계', bold: true }], { pt: 14, color: K.red }));
  a.push(T(7.25, 2.3, 5.3, 2.3, listParas(parseGrp(p.facts)), { max: 13, min: 9 }));
  a.push(T(7.25, 4.65, 5.3, 0.35, [{ text: '근무자 소명 요지', bold: true }], { pt: 13, color: K.navy }));
  a.push(T(7.25, 5.0, 5.3, 1.2, (lines(w.plea).length ? lines(w.plea) : ['(면담 후 기재)']).map(t => ({ text: '•  ' + t })), { max: 12, min: 9, color: lines(w.plea).length ? K.ink : '8A93A3' }));
  S.push(a); no++;

  /* 02 위반 사실 */
  const b = frame('02  위반 사실 및 근거', '취업규칙 복무규정 · 관계 법령 · 용역계약', no, p, foot);
  const n = p.items.length, ch = Math.min(1.5, 4.6 / n);
  p.items.forEach((x, i) => {
    const y = 1.7 + i * ch, major = /3대 중대위반/.test(x.S.d), lv = DLV[itemLevel(x)];
    b.push(Rc(0.6, y, 12.15, ch - 0.12, C.white, { line: K.line })); b.push(Rc(0.6, y, 0.07, ch - 0.12, SEV[x.S.s].color));
    b.push(T(0.85, y + 0.08, 6.2, 0.42, [{ text: `${x.S.c}  ${x.S.n}`, bold: true }], { max: 15, min: 10, color: K.ink }));
    b.push(T(0.85, y + 0.48, 7.6, ch - 0.65, [{ text: '근거: 취업규칙 복무규정 · ' + x.S.l.map(id => LAWS[id]).filter(Boolean).map(l => `${l.law} ${l.art}`).join(', '), color: K.mute }, { text: x.S.d, size: 0.95 }], { max: 11.5, min: 8, gap: 2 }));
    b.push(Rc(8.75, y + 0.15, 1.15, 0.38, SEV[x.S.s].color, { k: 'para' })); b.push(T(8.75, y + 0.15, 1.15, 0.38, SEV[x.S.s].label, { pt: 11, bold: true, color: C.white, align: 'center', valign: 'middle' }));
    if (major) { b.push(Rc(10.0, y + 0.15, 1.45, 0.38, 'FDF1EF', { line: 'F2B8AE' })); b.push(T(10.0, y + 0.15, 1.45, 0.38, '3대 중대위반', { pt: 10.5, bold: true, color: C.brick, align: 'center', valign: 'middle' })); }
    b.push(T(8.75, y + 0.6, 3.85, 0.4, `항목 기준: ${lv.n}`, { pt: 11.5, bold: true, color: lv.c }));
  });
  S.push(b); no++;

  /* 03 양정 */
  const c = frame('03  징계 양정 검토', `권고 ${R0.n} · 결정(안) ${L.n} — ${w.repeatLabel}`, no, p, foot);
  DLV.forEach((l, i) => {
    const x = 0.6 + i * 2.05, h = 0.9 + i * 0.42, y = 5.0 - h, on = l.k === w.level, rec = l.k === w.rec;
    c.push(Rc(x, y, 1.9, h, on ? l.c : (rec ? 'FFF3D6' : 'F1F3F7'), { line: on ? l.c : (rec ? 'E8C77A' : K.line) }));
    c.push(T(x + 0.1, y + 0.08, 1.7, 0.42, [{ text: l.n, bold: true }], { pt: 14, color: on ? C.white : l.c, align: 'center' }));
    c.push(T(x + 0.1, y + 0.48, 1.7, Math.max(0.35, h - 0.55), l.s, { max: 10.5, min: 8, color: on ? 'FFFFFF' : K.mute, align: 'center' }));
    if (on || rec) c.push(T(x, 5.05, 1.9, 0.35, on ? '▲ 결정(안)' : '▲ 권고', { pt: 11, bold: true, color: on ? l.c : 'B07A00', align: 'center' }));
  });
  c.push(Rc(0.6, 5.5, 12.15, 0.95, K.tint, { line: K.line }));
  c.push(T(0.85, 5.55, 11.7, 0.85, [{ text: `${L.n} — ${L.d}`, bold: true, color: K.ink }, { text: '고려: 고의·과실 · 반복성 · 피해 정도 · 근속·평소 태도 · 반성 · 형평성' + (lines(w.memo).length ? '  |  ' + lines(w.memo).join(' / ') : ''), size: 0.85, color: K.mute }], { max: 13, min: 9, gap: 3 }));
  S.push(c); no++;

  /* 04 조치 결정 */
  const d = frame('04  조치 결정(안)', `시행 예정일 ${w.date ? fmtD(parseD(w.date)) : '-'}`, no, p, foot);
  d.push(Rc(0.6, 1.7, 5.4, 4.7, C.white, { line: K.line })); d.push(Rc(0.6, 1.7, 5.4, 0.08, L.c));
  d.push(T(0.9, 1.95, 4.8, 0.4, '결정(안)', { pt: 13, color: K.mute, bold: true }));
  d.push(T(0.9, 2.35, 4.8, 0.9, [{ text: L.n, bold: true }], { pt: 40, color: L.c }));
  d.push(T(0.9, 3.25, 4.8, 0.4, L.s, { pt: 14, color: K.ink, bold: true }));
  d.push(T(0.9, 3.75, 4.8, 2.4, L.d, { max: 13, min: 9, color: '3A4366', lh: 1.35 }));
  d.push(Rc(6.3, 1.7, 6.45, 4.7, 'FAFBFC', { line: K.line })); d.push(Rc(6.3, 1.7, 6.45, 0.06, K.blu));
  d.push(T(6.55, 1.85, 6, 0.4, [{ text: '추가 조치', bold: true }], { pt: 14, color: K.blu }));
  d.push(T(6.55, 2.3, 6, 2.4, (w.extras.length ? w.extras : ['(없음)']).map(t => ({ text: '✓  ' + t })), { max: 13.5, min: 9.5, gap: 5 }));
  d.push(T(6.55, 4.8, 6, 0.35, [{ text: '결재', bold: true }], { pt: 12, color: K.mute }));
  ['담당', '지사장', '본부장', '대표이사'].forEach((t, i) => { d.push(Rc(6.55 + i * 1.5, 5.15, 1.4, 1.05, C.white, { line: 'C9CED6' })); d.push(T(6.55 + i * 1.5, 5.18, 1.4, 0.3, t, { pt: 10, color: K.mute, align: 'center' })); });
  S.push(d); no++;

  /* 05 절차 */
  const e = frame('05  진행 절차', `사안 접수일 ${fmtD(p.d0)} 기준`, no, p, foot);
  const pr = workerProc(p, w), cols = [K.red, K.blu, K.blu, K.blu, K.grn, K.blu2];
  e.push(Rc(0.8, 2.48, 11.8, 0.03, K.line));
  pr.forEach((t, i) => {
    const x = 0.6 + i * 2.04;
    e.push(Rc(x, 1.75, 1.95, 0.65, cols[i], { k: 'chevron' }));
    e.push(T(x + 0.2, 1.75, 1.55, 0.65, [{ text: t.d, bold: true }], { pt: 15, color: C.white, align: 'center', valign: 'middle' }));
    e.push(Rc(x + 0.86, 2.38, 0.22, 0.22, cols[i], { k: 'ellipse' }));
    e.push(T(x, 2.68, 1.95, 0.32, t.date, { pt: 10.5, bold: true, color: K.ink, align: 'center' }));
    e.push(Rc(x + 0.03, 3.05, 1.89, 2.0, 'FAFBFC', { line: K.line }));
    e.push(T(x + 0.13, 3.12, 1.7, 1.86, [{ text: t.t, bold: true, color: cols[i] }, { text: t.a, size: 0.86 }], { max: 12, min: 8, gap: 3 }));
  });
  e.push(Rc(0.6, 5.3, 12.15, 1.1, 'FDF4F2', { line: 'F2C9C0' }));
  e.push(T(0.85, 5.35, 11.7, 1.0, [{ text: '징계 정당성 3요건 — 사유(취업규칙 근거) · 절차(경위서·소명·징계위원회·서면통지) · 양정(비례성·형평성)', bold: true, color: C.brick }, { text: '고객사 교체 요구만으로 해고 불가 · 감급 한도(근기법 제95조) · 해고 시 서면통지(제27조)·해고예고(제26조)', size: 0.88, color: '3A4366' }], { max: 13, min: 9, gap: 3 }));
  S.push(e); no++;

  /* 06 법적 근거 · 재발방지 */
  const g = frame('06  법적 근거 · 재발방지', '적용 전 국가법령정보센터 원문 확인', no, p, foot);
  W_LAWS.forEach((id, i) => {
    const x = LAWS[id], y = 1.7 + i * 0.86;
    g.push(Rc(0.6, y, 6.6, 0.78, i % 2 ? 'FAFBFC' : C.white, { line: K.line })); g.push(Rc(0.6, y, 0.06, 0.78, K.navy));
    g.push(T(0.8, y + 0.05, 1.9, 0.68, [{ text: `${x.law}`, bold: true, color: K.navy }, { text: x.art, size: 0.9, color: K.mute }], { max: 12, min: 8.5, gap: 1, valign: 'middle' }));
    g.push(T(2.75, y + 0.05, 4.35, 0.68, x.sum, { max: 10.5, min: 7.5, valign: 'middle' }));
  });
  g.push(Rc(7.5, 1.7, 5.25, 4.25, K.tintG, { line: 'CFE6D7' }));
  g.push(T(7.75, 1.85, 4.8, 0.4, [{ text: '재발방지 교육 · 사후관리', bold: true }], { pt: 14, color: C.greenD }));
  g.push(T(7.75, 2.3, 4.8, 3.55, uniq(p.items.flatMap(x => x.S.sh.slice(0, 1).concat(x.S.p.slice(0, 1)))).concat(['D+30 불시점검 · 재위반 시 가중 조치']).slice(0, 7).map(t => ({ text: '•  ' + t })), { max: 12.5, min: 8.5 }));
  S.push(g); no++;

  S.push(closingSlide({ fig: 'team_dio', tag: '공정한 절차와 명확한 기준으로 — 같은 일이 반복되지 않는 현장을 만듭니다.', org: `${APP.org}  ·  ${f.dept}  ·  내부 문서` }));
  return S;
}
