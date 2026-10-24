import {
  HAB_C, HAB_P, PARENT_LABELS, THEMES, REWARDS, MISSIONS, LENGTH, RECOVERIES,
  load, save, clearAll, newState, isoLocal, now, dayNum, dateOfDay, fmtDate,
  rec, personDone, personStatus, editable, summary, pilotText, icsReminder,
} from './store.js';
import { drawReport } from './report.js';

const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mobile = matchMedia('(max-width: 700px), (pointer: coarse)').matches;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

let app = load();
let tab = 'today';
let ob = null;              // onboarding draft
let selDay = null;          // calendar selection
let confirmReset = false;
let todOverride = null;     // 테스트용 시간대 고정
let house = null, houseFailed = false;

/* ---------------- helpers ---------------- */
function persist() { if (!save(app)) toast('이 기기에 저장하지 못했어요. 브라우저의 저장 공간 설정을 확인해 주세요.'); }
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2600); }
function tod() { if (todOverride) return todOverride; return now(app).getHours() < 17 ? 'morning' : 'evening'; }
function names(a = app) { return { c: a.family.child, p: a.family.parent }; }
function habitLabel(a, who) { return a.habits[who].label; }
function propText(a, who) { return (who === 'c' ? HAB_C : HAB_P)[a.habits[who].type].prop; }
function download(name, blob) {
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('복사했어요. 카톡방에 붙여 넣어 주세요.'); }
  catch { const ta = $('#copyFallback'); ta.hidden = false; ta.value = text; ta.select(); toast('자동 복사가 안 돼서 아래 글상자를 길게 눌러 복사해 주세요.'); }
}

/* ---------------- 3D stage ---------------- */
function webglOK() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }
async function ensureHouse() {
  if (house || houseFailed) return;
  if (!webglOK()) { houseFailed = true; return; }
  try {
    const mod = await import('./house3d.js');
    house = mod.createHouse($('#c3d'), $('#stage'), { mobile, reduced });
    $('#stage').classList.remove('fb');
    paintStage();
  } catch (e) { console.warn('3D 로딩 실패, 그림으로 대체합니다', e); houseFailed = true; paintStage(); }
}
function stageState() {
  if (!ob) return { a: app, m: summary(app) };
  // 온보딩 미리보기: 첫날 모습
  const a = draftState(); return { a, m: summary(a) };
}
function paintStage() {
  const st = $('#stage'); if (st.hidden) return;
  const { a, m } = stageState();
  if (house) house.update(a, m, tod());
  else { st.classList.add('fb'); $('#fallback').innerHTML = fallbackSVG(a, m, tod()); }
}
function fallbackSVG(a, m, t) {
  const eve = t === 'evening';
  const warm = eve ? `hsl(38, ${40 + 50 * m.warmth}%, ${45 + 25 * m.warmth}%)` : '#d6eaf3';
  let books = ''; for (let i = 0; i < m.books; i++) books += `<rect x="${193 + (i % 8) * 9}" y="${156 + Math.floor(i / 8) * 18}" width="7" height="14" fill="${['#e5604f', '#3f8fd9', '#f2b544', '#7a5bd1', '#2c9c8c'][i % 5]}"/>`;
  let phones = ''; for (let i = 0; i < m.phones; i++) phones += `<rect x="${312 + i * 22}" y="270" width="12" height="9" rx="2" fill="#2b3550"/>`;
  let fruits = ''; const pts = [[-20, -30], [15, -38], [-30, -10], [28, -15], [0, -50], [-8, -15], [35, -35], [-38, -28], [10, -8], [22, -50]];
  for (let i = 0; i < m.fruits; i++) fruits += `<circle cx="${pts[i][0] * m.tree}" cy="${-80 - 20 * m.tree + pts[i][1] * m.tree * .6}" r="5" fill="#e8754f"/>`;
  return `<svg viewBox="0 0 640 380" preserveAspectRatio="xMidYMid slice" role="img" aria-label="우리 집 그림">
    <rect width="640" height="380" fill="${eve ? '#3a4466' : '#cfe3ec'}"/><ellipse cx="320" cy="350" rx="380" ry="70" fill="#9cc58a"/>
    <rect x="110" y="120" width="340" height="200" fill="#efe6d6" stroke="#8b7a64" stroke-width="3"/>
    <path d="M95 122 280 40 465 122Z" fill="${a.home.type === 'apt' ? '#9aa0a6' : '#b8665a'}"/>
    <rect x="112" y="122" width="166" height="96" fill="${a.home.theme}" opacity=".45"/>
    <line x1="280" y1="120" x2="280" y2="320" stroke="#8b7a64" stroke-width="3"/><line x1="110" y1="220" x2="450" y2="220" stroke="#8b7a64" stroke-width="3"/>
    <rect x="190" y="150" width="76" height="60" fill="none" stroke="#8b6a4a" stroke-width="2"/>${books}
    <rect x="130" y="150" width="40" height="34" fill="${warm}"/><rect x="380" y="150" width="40" height="34" fill="${warm}"/>
    <rect x="300" y="280" width="90" height="10" fill="#a07a56"/>${phones}
    <rect x="112" y="122" width="166" height="96" fill="#fff" opacity="${m.hazeChild ? .4 : 0}"/>
    <g transform="translate(540 320)"><rect x="-7" y="-80" width="14" height="80" fill="#7a5639"/><circle cx="0" cy="${-80 - 20 * m.tree}" r="${18 + 40 * (m.tree - .3) / .75}" fill="#5f9e5a"/>${fruits}</g>
    ${m.flag ? '<g transform="translate(60 330)"><rect x="-2" y="-110" width="4" height="110" fill="#666"/><rect x="2" y="-110" width="70" height="38" fill="#d9962b"/><text x="37" y="-86" font-size="13" text-anchor="middle" fill="#fff" font-weight="700">30일 완주</text></g>' : ''}
  </svg>`;
}

/* ---------------- onboarding ---------------- */
function startOnboarding() {
  ob = { step: 0, parent: '엄마', parentCustom: '', child: '', habitC: { type: 'read', label: HAB_C.read.label }, habitP: { type: 'phone', label: HAB_P.phone.label },
    customC: false, customP: false, homeType: 'house', theme: THEMES[0][1], reward: REWARDS[0], rewardCustom: '', signedP: false, signedC: false, start: 'today' };
}
function draftState() {
  const d = ob; const t = new Date();
  return newState({ parent: d.parent === '직접' ? (d.parentCustom || '보호자') : d.parent, child: d.child || '아이', habitC: d.habitC, habitP: d.habitP,
    homeType: d.homeType, theme: d.theme, reward: d.reward, startDate: isoLocal(t) });
}
const OB_STEPS = ['시작', '가족', '습관 짝', '우리 집', '보상 약속'];
function viewOnboarding() {
  const d = ob, s = d.step;
  const dots = OB_STEPS.map((n, i) => `<span class="${i === s ? 'on' : i < s ? 'done' : ''}">${n}</span>`).join('');
  let body = '';
  if (s === 0) body = `
    <h1 class="display">아이 습관 하나, 부모 습관 하나.<br>30일 동안 우리 집이 달라져요.</h1>
    <p class="lead">부모와 아이가 각자 습관을 하나씩 걸고, 매일 서로 확인 도장을 찍어 줍니다. 기록이 쌓일수록 화면 속 우리 집이 정돈되고 가족 나무가 자라요.</p>
    <ul class="checks">
      <li>부모 휴대폰 한 대로 함께 씁니다.</li>
      <li>가입이 없고, 아이 정보는 닉네임만 받아요.</li>
      <li>모든 기록은 이 휴대폰 안에만 저장돼요.</li>
    </ul>
    <div class="stack">
      <button class="btn main big" data-act="ob-next">우리 가족 시작하기</button>
      <button class="btn line" data-act="demo">예시 가족으로 둘러보기</button>
    </div>`;
  if (s === 1) body = `
    <h2>누가 함께하나요?</h2>
    <div class="field"><span class="flabel">부모 호칭</span>
      <div class="chips">${[...PARENT_LABELS, '직접'].map(l => `<button class="chip" aria-pressed="${d.parent === l}" data-act="ob-parent" data-v="${l}">${l === '직접' ? '직접 쓰기' : l}</button>`).join('')}</div>
      ${d.parent === '직접' ? `<input class="input" id="obParentCustom" maxlength="6" placeholder="예: 이모, 삼촌" value="${esc(d.parentCustom)}" style="margin-top:8px">` : ''}
    </div>
    <div class="field"><label class="flabel" for="obChild">아이 닉네임</label>
      <input class="input" id="obChild" maxlength="8" placeholder="예: 콩이, 도토리" value="${esc(d.child)}" autocomplete="off">
      <small class="hint">실명 대신 집에서 부르는 별명을 적어 주세요. 이 이름은 이 휴대폰 밖으로 나가지 않아요.</small>
    </div>
    <div class="nav-row"><button class="btn line" data-act="ob-back">이전</button><button class="btn main" data-act="ob-next">다음</button></div>`;
  if (s === 2) {
    const list = (who, map, cur, custom) => Object.entries(map).map(([k, h]) =>
      `<button class="opt" aria-pressed="${!custom && cur.type === k}" data-act="ob-habit" data-who="${who}" data-v="${k}"><b>${h.label}</b><small>${h.prop}</small></button>`).join('') +
      `<button class="opt" aria-pressed="${custom}" data-act="ob-habit-custom" data-who="${who}"><b>직접 정하기</b><small>습관 이름을 쓰고, 집에서 바뀔 소품을 골라요</small></button>` +
      (custom ? `<div class="custom"><input class="input" id="obCustom${who}" maxlength="24" placeholder="${who === 'c' ? '예: 아침에 스스로 일어나기' : '예: 퇴근 후 20분 같이 놀기'}" value="${esc(cur.label)}">
        <select class="input" id="obCustomType${who}">${Object.entries(map).map(([k, h]) => `<option value="${k}" ${cur.type === k ? 'selected' : ''}>${h.prop}</option>`).join('')}</select></div>` : '');
    body = `
    <h2>습관을 짝으로 골라요</h2>
    <p class="lead small">아이의 습관을 방해하는 부모의 습관을 찾아 같이 바꾸면, 아이는 숙제가 아니라 우리 집 약속으로 받아들여요.</p>
    <div class="field"><span class="flabel"><i class="dot c"></i>${esc(d.child || '아이')}의 습관</span><div class="opts">${list('c', HAB_C, d.habitC, d.customC)}</div></div>
    <div class="field"><span class="flabel"><i class="dot p"></i>${esc(d.parent === '직접' ? d.parentCustom || '보호자' : d.parent)}의 습관</span><div class="opts">${list('p', HAB_P, d.habitP, d.customP)}</div></div>
    <div class="nav-row"><button class="btn line" data-act="ob-back">이전</button><button class="btn main" data-act="ob-next">다음</button></div>`;
  }
  if (s === 3) body = `
    <h2>우리 집 모습을 골라요</h2>
    <p class="lead small">위 그림이 바로 바뀌어요. 첫날은 조금 어수선하고, 가족 나무는 묘목이에요.</p>
    <div class="field"><span class="flabel">집 형태</span>
      <div class="seg"><button aria-pressed="${d.homeType === 'house'}" data-act="ob-home" data-v="house">단독주택</button><button aria-pressed="${d.homeType === 'apt'}" data-act="ob-home" data-v="apt">아파트</button></div></div>
    <div class="field"><span class="flabel">아이 방 색</span>
      <div class="swatches">${THEMES.map(([n, c]) => `<button class="swatch" style="background:${c}" aria-label="${n}" aria-pressed="${d.theme === c}" data-act="ob-theme" data-v="${c}"></button>`).join('')}</div></div>
    <div class="nav-row"><button class="btn line" data-act="ob-back">이전</button><button class="btn main" data-act="ob-next">다음</button></div>`;
  if (s === 4) {
    const pn = d.parent === '직접' ? d.parentCustom || '보호자' : d.parent;
    body = `
    <h2>30일 완주 보상을 약속해요</h2>
    <p class="lead small">물건보다 함께하는 시간을 추천해요. 정한 뒤 둘이 서명하면 시작할 수 있어요.</p>
    <div class="chips">${REWARDS.map(r => `<button class="chip" aria-pressed="${d.reward === r}" data-act="ob-reward" data-v="${esc(r)}">${esc(r)}</button>`).join('')}</div>
    <input class="input" id="obRewardCustom" maxlength="30" placeholder="직접 쓰기: 예) 할머니 댁에서 하룻밤" value="${esc(d.rewardCustom)}">
    <div class="pact">
      <small>${esc(d.child || '아이')}와 ${esc(pn)}가 약속해요</small>
      <b>${esc(d.rewardCustom || d.reward)}</b>
      <div class="pact-habits"><span><i class="dot c"></i>${esc(d.habitC.label)}</span><span><i class="dot p"></i>${esc(d.habitP.label)}</span></div>
    </div>
    <div class="signs">
      <button class="sign ${d.signedP ? 'on' : ''}" data-act="ob-sign" data-who="P">${esc(pn)} 서명${d.signedP ? ' ✓' : ''}</button>
      <button class="sign ${d.signedC ? 'on' : ''}" data-act="ob-sign" data-who="C">${esc(d.child || '아이')} 서명${d.signedC ? ' ✓' : ''}</button>
    </div>
    <div class="field"><span class="flabel">언제 시작할까요?</span>
      <div class="seg"><button aria-pressed="${d.start === 'today'}" data-act="ob-start" data-v="today">오늘부터</button><button aria-pressed="${d.start === 'tomorrow'}" data-act="ob-start" data-v="tomorrow">내일부터</button></div></div>
    <p class="err" id="obErr" role="alert"></p>
    <div class="nav-row"><button class="btn line" data-act="ob-back">이전</button><button class="btn main" data-act="ob-finish">30일 시작하기</button></div>`;
  }
  return `<div class="ob"><div class="ob-steps">${dots}</div>${body}</div>`;
}
function readObInputs() {
  if (!ob) return;
  const v = id => { const el = document.getElementById(id); return el ? el.value.trim() : null; };
  if (v('obChild') !== null) ob.child = v('obChild');
  if (v('obParentCustom') !== null) ob.parentCustom = v('obParentCustom');
  if (v('obRewardCustom') !== null) ob.rewardCustom = v('obRewardCustom');
  ['c', 'p'].forEach(w => {
    const key = w === 'c' ? 'habitC' : 'habitP', custom = w === 'c' ? ob.customC : ob.customP;
    if (custom && v('obCustom' + w) !== null) ob[key] = { type: v('obCustomType' + w), label: v('obCustom' + w) || ob[key].label };
  });
}
function finishOnboarding() {
  readObInputs();
  const err = m => { $('#obErr').textContent = m; };
  if (!ob.child) { ob.step = 1; render(); toast('아이 닉네임을 적어 주세요'); return; }
  if (!(ob.signedP && ob.signedC)) return err('두 사람 모두 서명해야 약속이 시작돼요.');
  const start = new Date(); if (ob.start === 'tomorrow') start.setDate(start.getDate() + 1);
  const d = draftState(); d.reward.text = ob.rewardCustom || ob.reward; d.reward.signedP = d.reward.signedC = true;
  d.startDate = isoLocal(start);
  app = d; ob = null; tab = 'today'; persist(); render();
  toast(dayNum(app) >= 1 ? 'Day 1 시작! 오늘 저녁에 서로 도장을 찍어 주세요' : '내일부터 시작해요');
}
function makeDemo() {
  const start = new Date(); start.setDate(start.getDate() - 11);
  const a = newState({ parent: '엄마', child: '콩이', habitC: { type: 'read', label: HAB_C.read.label }, habitP: { type: 'phone', label: HAB_P.phone.label },
    homeType: 'house', theme: THEMES[0][1], reward: REWARDS[0], signedP: true, signedC: true, startDate: isoLocal(start) });
  a.demo = true;
  const missC = [6], missP = [4, 10];
  for (let n = 1; n <= 11; n++) {
    const r = rec(a, n);
    if (!missC.includes(n)) { r.c.chk = r.c.stamp = true; }
    if (!missP.includes(n)) { r.p.chk = r.p.stamp = true; }
  }
  a.missions[3] = true; a.missions[10] = true; a.cheers.push({ day: 3, from: 'p', text: '콩이 책 읽는 목소리 듣는 게 좋아' }, { day: 3, from: 'c', text: '엄마 폰 안 보니까 좋아' });
  a.days[6].recC = true; // 회복권 1장 사용 예시
  rec(a, 12).c.chk = true;
  return a;
}

/* ---------------- today ---------------- */
function personCard(a, n, who) {
  const r = a.days[n] || { c: { chk: false, stamp: false }, p: { chk: false, stamp: false } };
  const nm = names(a), other = who === 'c' ? nm.p : nm.c;
  const st = personStatus(a, n, who);
  const x = r[who];
  const recovered = who === 'c' ? r.recC : r.recP;
  return `<div class="pcard ${who}">
    <div class="pc-top"><span class="ava ${who}">${esc(nm[who].slice(0, 1))}</span><div><b>${esc(nm[who])}</b><small>${esc(habitLabel(a, who))}</small></div>
      ${recovered && !x.stamp ? '<span class="badge rec">회복권으로 메움</span>' : ''}</div>
    <div class="pc-btns">
      <button class="pbtn chk ${x.chk ? 'done' : ''}" data-act="chk" data-n="${n}" data-who="${who}">${x.chk ? '했어요 ✓' : `${esc(nm[who])} 했어요`}</button>
      <button class="pbtn stp ${x.stamp ? 'done' : ''}" data-act="stamp" data-n="${n}" data-who="${who}" ${x.chk ? '' : 'disabled'}>${x.stamp ? `${esc(other)} 도장 ✓` : `${esc(other)} 확인 도장`}</button>
    </div>
    <span class="stamp ${x.stamp ? 'on' : ''}" aria-hidden="true">확인</span>
  </div>`;
}
function viewToday() {
  const a = app, m = summary(a), nm = names(a), t = m.today;
  let html = '';
  if (t < 1) {
    html += `<div class="card soft"><h3>내일부터 시작해요</h3><p>${fmtDate(dateOfDay(a, 1))} 저녁에 첫 체크인을 해요. 오늘은 약속서를 냉장고에 붙여 두는 건 어때요?</p></div>`;
    return html;
  }
  if (t > LENGTH) {
    html += `<div class="card hero-card"><h3>30일을 함께 지나왔어요</h3><p>함께 해낸 날 ${m.together}일. 이제 완주 리포트를 보고, 약속한 보상을 실행할 차례예요.</p>
      <div class="stack"><button class="btn main" data-act="report">완주 리포트 보기</button><button class="btn line" data-act="tab" data-v="promise">보상 이행 체크하기</button></div></div>`;
    return html;
  }
  const isEve = tod() === 'evening';
  html += `<div class="sec-h"><h2>${isEve ? '오늘 저녁 체크인' : '오늘 할 습관'}</h2><span class="mute">${fmtDate(dateOfDay(a, t))}</span></div>`;
  if (!isEve) html += `<p class="mute small" style="margin-top:-6px">해냈으면 바로 체크하고, 저녁에 서로 확인 도장을 찍어 주세요.</p>`;
  html += `<div class="cards">${personCard(a, t, 'c')}${personCard(a, t, 'p')}</div>`;
  const both = personDone(a.days[t], 'c') && personDone(a.days[t], 'p');
  html += both ? `<div class="banner ok">오늘 완성! 가족 스트릭 ${m.streak}일</div>`
    : `<div class="banner">${a.days[t] && (a.days[t].c.chk || a.days[t].p.chk) ? '둘 다 체크하고 서로 도장을 찍으면 오늘이 완성돼요' : '각자 체크 → 서로 확인 도장 → 가족 스트릭 +1'}</div>`;

  // 어제 기록 마저 하기
  const y = t - 1;
  if (y >= 1 && !(personDone(a.days[y], 'c') && personDone(a.days[y], 'p'))) {
    html += `<details class="card yday"><summary>어제(Day ${y}) 기록을 마저 할 수 있어요</summary><div class="cards">${personCard(a, y, 'c')}${personCard(a, y, 'p')}</div>
      <p class="mute small">어제 기록은 오늘까지 고칠 수 있어요. 그 전 날은 회복권으로 메워요.</p></details>`;
  }
  // 응원 미션
  [t, t - 1].forEach(n => {
    const ms = MISSIONS[n]; if (!ms || a.missions[n]) return;
    html += `<div class="card mission"><span class="eyebrow">Day ${n} 응원 미션</span><h3>${ms.title}</h3><p>${ms.body.replace('아이', esc(nm.c)).replace('부모', esc(nm.p))}</p>
      ${ms.kind === 'cheer' ? `
        <label class="flabel small" for="cheerP">${esc(nm.p)} → ${esc(nm.c)}</label><input class="input" id="cheerP" maxlength="40" placeholder="예: 책 읽는 목소리가 좋아">
        <label class="flabel small" for="cheerC">${esc(nm.c)} → ${esc(nm.p)}</label><input class="input" id="cheerC" maxlength="40" placeholder="예: 같이 하니까 덜 귀찮아">` : ''}
      <button class="btn main sm" data-act="mission" data-n="${n}">${ms.kind === 'cheer' ? '응원 남기기' : '해 봤어요'}</button></div>`;
  });
  // 회복권
  const recoverable = [];
  for (let n = 1; n < t - 1; n++) ['c', 'p'].forEach(w => { if (personStatus(a, n, w) === 'miss') recoverable.push([n, w]); });
  if (recoverable.length && m.recLeft > 0) {
    html += `<div class="card soft"><span class="eyebrow">회복권 ${m.recLeft}장 남음</span><h3>쉬어간 날을 메울 수 있어요</h3>
      <p class="small mute">아팠거나 바빴던 날, 스트릭이 끊기지 않게 회복권을 써요. 30일 동안 ${RECOVERIES}장까지.</p>
      <div class="chips">${recoverable.slice(-4).map(([n, w]) => `<button class="chip" data-act="recover" data-n="${n}" data-who="${w}">Day ${n} · ${esc(nm[w])}</button>`).join('')}</div></div>`;
  }
  // 7일 설문
  if (t >= 7 && !a.survey) html += viewSurvey();
  if (m.lastDay) html += `<div class="card hero-card"><h3>마지막 날이에요</h3><p>오늘 체크를 마치면 깃발이 올라가요. 완주 리포트는 지금도 미리 볼 수 있어요.</p><button class="btn main" data-act="report">완주 리포트 보기</button></div>`;
  // 집 변화 안내
  html += `<div class="card plain"><span class="eyebrow">우리 집이 바뀌는 방식</span>
    <p class="small"><i class="dot c"></i>${esc(nm.c)}: ${propText(a, 'c')}<br><i class="dot p"></i>${esc(nm.p)}: ${propText(a, 'p')}<br><i class="dot g"></i>둘 다 해낸 날: 가족 나무가 자라고 창문 불빛이 따뜻해져요</p></div>`;
  return html;
}
function viewSurvey() {
  return `<div class="card survey"><span class="eyebrow">7일 체험 설문 · 파일럿용</span><h3>7일을 해 보니 어떠세요?</h3>
    <p class="small mute">실제 결제는 없어요. 운영자가 가격을 정하는 데 참고합니다.</p>
    <span class="flabel small">남은 23일도 계속할 건가요?</span>
    <div class="chips" id="svCont">${['계속할래요', '고민 중', '그만할래요'].map(v => `<button class="chip" data-act="sv" data-k="continue" data-v="${v}">${v}</button>`).join('')}</div>
    <span class="flabel small">30일 패스가 얼마면 결제하겠어요?</span>
    <div class="chips" id="svPrice">${['9,900원', '12,900원', '19,900원', '무료일 때만'].map(v => `<button class="chip" data-act="sv" data-k="price" data-v="${v}">${v}</button>`).join('')}</div>
    <input class="input" id="svComment" maxlength="60" placeholder="한마디 (선택): 가장 좋았던 점이나 아쉬운 점">
    <button class="btn main sm" data-act="sv-save">설문 저장</button></div>`;
}

/* ---------------- calendar ---------------- */
function cellClass(a, n) {
  const c = personStatus(a, n, 'c'), p = personStatus(a, n, 'p');
  if (c === 'future') return 'future';
  if (c === 'pending' || p === 'pending') {
    const r = a.days[n]; return (r && (personDone(r, 'c') || personDone(r, 'p'))) ? 'half today' : 'today';
  }
  if ((c === 'recover' || p === 'recover') && c !== 'miss' && p !== 'miss') return 'rec';
  if (c !== 'miss' && p !== 'miss') return 'both';
  if (c === 'miss' && p === 'miss') return 'rest';
  return 'half';
}
function viewCalendar() {
  const a = app, m = summary(a), nm = names(a);
  let cells = '';
  for (let n = 1; n <= LENGTH; n++) cells += `<button class="cell ${cellClass(a, n)} ${selDay === n ? 'sel' : ''} ${MISSIONS[n] ? 'dip' : ''}" data-act="cell" data-n="${n}" aria-label="Day ${n}">${n}</button>`;
  let detail = '';
  if (selDay) {
    const n = selDay, label = s => ({ done: '완료', recover: '회복권으로 메움', pending: '오늘 진행 중', miss: '쉬어간 날', future: '아직 오지 않은 날' }[s]);
    detail = `<div class="card plain"><h3>Day ${n} · ${fmtDate(dateOfDay(a, n))}</h3>
      ${['c', 'p'].map(w => { const st = personStatus(a, n, w);
        return `<div class="drow"><i class="dot ${w}"></i><b>${esc(nm[w])}</b><span class="mute">${label(st)}</span>
          ${st === 'miss' && !editable(a, n) && m.recLeft > 0 ? `<button class="btn line sm" data-act="recover" data-n="${n}" data-who="${w}">회복권 쓰기</button>` : ''}</div>`; }).join('')}
      ${editable(a, n) && n !== m.today ? '<p class="small mute">어제 기록은 오늘 화면에서 마저 할 수 있어요.</p>' : ''}</div>`;
  }
  const cheers = a.cheers.length ? a.cheers.map(c => `<li><small>Day ${c.day} · ${esc(c.from === 'p' ? nm.p + ' → ' + nm.c : nm.c + ' → ' + nm.p)}</small>"${esc(c.text)}"</li>`).join('') : '<li class="mute">3일차 응원 미션에서 남긴 말이 여기에 모여요.</li>';
  return `<div class="sec-h"><h2>가족 달력</h2><span class="mute">Day ${Math.min(Math.max(m.today, 0), LENGTH)} / 30</span></div>
    <div class="stats">
      <div><b>${m.streak}</b><small>가족 스트릭</small></div><div><b>${m.together}</b><small>함께한 날</small></div>
      <div><b>${m.best}</b><small>최장 스트릭</small></div><div><b>${m.recLeft}</b><small>남은 회복권</small></div>
    </div>
    <div class="cal">${cells}</div>
    <div class="legend"><span><i class="lg both"></i>둘 다</span><span><i class="lg half"></i>한 명</span><span><i class="lg rec"></i>회복권</span><span><i class="lg dipdot"></i>응원 미션 날</span></div>
    ${detail}
    <div class="card plain"><h3>서로에게 남긴 말</h3><ul class="cheers">${cheers}</ul></div>`;
}

/* ---------------- promise ---------------- */
function viewPromise() {
  const a = app, m = summary(a), nm = names(a), rw = a.reward;
  const left = LENGTH - Math.max(0, m.today);
  const open = m.today >= LENGTH;
  return `<div class="sec-h"><h2>보상 약속</h2></div>
    <div class="reward-card">
      <small>${esc(nm.c)}와 ${esc(nm.p)}가 약속했어요</small>
      <b>${esc(rw.text)}</b>
      <div class="pact-habits"><span><i class="dot c"></i>${esc(habitLabel(a, 'c'))}</span><span><i class="dot p"></i>${esc(habitLabel(a, 'p'))}</span></div>
      <small>${rw.signedP && rw.signedC ? '두 사람 모두 서명함' : '서명이 더 필요해요'}</small>
    </div>
    <div class="signs">
      <button class="sign ${rw.signedP ? 'on' : ''}" data-act="sign" data-who="P">${esc(nm.p)} 서명${rw.signedP ? ' ✓' : ''}</button>
      <button class="sign ${rw.signedC ? 'on' : ''}" data-act="sign" data-who="C">${esc(nm.c)} 서명${rw.signedC ? ' ✓' : ''}</button>
    </div>
    <div class="remain"><span>보상까지</span><b>${left > 0 ? left + '일' : '도착!'}</b></div>
    <div class="bar"><i style="width:${Math.min(100, Math.max(0, m.today) / LENGTH * 100)}%"></i></div>
    <label class="fulfill ${open ? '' : 'locked'}"><input type="checkbox" id="fulfill" ${rw.fulfilled ? 'checked' : ''} ${open ? '' : 'disabled'}>
      <span>${open ? (rw.fulfilled ? `보상을 지켰어요 · ${esc(rw.fulfilledAt)}` : `${esc(nm.p)}: 보상을 실제로 했다면 체크해 주세요`) : 'Day 30에 "보상 이행했어요" 체크가 열려요'}</span></label>
    <details class="card plain"><summary>보상 바꾸기</summary>
      <p class="small mute">바꾸면 두 사람이 다시 서명해야 해요.</p>
      <div class="chips">${REWARDS.map(r => `<button class="chip" aria-pressed="${rw.text === r}" data-act="reward" data-v="${esc(r)}">${esc(r)}</button>`).join('')}</div>
      <div class="row"><input class="input" id="rewardCustom" maxlength="30" placeholder="직접 쓰기"><button class="btn line sm" data-act="reward-custom">바꾸기</button></div>
    </details>
    ${m.today >= LENGTH ? '<button class="btn main" data-act="report">완주 리포트 보기</button>' : ''}`;
}

/* ---------------- settings ---------------- */
function viewSettings() {
  const a = app, nm = names(a);
  const sel = (who, map) => `<select class="input" id="setType${who}">${Object.entries(map).map(([k, h]) => `<option value="${k}" ${a.habits[who].type === k ? 'selected' : ''}>${h.prop}</option>`).join('')}</select>`;
  return `<div class="sec-h"><h2>더보기</h2></div>
    ${a.demo ? '<div class="card soft"><b>예시 가족으로 둘러보는 중이에요.</b><p class="small">맨 아래 "처음부터 다시"를 누르면 우리 가족으로 시작할 수 있어요.</p></div>' : ''}
    <div class="card plain"><h3>가족과 습관</h3>
      <div class="grid2">
        <label class="field"><span class="flabel small">부모 호칭</span><input class="input" id="setP" maxlength="6" value="${esc(nm.p)}"></label>
        <label class="field"><span class="flabel small">아이 닉네임</span><input class="input" id="setC" maxlength="8" value="${esc(nm.c)}"></label>
      </div>
      <label class="field"><span class="flabel small">${esc(nm.c)}의 습관</span><input class="input" id="setHc" maxlength="24" value="${esc(a.habits.c.label)}">${sel('c', HAB_C)}</label>
      <label class="field"><span class="flabel small">${esc(nm.p)}의 습관</span><input class="input" id="setHp" maxlength="24" value="${esc(a.habits.p.label)}">${sel('p', HAB_P)}</label>
      <button class="btn line sm" data-act="save-family">저장</button>
    </div>
    <div class="card plain"><h3>우리 집 모습</h3>
      <div class="seg"><button aria-pressed="${a.home.type === 'house'}" data-act="home" data-v="house">단독주택</button><button aria-pressed="${a.home.type === 'apt'}" data-act="home" data-v="apt">아파트</button></div>
      <div class="swatches">${THEMES.map(([n, c]) => `<button class="swatch" style="background:${c}" aria-label="${n}" aria-pressed="${a.home.theme === c}" data-act="theme" data-v="${c}"></button>`).join('')}</div>
    </div>
    <div class="card plain"><h3>저녁 알림</h3>
      <p class="small mute">이 앱은 서버가 없어서 직접 알림을 보낼 수 없어요. 대신 휴대폰 캘린더에 30일 동안 매일 울리는 알림을 넣어 드려요.</p>
      <div class="row"><input class="input" type="time" id="remindAt" value="20:00" style="max-width:140px"><button class="btn line sm" data-act="ics">캘린더에 알림 추가</button></div>
    </div>
    <div class="card plain"><h3>파일럿 기록 보내기</h3>
      <p class="small mute">운영자에게 진행 상황을 알려 줄 때 써요. 닉네임과 체크 기록만 들어가요.</p>
      <div class="row"><button class="btn main sm" data-act="copy-pilot">요약 복사하기</button><button class="btn line sm" data-act="backup">백업 파일 저장</button>
        <label class="btn line sm filebtn">백업 불러오기<input type="file" id="restore" accept="application/json,.json" hidden></label></div>
      <textarea class="input" id="copyFallback" rows="8" hidden readonly></textarea>
      <details><summary class="small">보내질 내용 미리 보기</summary><pre class="pre">${esc(pilotText(a))}</pre></details>
    </div>
    <div class="card plain" id="installCard"><h3>홈 화면에 추가</h3>
      <p class="small mute">아이폰: Safari 공유 버튼 → "홈 화면에 추가". 안드로이드: Chrome 메뉴 → "앱 설치" 또는 "홈 화면에 추가".</p>
      <button class="btn line sm" data-act="install" id="installBtn" hidden>지금 설치하기</button>
    </div>
    <div class="card plain"><h3>체험·테스트용</h3>
      <p class="small mute">날짜를 앞당겨 3일차 미션, 7일 설문, 30일 리포트를 미리 볼 수 있어요. 실제 사용 중에는 건드리지 마세요.</p>
      <div class="row"><button class="btn line sm" data-act="dev" data-v="-1">하루 전으로</button><span class="mute small">${a.devOffset ? `+${a.devOffset}일 앞당김` : '오늘 날짜'}</span><button class="btn line sm" data-act="dev" data-v="1">하루 넘기기</button></div>
      <div class="seg" style="margin-top:8px"><button aria-pressed="${!todOverride}" data-act="tod" data-v="">시간대 자동</button><button aria-pressed="${todOverride === 'morning'}" data-act="tod" data-v="morning">아침</button><button aria-pressed="${todOverride === 'evening'}" data-act="tod" data-v="evening">저녁</button></div>
    </div>
    <div class="card plain"><h3>개인정보</h3><p class="small mute">가입이 없고, 아이의 실명·사진·학교·위치를 받지 않아요. 모든 기록은 이 휴대폰의 브라우저 저장 공간에만 있고, 직접 "요약 복사"나 "백업 저장"을 누를 때만 밖으로 나가요. 브라우저 데이터를 지우면 기록도 지워지니 가끔 백업해 주세요.</p></div>
    <button class="btn danger" data-act="reset">${confirmReset ? '정말 지울까요? 한 번 더 누르면 모든 기록이 지워져요' : '처음부터 다시 (기록 모두 지우기)'}</button>
    <p class="mute small center">Try30Days 파일럿 v0.1</p>`;
}

/* ---------------- report ---------------- */
function viewReport() {
  const a = app, m = summary(a), nm = names(a);
  return `<div class="sec-h"><button class="btn line sm" data-act="tab" data-v="today">← 돌아가기</button></div>
    <canvas id="reportCanvas" width="1080" height="1350" class="report-canvas" aria-label="완주 리포트 카드"></canvas>
    <div class="card plain"><h3>서로에게 한 줄</h3>
      <label class="flabel small" for="noteP">${esc(nm.p)} → ${esc(nm.c)}</label><input class="input" id="noteP" maxlength="40" value="${esc(a.notes.pToC)}">
      <label class="flabel small" for="noteC">${esc(nm.c)} → ${esc(nm.p)}</label><input class="input" id="noteC" maxlength="40" value="${esc(a.notes.cToP)}">
      <button class="btn line sm" data-act="save-notes">카드에 넣기</button></div>
    <div class="stack"><button class="btn main" data-act="share-report">이미지로 저장·공유</button></div>
    <p class="small mute center">함께한 날 ${m.together}일 · ${m.finished ? '30일 완료' : `Day ${m.today} 기준 미리보기`}</p>`;
}

/* ---------------- render ---------------- */
function render() {
  const main = $('#main'), nav = $('#tabs');
  confirmReset = confirmReset && tab === 'more';
  if (!app && !ob) startOnboarding();
  const showStage = !!ob ? ob.step === 3 || ob.step === 0 : tab === 'today';
  $('#stage').hidden = !showStage;
  $('#hud').hidden = !!ob || tab !== 'today';
  nav.hidden = !!ob;
  document.body.classList.toggle('onboarding', !!ob);
  if (ob) main.innerHTML = viewOnboarding();
  else {
    main.innerHTML = tab === 'today' ? viewToday() : tab === 'calendar' ? viewCalendar() : tab === 'promise' ? viewPromise() : tab === 'report' ? viewReport() : viewSettings();
    nav.querySelectorAll('button').forEach(b => b.setAttribute('aria-current', b.dataset.v === tab ? 'page' : 'false'));
    paintHud();
    if (tab === 'report') drawReport($('#reportCanvas'), app, summary(app));
    if (tab === 'more' && deferredInstall) $('#installBtn').hidden = false;
  }
  if (showStage) { ensureHouse(); paintStage(); }
}
function paintHud() {
  const m = summary(app); const t = Math.min(Math.max(m.today, 0), LENGTH);
  $('#hDay').textContent = m.today < 1 ? 'D-1' : `Day ${t}`;
  $('#hTod').textContent = m.today > LENGTH ? '완주' : tod() === 'morning' ? '아침 · 체크인' : '저녁 · 확인 도장';
  $('#hStreak').textContent = m.streak; $('#hTogether').textContent = m.together;
}

/* ---------------- events ---------------- */
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; const b = $('#installBtn'); if (b) b.hidden = false; });

document.addEventListener('click', async e => {
  const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
  const act = el.dataset.act, v = el.dataset.v, n = +el.dataset.n, who = el.dataset.who;
  if (ob) readObInputs();
  switch (act) {
    case 'tab': tab = v; selDay = null; window.scrollTo({ top: 0 }); break;
    case 'demo': app = makeDemo(); ob = null; tab = 'today'; persist(); toast('예시 가족 "콩이네" 12일째 모습이에요'); break;
    case 'ob-next':
      if (ob.step === 1 && !ob.child) { toast('아이 닉네임을 적어 주세요'); return; }
      ob.step = Math.min(4, ob.step + 1); break;
    case 'ob-back': ob.step = Math.max(0, ob.step - 1); break;
    case 'ob-parent': ob.parent = v; break;
    case 'ob-habit': { const k = who === 'c' ? 'habitC' : 'habitP'; ob[k] = { type: v, label: (who === 'c' ? HAB_C : HAB_P)[v].label }; ob[who === 'c' ? 'customC' : 'customP'] = false; break; }
    case 'ob-habit-custom': { const k = who === 'c' ? 'customC' : 'customP'; ob[k] = true; const hk = who === 'c' ? 'habitC' : 'habitP'; ob[hk] = { ...ob[hk], label: '' }; break; }
    case 'ob-home': ob.homeType = v; break;
    case 'ob-theme': ob.theme = v; break;
    case 'ob-reward': ob.reward = v; ob.rewardCustom = ''; break;
    case 'ob-sign': ob['signed' + who] = !ob['signed' + who]; break;
    case 'ob-start': ob.start = v; break;
    case 'ob-finish': finishOnboarding(); return;

    case 'chk': case 'stamp': {
      if (!editable(app, n)) return;
      const r = rec(app, n), x = r[who];
      const before = personDone(r, 'c') && personDone(r, 'p');
      if (act === 'chk') { x.chk = !x.chk; if (!x.chk) x.stamp = false; }
      else x.stamp = !x.stamp;
      persist(); render();
      const after = personDone(r, 'c') && personDone(r, 'p');
      if (act === 'stamp' && x.stamp) {
        if (after && !before) toast(`함께 해냈어요! 가족 나무가 조금 자랐어요`);
        else toast(`도장 꾹! ${propText(app, who).replace('하나씩 ', '').replace('한 권씩 ', '한 권 ')}`);
      }
      return;
    }
    case 'recover': {
      const m = summary(app); if (m.recLeft <= 0) { toast('회복권을 모두 썼어요'); return; }
      const r = rec(app, n); if (who === 'c') r.recC = true; else r.recP = true;
      persist(); toast(`Day ${n} ${names()[who]} 칸을 회복권으로 메웠어요. 남은 회복권 ${m.recLeft - 1}장`); break;
    }
    case 'mission': {
      const ms = MISSIONS[n];
      if (ms.kind === 'cheer') {
        const p = $('#cheerP').value.trim(), c = $('#cheerC').value.trim();
        if (!p && !c) { toast('한 사람이라도 응원 한 줄을 적어 주세요'); return; }
        if (p) app.cheers.push({ day: n, from: 'p', text: p }); if (c) app.cheers.push({ day: n, from: 'c', text: c });
      }
      app.missions[n] = true; persist(); toast('응원 미션 완료! 달력에서 다시 볼 수 있어요'); break;
    }
    case 'sv': {
      const box = el.parentElement; box.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', c === el));
      box.dataset.val = v; return;
    }
    case 'sv-save': {
      const c = $('#svCont').dataset.val, p = $('#svPrice').dataset.val;
      if (!c || !p) { toast('두 질문 모두 골라 주세요'); return; }
      app.survey = { continue: c, price: p, comment: $('#svComment').value.trim(), at: isoLocal(now(app)) };
      persist(); toast('고마워요. "더보기 → 요약 복사"에 함께 담겨요'); break;
    }
    case 'cell': selDay = selDay === n ? null : n; break;
    case 'sign': app.reward['signed' + who] = !app.reward['signed' + who]; persist(); break;
    case 'reward': app.reward.text = v; app.reward.signedP = app.reward.signedC = false; persist(); toast('보상이 바뀌었어요. 다시 서명해 주세요'); break;
    case 'reward-custom': { const t = $('#rewardCustom').value.trim(); if (!t) { toast('바꿀 보상을 적어 주세요'); return; }
      app.reward.text = t; app.reward.signedP = app.reward.signedC = false; persist(); toast('보상이 바뀌었어요. 다시 서명해 주세요'); break; }
    case 'save-family': {
      const g = id => $(id).value.trim();
      if (!g('#setC')) { toast('아이 닉네임을 비울 수 없어요'); return; }
      app.family = { parent: g('#setP') || '보호자', child: g('#setC') };
      app.habits.c = { type: $('#setTypec').value, label: g('#setHc') || HAB_C[$('#setTypec').value].label };
      app.habits.p = { type: $('#setTypep').value, label: g('#setHp') || HAB_P[$('#setTypep').value].label };
      persist(); toast('저장했어요'); break;
    }
    case 'home': app.home.type = v; persist(); toast('우리 집 탭에서 바뀐 모습을 볼 수 있어요'); break;
    case 'theme': app.home.theme = v; persist(); break;
    case 'ics': { const [h, mi] = ($('#remindAt').value || '20:00').split(':').map(Number);
      download('try30days-알림.ics', new Blob([icsReminder(app, h, mi)], { type: 'text/calendar' })); toast('파일을 열어 캘린더에 추가해 주세요'); return; }
    case 'copy-pilot': copyText(pilotText(app)); return;
    case 'backup': download(`try30days-백업-${isoLocal(new Date())}.json`, new Blob([JSON.stringify(app, null, 2)], { type: 'application/json' })); toast('백업 파일을 저장했어요'); return;
    case 'install': if (deferredInstall) { deferredInstall.prompt(); deferredInstall = null; el.hidden = true; } return;
    case 'dev': app.devOffset = (app.devOffset || 0) + Number(v); persist(); toast(`Day ${dayNum(app)}로 이동했어요 (테스트)`); break;
    case 'tod': todOverride = v || null; break;
    case 'reset':
      if (!confirmReset) { confirmReset = true; break; }
      clearAll(); app = null; confirmReset = false; ob = null; tab = 'today'; break;
    case 'report': tab = 'report'; window.scrollTo({ top: 0 }); break;
    case 'save-notes': app.notes.pToC = $('#noteP').value.trim(); app.notes.cToP = $('#noteC').value.trim(); persist(); toast('카드에 넣었어요'); break;
    case 'share-report': {
      const cv = $('#reportCanvas');
      cv.toBlob(async blob => {
        const file = new File([blob], `try30days-${app.family.child}네.png`, { type: 'image/png' });
        try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Try30Days 완주 리포트' }); return; } } catch (err) { if (err.name === 'AbortError') return; }
        download(file.name, blob);
      }, 'image/png');
      return;
    }
  }
  render();
});
document.addEventListener('change', e => {
  if (e.target.id === 'fulfill') {
    app.reward.fulfilled = e.target.checked; app.reward.fulfilledAt = e.target.checked ? isoLocal(now(app)) : null; persist();
    if (e.target.checked) toast('약속을 지켰어요. 리포트에 이행 배지가 붙어요');
    render();
  }
  if (e.target.id === 'restore' && e.target.files[0]) {
    const fr = new FileReader();
    fr.onload = () => { try { const d = JSON.parse(fr.result); if (!d || d.version !== 1 || !d.startDate) throw new Error('형식'); app = d; persist(); toast('백업을 불러왔어요'); render(); }
      catch { toast('Try30Days 백업 파일이 아니에요. 저장했던 .json 파일을 골라 주세요.'); } };
    fr.readAsText(e.target.files[0]);
  }
});
document.addEventListener('input', e => {
  if (ob && ob.step === 4 && e.target.id === 'obRewardCustom') { ob.rewardCustom = e.target.value.trim(); const b = document.querySelector('.pact b'); if (b) b.textContent = ob.rewardCustom || ob.reward; }
});
// 자정·시간대 변화 반영
let lastKey = '';
setInterval(() => { if (!app) return; const k = dayNum(app) + tod(); if (k !== lastKey) { if (lastKey) render(); lastKey = k; } }, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden && app && !ob) render(); });

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(() => {});
render();
