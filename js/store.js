// Try30Days 데이터 계층: 모든 기록은 이 기기의 localStorage에만 저장된다.
const KEY = 't30.v1';

export const HAB_C = {
  read:  { label: '자기 전 책 10분',     prop: '아이 방 책장에 책이 한 권씩 꽂혀요', unit: '권' },
  tidy:  { label: '장난감 스스로 정리',   prop: '바닥 장난감이 하나씩 상자로 들어가요', unit: '번' },
  sleep: { label: '밤 9시 반 잠자리',     prop: '침대 위 별 모빌이 하나씩 늘어나요', unit: '번' },
};
export const HAB_P = {
  phone: { label: '저녁 식사 중 휴대폰 안 보기', prop: '식탁 위 휴대폰이 하나씩 사라져요', unit: '번' },
  tv:    { label: '저녁 TV 대신 대화 30분',     prop: 'TV가 꺼지고 거실에 보드게임이 펼쳐져요', unit: '번' },
  walk:  { label: '저녁 산책 20분',            prop: '마당 길에 등불이 하나씩 켜져요', unit: '번' },
};
export const PARENT_LABELS = ['엄마', '아빠', '할머니', '할아버지'];
export const THEMES = [['하늘', '#8fbfe0'], ['민트', '#8fd1b5'], ['살구', '#f2b48a'], ['라벤더', '#b9a6e0']];
export const REWARDS = ['주말에 둘이 캠핑 가기', '둘만의 영화관 데이', '만들기 재료 쇼핑 가기', '놀이공원 하루'];
export const MISSIONS = {
  3:  { title: '서로에게 응원 한 줄', body: '새로움이 사라지는 날이에요. 서로에게 응원 한 줄씩 남겨 주세요.', kind: 'cheer' },
  10: { title: '역할 바꾸기', body: '오늘은 아이가 부모 습관을 챙기는 담당이에요. 부모가 했는지 아이가 먼저 물어봐 주세요.', kind: 'check' },
  20: { title: '5분 버전도 인정', body: '지치기 쉬운 때예요. 오늘은 습관을 5분짜리로 줄여도 체크로 인정합니다. 회복권도 아직 남아 있는지 확인해 보세요.', kind: 'check' },
};
export const LENGTH = 30;
export const RECOVERIES = 2;

/* ---------- persistence ---------- */
export function load() {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch { return false; }
}
export function clearAll() { try { localStorage.removeItem(KEY); } catch {} }

export function newState(f) {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    family: { parent: f.parent, child: f.child },
    habits: { c: f.habitC, p: f.habitP },
    home: { type: f.homeType, theme: f.theme },
    reward: { text: f.reward, signedP: !!f.signedP, signedC: !!f.signedC, fulfilled: false, fulfilledAt: null },
    startDate: f.startDate,
    days: {},
    missions: {},
    cheers: [],
    notes: { pToC: '', cToP: '' },
    survey: null,
    devOffset: 0,
  };
}

/* ---------- dates ---------- */
const pad = n => String(n).padStart(2, '0');
export function isoLocal(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
export function now(s) { const d = new Date(); if (s && s.devOffset) d.setDate(d.getDate() + s.devOffset); return d; }
function midnight(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }
export function dayNum(s) {
  const t = now(s); const today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  return Math.round((today - midnight(s.startDate)) / 86400000) + 1;
}
export function dateOfDay(s, n) { const d = midnight(s.startDate); d.setDate(d.getDate() + n - 1); return d; }
export function fmtDate(d) { return `${d.getMonth() + 1}월 ${d.getDate()}일`; }

/* ---------- records ---------- */
export function rec(s, n) {
  if (!s.days[n]) s.days[n] = { c: { chk: false, stamp: false }, p: { chk: false, stamp: false }, recC: false, recP: false };
  return s.days[n];
}
function peek(s, n) { return s.days[n] || null; }
export function personDone(r, who) {
  if (!r) return false;
  return (r[who].chk && r[who].stamp) || (who === 'c' ? r.recC : r.recP);
}
export function personRecovered(r, who) { return !!r && (who === 'c' ? r.recC : r.recP) && !(r[who].chk && r[who].stamp); }

// 'done' | 'recover' | 'pending' | 'miss' | 'future'
export function personStatus(s, n, who) {
  const today = dayNum(s);
  if (n > today) return 'future';
  const r = peek(s, n);
  if (personRecovered(r, who)) return 'recover';
  if (personDone(r, who)) return 'done';
  return n === today ? 'pending' : 'miss';
}
export function editable(s, n) { const t = dayNum(s); return n >= 1 && n <= LENGTH && (n === t || n === t - 1); }
export function recoveriesUsed(s) {
  let u = 0; for (const k in s.days) { u += (s.days[k].recC ? 1 : 0) + (s.days[k].recP ? 1 : 0); } return u;
}

/* ---------- summary used by every screen and the 3D house ---------- */
export function summary(s) {
  const today = dayNum(s);
  const D = Math.max(0, Math.min(today, LENGTH));
  let c = 0, p = 0, together = 0, best = 0, run = 0;
  const missC = [], missP = [];
  for (let n = 1; n <= D; n++) {
    const r = peek(s, n); const a = personDone(r, 'c'), b = personDone(r, 'p');
    c += a; p += b;
    if (a && b) { together++; run++; best = Math.max(best, run); }
    else if (n < today) { run = 0; }
    if (!a && n < today) missC.push(n);
    if (!b && n < today) missP.push(n);
  }
  let streak = 0;
  for (let n = D; n >= 1; n--) {
    const r = peek(s, n); const both = personDone(r, 'c') && personDone(r, 'p');
    if (both) streak++; else if (n === today) continue; else break;
  }
  const yesterday = today - 1;
  const yr = peek(s, yesterday);
  const hazeC = yesterday >= 1 && yesterday <= LENGTH && !personDone(yr, 'c');
  const hazeP = yesterday >= 1 && yesterday <= LENGTH && !personDone(yr, 'p');
  const roomOf = { phone: 'kitchen', tv: 'living', walk: 'bedroom' };
  const ht = s.habits;
  const elapsed = Math.max(1, D);
  return {
    today, D, c, p, together, streak, best, missC, missP,
    recLeft: RECOVERIES - recoveriesUsed(s),
    started: today >= 1, finished: today > LENGTH, lastDay: today === LENGTH,
    // 3D scene values
    warmth: Math.min(1, together / 26),
    tree: .3 + .75 * Math.min(1, together / 24),
    fruits: Math.max(0, Math.min(10, Math.floor((together - 5) / 2))),
    books: ht.c.type === 'read' ? Math.min(24, c) : Math.min(24, 3 + Math.floor(elapsed / 4)),
    toysFloor: ht.c.type === 'tidy' ? Math.max(0, 10 - Math.round(c * 10 / 24)) : Math.max(0, Math.round(5 * (1 - elapsed / 24))),
    stars: ht.c.type === 'sleep' ? Math.min(12, Math.ceil(c / 2)) : 0,
    bedMade: ht.c.type === 'sleep' ? c >= 5 : elapsed >= 12,
    phones: ht.p.type === 'phone' ? Math.max(0, 3 - Math.floor(p / 7)) : (elapsed < 10 ? 2 : elapsed < 20 ? 1 : 0),
    tv: ht.p.type === 'tv' ? Math.max(0, 1 - p / 14) : (elapsed < 15 ? .8 : .35),
    board: ht.p.type === 'tv' ? p >= 4 : elapsed >= 24,
    cushions: ht.p.type === 'tv' && p >= 10,
    lanterns: ht.p.type === 'walk' ? Math.min(20, Math.round(p * 20 / 24)) : 0,
    clutter: Math.max(0, Math.round(6 * (1 - (together) / 20))),
    plant: together < 5 ? 0 : together < 15 ? 1 : 2,
    flag: today >= LENGTH && together >= 20,
    hazeChild: hazeC,
    hazeParent: hazeP ? roomOf[ht.p.type] : null,
  };
}

/* ---------- pilot export ---------- */
export function pilotText(s) {
  const m = summary(s);
  const yn = v => (v ? '✓' : '-');
  const mission = n => (s.missions[n] ? '✓' : (m.today > n ? '놓침' : '-'));
  const sv = s.survey;
  return [
    '[Try30Days 파일럿 기록]',
    `가족: ${s.family.child}네 (${s.family.parent}) · 시작 ${s.startDate} · 오늘 Day ${Math.min(m.today, LENGTH)}${m.finished ? ' (완료)' : ''}`,
    `습관: ${s.family.child} "${s.habits.c.label}" / ${s.family.parent} "${s.habits.p.label}"`,
    `함께한 날 ${m.together} / ${Math.min(m.D, LENGTH)}일 · 최장 스트릭 ${m.best}일`,
    `${s.family.child} 완료 ${m.c} · ${s.family.parent} 완료 ${m.p} · 회복권 사용 ${RECOVERIES - m.recLeft}`,
    `놓친 날: ${s.family.child} ${m.missC.join(',') || '없음'} / ${s.family.parent} ${m.missP.join(',') || '없음'}`,
    `응원 미션: 3일차 ${mission(3)} · 10일차 ${mission(10)} · 20일차 ${mission(20)}`,
    `보상: ${s.reward.text} · 서명 ${yn(s.reward.signedP)}${yn(s.reward.signedC)} · 이행 ${s.reward.fulfilled ? '✓ ' + s.reward.fulfilledAt : '-'}`,
    `7일 설문: ${sv ? `계속 의향 ${sv.continue} · 적정 가격 ${sv.price}${sv.comment ? ' · 한마디: ' + sv.comment : ''}` : '미응답'}`,
  ].join('\n');
}

export function icsReminder(s, hour, minute) {
  const d = dateOfDay(s, 1);
  const dt = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(hour)}${pad(minute)}00`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Try30Days//KO', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:t30-${s.startDate}-${hour}${minute}@try30days`, `DTSTAMP:${stamp}`,
    `DTSTART:${dt}`, 'DURATION:PT10M', `RRULE:FREQ=DAILY;COUNT=${LENGTH}`,
    `SUMMARY:Try30Days 저녁 체크인 (${s.family.child} · ${s.family.parent})`,
    'DESCRIPTION:각자 체크하고 서로 확인 도장을 찍어 주세요.',
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Try30Days 체크인 시간이에요', 'TRIGGER:PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}
