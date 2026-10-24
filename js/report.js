// 30일 완주 리포트를 1080×1350 이미지(인스타 세로 비율)로 그린다.
import { LENGTH, RECOVERIES, personDone, personStatus } from './store.js';

const INK = '#22302a', MUTE = '#5c6b63', LEAF = '#3d7c55', LAMP = '#d9962b', PAPER = '#fbfaf6', LINE = '#e3dfd4';
const DISPLAY = '"Gowun Batang", "AppleMyungjo", serif';
const BODY = '"IBM Plex Sans KR", "Apple SD Gothic Neo", sans-serif';

function wrap(ctx, text, x, y, maxW, lh) {
  let line = '', yy = y;
  for (const ch of text) {
    const t = line + ch;
    if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, yy); line = ch; yy += lh; } else line = t;
  }
  if (line) ctx.fillText(line, x, yy);
  return yy;
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }

export function drawReport(cv, a, m) {
  const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, P = 80;
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = MUTE; ctx.font = `600 28px ${BODY}`;
  ctx.fillText(`TRY30DAYS · ${a.startDate.replace(/-/g, '.')} 시작`, P, 120);
  ctx.fillStyle = INK; ctx.font = `700 76px ${DISPLAY}`;
  ctx.fillText(`${a.family.child}네의 30일`, P, 215);
  ctx.fillStyle = MUTE; ctx.font = `500 30px ${BODY}`;
  ctx.fillText(`${a.family.child} "${a.habits.c.label}"  ·  ${a.family.parent} "${a.habits.p.label}"`.slice(0, 48), P, 268);

  // 30칸
  const cols = 10, gap = 12, size = (W - P * 2 - gap * (cols - 1)) / cols, gy = 320;
  for (let n = 1; n <= LENGTH; n++) {
    const i = n - 1, x = P + (i % cols) * (size + gap), y = gy + Math.floor(i / cols) * (size + gap);
    const r = a.days[n]; const c = personStatus(a, n, 'c'), p = personStatus(a, n, 'p');
    const both = personDone(r, 'c') && personDone(r, 'p');
    const recov = c === 'recover' || p === 'recover';
    rr(ctx, x, y, size, size, 14);
    ctx.fillStyle = c === 'future' ? '#efede6' : recov && both ? LAMP : both ? LEAF : (personDone(r, 'c') || personDone(r, 'p')) ? '#a9c9b3' : '#e4e1d8';
    ctx.fill();
    ctx.fillStyle = both ? '#ffffff' : MUTE; ctx.font = `600 24px ${BODY}`; ctx.textAlign = 'center';
    ctx.fillText(String(n), x + size / 2, y + size / 2 + 9); ctx.textAlign = 'left';
  }

  // 숫자 4개
  const sy = gy + 3 * (size + gap) + 40;
  const stats = [[`${m.together}일`, '함께 해낸 날'], [`${m.best}일`, '가장 긴 가족 스트릭'], [`${m.c}번`, `${a.family.child}의 습관`], [`${m.p}번`, `${a.family.parent}의 습관`]];
  stats.forEach(([v, k], i) => {
    const x = P + (i % 2) * ((W - P * 2) / 2), y = sy + Math.floor(i / 2) * 150;
    ctx.strokeStyle = LINE; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (W - P * 2) / 2 - 30, y); ctx.stroke();
    ctx.fillStyle = INK; ctx.font = `600 60px ${BODY}`; ctx.fillText(v, x, y + 75);
    ctx.fillStyle = MUTE; ctx.font = `500 28px ${BODY}`; ctx.fillText(k, x, y + 118);
  });

  // 한 줄 편지
  const ny = sy + 320, bw = (W - P * 2 - 24) / 2;
  [[`${a.family.parent} → ${a.family.child}`, a.notes.pToC], [`${a.family.child} → ${a.family.parent}`, a.notes.cToP]].forEach(([k, v], i) => {
    const x = P + i * (bw + 24);
    rr(ctx, x, ny, bw, 190, 22); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = LINE; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = MUTE; ctx.font = `600 24px ${BODY}`; ctx.fillText(k, x + 26, ny + 46);
    ctx.fillStyle = v ? INK : '#a3aaa4'; ctx.font = `500 30px ${BODY}`;
    wrap(ctx, v ? `"${v}"` : '아래에서 한 줄을 적어 주세요', x + 26, ny + 98, bw - 52, 42);
  });

  // 하단
  const fy = H - 90;
  ctx.fillStyle = INK; ctx.font = `600 30px ${BODY}`;
  ctx.fillText(`보상: ${a.reward.text}${a.reward.fulfilled ? '  ✓ 지켰어요' : ''}`.slice(0, 34), P, fy);
  ctx.fillStyle = MUTE; ctx.font = `500 26px ${BODY}`; ctx.textAlign = 'right';
  ctx.fillText(`회복권 ${RECOVERIES - m.recLeft}장 사용`, W - P, fy); ctx.textAlign = 'left';
  if (a.reward.fulfilled) {
    ctx.save(); ctx.translate(W - P - 90, 150); ctx.rotate(-.25);
    ctx.strokeStyle = '#c8473f'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 70, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#c8473f'; ctx.font = `700 34px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.fillText('약속', 0, -4); ctx.fillText('지킴', 0, 36); ctx.restore();
  }
}
