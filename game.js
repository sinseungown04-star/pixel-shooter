'use strict';
/* =========================================================
 *  PIXEL STRIKER — 드래곤 기사 vs 악마, 도트 세로 스크롤 슈팅
 *  구성: 1.상수/데이터 테이블 → 2.유틸 → 3.폰트/스프라이트(드래곤·악마·보스)/배경 생성
 *        → 4.사운드 → 5.오브젝트 풀 → 6.게임 로직 → 7.렌더링 → 8.입력 → 9.메인 루프
 * ========================================================= */

// ===== 1. 밸런스 상수 (숫자만 바꿔서 난이도·연출 조절) =====
const CONFIG = {
  W: 180, H: 320,                 // 내부 해상도 (CSS로 확대)
  H_MAX: 400,                     // 세로로 긴 폰은 내부 높이를 최대 이만큼 늘려 화면을 채움

  // 플레이어
  PLAYER_HP: 3,
  PLAYER_KEY_SPEED: 120,          // 키보드 이동 속도 (px/s)
  PLAYER_FOLLOW: 20,              // 터치 추적 민감도
  TOUCH_OFFSET_Y: 26,             // 드래곤을 손가락보다 이만큼 위에 둠
  INVULN_TIME: 1.6,               // 피격 후 무적 시간 (초)
  WING_FLAP_FPS: 8,               // 날갯짓 애니메이션 속도

  // 피격 판정 (보이는 크기보다 작게 = 관대한 판정)
  PLAYER_HURTBOX: { hw: 2, hh: 2.5 },   // 기사 몸통 부근만 판정
  ENEMY_BULLET_HITBOX: 1.5,             // 적 탄 판정 반지름 (보이는 탄은 7x7)
  ENEMY_BODY_SHRINK: 3,                 // 적 몸체 판정을 가장자리에서 이만큼 줄임

  // 브레스 & 스킬
  FIRE_INTERVAL: 0.26,            // 기본 브레스 간격 (초)
  FIRE_INTERVAL_STEP: 0.04,       // 속도 레벨당 간격 감소
  BEAM_SPEED: 260,
  BEAM_DAMAGE: 1,
  BEAM_DAMAGE_STEP: 0.5,          // 데미지 레벨당 증가
  BEAM_WIDTH_BY_DAMAGE: [1, 2, 2, 3, 3],   // 데미지 레벨별 브레스 굵기
  BEAM_LEN_BY_PIERCE: [6, 10, 14],         // 관통 레벨별 브레스 길이
  SKILL_MAX: { rate: 3, spread: 3, damage: 4, pierce: 2 },   // 스킬별 최대 레벨 (합계 12)
  COIN_COST: [1, 1, 2, 3],        // 해당 스킬 현재 레벨 → 다음 강화에 필요한 코인 수
  POWER_CAP_BY_BOSS: [3, 6, 9, 12],   // 보스 처치 수별 스킬 총합 상한 (보스 잡을 때마다 해제)
  EVOLVE_AT: [4, 7, 10, 12],      // 스킬 총합이 이 값에 도달하면 드래곤 외형 진화 (상한+1 = 보스 처치 보상으로 도달)

  // 수호 구체(ORB) 스킬: 드래곤 주위를 돌며 적 탄을 막고 닿은 적에게 피해
  ORB_MAX: 5,
  ORB_COUNT_BY_LV: [0, 1, 2, 2, 3, 4],          // 레벨별 구체 개수
  ORB_SPEED_BY_LV: [0, 2.4, 2.4, 3.6, 3.8, 4.6], // 레벨별 회전 속도 (rad/s)
  ORB_RADIUS: 15,                 // 드래곤 중심에서의 거리
  ORB_BLOCK_RADIUS: 4.5,          // 적 탄을 막는 판정 반경
  ORB_DAMAGE: 1,                  // 적에게 닿을 때 피해
  ORB_HIT_COOLDOWN: 0.25,         // 같은 적에게 다시 피해를 주기까지 간격
  ORB_AUTO_WAVES: [2, 5, 9, 13, 17], // 이 웨이브에 도달하면 구체 스킬 자동 +1
  ORB_COIN_COST: [1, 2, 3, 4, 5],  // 구체 현재 레벨 → 다음 강화에 필요한 코인 수
  ORB_COIN_CHANCE: 0.25,          // 일반 스킬 코인 대신 구체 코인이 나올 확률 (일반 스킬이 상한이면 항상 구체)

  // 진화 연출
  EVOLVE_SLOWMO: 0.6,             // 진화 순간 슬로모션 시간 (초)
  EVOLVE_SLOWMO_SCALE: 0.3,       // 슬로모션 속도 배율
  EVOLVE_FX_TIME: 1.6,            // 빛줄기/섬광 연출 시간

  // 코인
  COIN_DROP_COOLDOWN: 1.5,        // 코인 최소 드랍 간격 (초) — 연속 드랍 방지
  COIN_SPEED: 26,
  COIN_MAGNET_RANGE: 28,
  COIN_PICKUP_RANGE: 10,

  // 난이도 (웨이브가 오를수록 증가)
  WAVE_DURATION: 20,              // 이 시간(초)마다 웨이브 +1 (보스전 중엔 멈춤)
  SPAWN_INTERVAL: 1.0,            // 웨이브1 적 등장 간격 (초)
  SPAWN_DECAY: 0.9,               // 웨이브마다 등장 간격에 곱함
  SPAWN_INTERVAL_MIN: 0.32,
  GROUP_CHANCE_PER_WAVE: 0.06,    // 웨이브당 편대(3기) 등장 확률 증가
  ENEMY_SPEED_UP: 0.06,           // 웨이브당 적 이동속도 +6%
  ENEMY_HP_STEP_WAVES: 3,         // 이 웨이브 수마다 적 체력이 한 단계 오름 (1~3: 1단계, 4~6: 2단계 …)
  ENEMY_HP_STEP: 0.3,             // 단계당 적 체력 +30%
  ENEMY_BULLET_SPEED: 60,
  ENEMY_BULLET_SPEED_UP: 4,       // 웨이브당 적 탄속 증가
  ENEMY_BULLET_SPEED_MAX: 125,
  MAGE_FIRE_INTERVAL: 2.0,        // 마법사 악마 불덩이 간격
  MAGE_FIRE_DECAY: 0.96,
  MAGE_FIRE_MIN: 1.1,
  MAGE_SHOTS_EVERY: 5,            // N웨이브마다 마법사 1회 발사 탄 수 +1
  MAGE_MAX_SHOTS: 3,              // 마법사 1회 최대 탄 수
  IMP_FIRE_FROM_WAVE: 4,          // 이 웨이브부터 임프도 가끔 마법구를 쏨
  IMP_FIRE_CHANCE_STEP: 0.05,     // 웨이브당 임프 발사 확률 증가 (최대 IMP_FIRE_CHANCE_MAX)
  IMP_FIRE_CHANCE_MAX: 0.3,
  ELITE_FIRE_INTERVAL: 2.2,
  ELITE_SHOTS: 3,                 // 정예 부채꼴 기본 탄 수
  ELITE_SHOTS_EVERY: 6,           // N웨이브마다 정예 탄 수 +1
  ELITE_MAX_SHOTS: 5,
  ELITE_MAX_ALIVE: 2,
  CHARGER_SPEED: 190,             // 돌진 악마 돌진 속도

  // 보스
  BOSS_EVERY_WAVES: 5,            // N웨이브마다 보스 등장
  BOSS_WARNING: 2.6,
  BOSS_HP: 240,
  BOSS_HP_GROWTH: 1.1,            // 보스 단계마다 체력 +110%
  BOSS_REST: 0.9,                 // 패턴 사이 숨 돌릴 시간
  BOSS_PHASES: [0.66, 0.33],      // 체력 비율 페이즈 경계
  LASER_WARN: 1.0,                // 레이저 경고선 시간
  LASER_TIME: 0.5,
  LASER_HALF_WIDTH: 3,
  BOSS_FAN_MAX: 5,                // 보스 부채꼴 탄 수 상한 (포구당)
  BOSS_RING_BASE: 10,             // 보스 원형 탄막 기본 탄 수
  BOSS_RING_MAX: 20,
  BOSS_SPIRAL_MIN_INTERVAL: 0.09, // 나선 탄막 최소 발사 간격

  // 배경: 각 단계가 시작되는 웨이브 (지구 → 노을 → 핏빛 하늘 → 지옥 → 심층 지옥 → 심연)
  SCENE_WAVES: [1, 5, 6, 7, 10, 13],
  COLD_BULLETS_FROM_SCENE: 2,     // 이 배경 단계(붉은 하늘)부터 적 탄을 파랑/흰색으로 바꿔 배경과 구분
  THEME_FADE: 4,                  // 배경 색 전환 시간 (초)

  // 연출
  HIT_FLASH: 0.08,
  DEATH_PARTICLES: 12,             // 잡몹 사망 파티클 수 (작고 가볍게)
  DEATH_SHAKE: 0,                  // 잡몹 사망 시 화면 흔들림 없음
  DEATH_SHAKE_MAG: 0,
  ELITE_DEATH_SHAKE: 0.1,          // 정예 사망 시 약한 흔들림
  ELITE_DEATH_SHAKE_MAG: 1,
  HURT_SHAKE: 0.45,                // 내가 맞았을 때 흔들림 (잡몹 사망보다 확실히 크게)
  HURT_SHAKE_MAG: 4,
  HURT_FLASH: 0.35,                // 피격 시 화면 가장자리 붉은 섬광 시간
  HURT_HITSTOP: 0.1,               // 피격 순간 잠깐 멈칫 (초)
  SKILL_BANNER_TIME: 1.3,

  // 점수
  SCORE: { imp: 100, bat: 150, charger: 200, mage: 250, elite: 1200, boss: 5000, coin: 50, cappedCoin: 300 },
};

// 적 종류별 기본 능력치 (drop = 코인 드랍 확률)
const ENEMY_TYPES = {
  imp:     { hp: 2,  speed: 44, drop: 0.15 },                     // 직선 하강
  bat:     { hp: 2,  speed: 36, drop: 0.15, amp: 30, freq: 2.6 }, // 지그재그
  mage:    { hp: 4,  speed: 40, drop: 0.18 },                     // 멈춰서 불덩이
  charger: { hp: 3,  speed: 34, drop: 0.16 },                     // 조준 후 돌진
  elite:   { hp: 18, speed: 26, drop: 0.4 },                      // 대형, 가시 부채꼴
};

// 스킬 정보: 코인/HUD 색, 5x5 아이콘(비트), 강화 문구
const SKILL_INFO = {
  rate:   { color: '#7dff6a', short: 'SPEED',  icon: [0b00110, 0b01100, 0b11110, 0b00110, 0b01100], text: 'SPEED UP!',  max: 'SPEED MAX!' },
  spread: { color: '#5ee0ff', short: 'BEAM',   icon: [0b10101, 0b10101, 0b01110, 0b00100, 0b00100], text: 'BEAM +1',    max: 'BEAM MAX!' },
  damage: { color: '#ffd23f', short: 'POWER',  icon: [0b00100, 0b11111, 0b01110, 0b01010, 0b10001], text: 'DAMAGE UP!', max: 'DAMAGE MAX!' },
  pierce: { color: '#c77dff', short: 'PIERCE', icon: [0b00100, 0b01110, 0b10101, 0b00100, 0b11111], text: 'PIERCE!',    max: 'PIERCE MAX!' },
  orb:    { color: '#ff7ad8', short: 'ORB',    icon: [0b01110, 0b10001, 0b10101, 0b10001, 0b01110], text: 'ORB +1',     max: 'ORB MAX!' },
  score:  { color: '#f2f4ff', short: 'BONUS',  icon: [0b00100, 0b01110, 0b11111, 0b01110, 0b00100], text: 'BONUS',      max: 'BONUS' },
};
const SKILL_ORDER = ['rate', 'spread', 'damage', 'pierce'];
const MAX_TOTAL = SKILL_ORDER.reduce((s, k) => s + CONFIG.SKILL_MAX[k], 0);

// 드래곤 스킨 (외형·브레스 색만 다르고 성능은 동일)
// horn/wing/tail/helm = 부위 모양, pal = 도트 색, breath = [바깥, 중간, 밝은 심]
const SKINS = [
  { id: 'fire', name: 'RED DRAGON', desc: 'FIRE - CRIMSON KNIGHT', el: 'fire',
    horn: 'curl', wing: 'bat', tail: 'flame', helm: 'plume',
    pal: { B: '#cc3a2c', b: '#f2a05a', d: '#6e1612', E: '#ffe14d', W: '#4a100c', m: '#e8663a', h: '#f2e2c4',
      H: '#d84a3a', V: '#2a0808', A: '#a82a2a', P: '#ffd040' },
    outline: '#ffe0c8', breath: ['#ff5a10', '#ffa030', '#fff2a0'], deco: '#ffd23f', cape: '#f0b830', flame: '#ffb030' },
  { id: 'ice', name: 'ICE DRAGON', desc: 'FROST - SILVER KNIGHT', el: 'ice',
    horn: 'spike', wing: 'crystal', tail: 'crystal', helm: 'winged',
    pal: { B: '#5aa8e0', b: '#d8f4ff', d: '#2a5a8a', E: '#0a2a5a', W: '#2a4a7a', m: '#9ad8ff', h: '#f0ffff',
      H: '#dfe6ee', V: '#2a3a4a', A: '#b8c4d0', i: '#f0feff' },
    outline: '#e8f8ff', breath: ['#3ab8ff', '#8ae0ff', '#ffffff'], deco: '#e8f4ff', cape: '#3a6ad0', flame: '#aef0ff' },
  { id: 'nature', name: 'FOREST DRAGON', desc: 'NATURE - RANGER KNIGHT', el: 'nature',
    horn: 'antler', wing: 'leaf', tail: 'leaf', helm: 'hood',
    pal: { B: '#4a9a3a', b: '#c8d870', d: '#24521c', E: '#ffe14d', W: '#3a3a18', m: '#78c25a', h: '#a87a4a',
      H: '#7a5030', V: '#2a1a0a', A: '#8a5a32', K: '#2a1a10', l: '#b8f070', v: '#2a5a22' },
    outline: '#e0ffc8', breath: ['#5ad02a', '#a8f05a', '#eaffc8'], deco: '#e8c860', cape: '#2a6a2a', flame: '#c8ff6a' },
  { id: 'light', name: 'GOLD DRAGON', desc: 'HOLY - PALADIN', el: 'light',
    horn: 'unicorn', wing: 'feather', tail: 'gem', helm: 'cross',
    pal: { B: '#e0b030', b: '#fff0b0', d: '#9a6a10', E: '#2a8aff', W: '#a07010', m: '#ffe080', h: '#ffffff',
      H: '#f4f4f4', V: '#3a3a4a', A: '#e8e8f0', G: '#ffd23f', f: '#fffbe8' },
    outline: '#fff8d8', breath: ['#ffd020', '#fff080', '#ffffff'], deco: '#ffffff', cape: '#3a5ad8', flame: '#fff6b0' },
  { id: 'dark', name: 'SHADOW DRAGON', desc: 'DARK - DEATH KNIGHT', el: 'dark',
    horn: 'many', wing: 'tattered', tail: 'spade', helm: 'horned',
    pal: { B: '#4a3a62', b: '#7a6a98', d: '#1e1430', E: '#ff3050', W: '#1a1024', m: '#5e3e82', h: '#d0c8e0',
      H: '#2e2a3a', V: '#100810', A: '#3a3448', R: '#ff2a3a' },
    outline: '#c8b8e8', breath: ['#8a4aff', '#c09aff', '#f0e4ff'], deco: '#c89bff', cape: '#8a1a2e', flame: '#b07aff' },
];

// 배경 단계: 지구 → 노을 → 핏빛 하늘 → 지옥 → 심층 지옥 → 심연 (어둡고 채도 낮게 유지)
const SCENES = [
  { name: 'GREEN EARTH', top: '#35608e', bot: '#6f95bb', specks: ['#5a80a8', '#8eb0d2', '#d8e8f6'], speed: 1.0,
    pal: { cloud: '#e8f0f8', cloudFar: '#a8c0dc' },
    spawns: [{ k: 'cloudFar', every: 2.2 }, { k: 'cloud', every: 2.4 }] },
  { name: 'SUNSET', top: '#3a2a52', bot: '#a8563a', specks: ['#5a3a5a', '#a0604a', '#ffd0a0'], speed: 1.0, flash: '#ff9a50',
    pal: { cloud: '#f0a080', cloudFar: '#9a6a7a' },
    spawns: [{ k: 'cloudFar', every: 2.2 }, { k: 'cloud', every: 2.6 }] },
  { name: 'BLOOD SKY', top: '#2a0c18', bot: '#6a1c14', specks: ['#4a1a1a', '#8a3a2a', '#ffb080'], speed: 1.1, flash: '#ff3a20',
    pal: { volcano: ['#1e0e10', '#3a1a16', '#ff6a20'], mountain: ['#1a0a10', '#2a121a', null], cloud: '#7a2a2a', ember: ['#ff8a30', '#ffd060'] },
    spawns: [{ k: 'volcano', every: 6 }, { k: 'mountain', every: 5 }, { k: 'cloud', every: 4 }, { k: 'ember', every: 0.35 }] },
  { name: 'INFERNO', top: '#1a0606', bot: '#3a0e08', specks: ['#3a1208', '#7a2a14', '#ff9a50'], speed: 1.2, flash: '#ff2010', lightning: 5,
    pal: { lava: ['#5a0a04', '#c83a0a', '#ffb030'], volcano: ['#1e0e10', '#3a1a16', '#ff6a20'], bones: ['#8a7a68', '#2a1a14'], ember: ['#ff8a30', '#ffd060'] },
    spawns: [{ k: 'lava', every: 3.5 }, { k: 'volcano', every: 9 }, { k: 'bones', every: 2.6 }, { k: 'ember', every: 0.14 }] },
  { name: 'DEEP HELL', top: '#12030a', bot: '#2c0710', specks: ['#2e0a10', '#6a1a20', '#ff7a5a'], speed: 1.3, flash: '#ff1030', lightning: 3.5,
    pal: { lava: ['#4a0606', '#b0280a', '#ff9020'], bones: ['#7a6a60', '#1a0a0a'], spikes: ['#3a0a10', '#6a1420'], ember: ['#ff6a30', '#ffb050'] },
    spawns: [{ k: 'lava', every: 2.8 }, { k: 'bones', every: 2 }, { k: 'spikes', every: 2.2 }, { k: 'ember', every: 0.1 }] },
  { name: 'ABYSS', top: '#0a0208', bot: '#1e0412', specks: ['#200818', '#5a1430', '#ff5a7a'], speed: 1.4, flash: '#c01060', lightning: 2.4,
    pal: { lava: ['#3a0410', '#a01830', '#ff6a40'], bones: ['#6a5a60', '#140810'], spikes: ['#2a0818', '#5a1030'], ember: ['#ff4a6a', '#ffa080'] },
    spawns: [{ k: 'lava', every: 3.2 }, { k: 'bones', every: 1.6 }, { k: 'spikes', every: 1.8 }, { k: 'ember', every: 0.08 }] },
];

const W = CONFIG.W;
const BEST_KEY = 'pixelStriker.best';
const MUTE_KEY = 'pixelStriker.muted';
const SKIN_KEY = 'pixelStriker.dragon';

// ===== 2. 유틸 =====
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const lerp = (a, b, t) => a + (b - a) * t;
function storeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function storeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 저장 불가 환경은 무시 */ } }
const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgbStr = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
const lerpRgb = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const shade = (c, f) => [clamp(c[0] * f, 0, 255), clamp(c[1] * f, 0, 255), clamp(c[2] * f, 0, 255)];
function newCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const hash2 = (x, y) => { const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return s - Math.floor(s); };
// 4x4 베이어 디더링 행렬 (도트 느낌의 그라데이션용)
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

// 화면 비율에 맞춰 내부 세로 해상도 결정 (긴 폰에서 위아래 검은 여백 줄이기)
const H = Math.round(clamp((W * window.innerHeight) / window.innerWidth, CONFIG.H, CONFIG.H_MAX));
const OY = Math.floor((H - CONFIG.H) / 2);   // 시작/게임오버 화면 세로 중앙 보정

const canvas = document.getElementById('game');
canvas.height = H;
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ===== 3. 픽셀 폰트 & 스프라이트 =====
// 3x5 도트 폰트: 각 행을 3비트로 표현 (4=왼쪽, 2=가운데, 1=오른쪽)
const FONT = {
  '0': [7, 5, 5, 5, 7], '1': [2, 6, 2, 2, 7], '2': [7, 1, 7, 4, 7], '3': [7, 1, 7, 1, 7], '4': [5, 5, 7, 1, 1],
  '5': [7, 4, 7, 1, 7], '6': [7, 4, 7, 5, 7], '7': [7, 1, 1, 1, 1], '8': [7, 5, 7, 5, 7], '9': [7, 5, 7, 1, 7],
  A: [2, 5, 7, 5, 5], B: [6, 5, 6, 5, 6], C: [3, 4, 4, 4, 3], D: [6, 5, 5, 5, 6], E: [7, 4, 6, 4, 7],
  F: [7, 4, 6, 4, 4], G: [3, 4, 5, 5, 3], H: [5, 5, 7, 5, 5], I: [7, 2, 2, 2, 7], J: [1, 1, 1, 5, 2],
  K: [5, 5, 6, 5, 5], L: [4, 4, 4, 4, 7], M: [5, 7, 7, 5, 5], N: [6, 5, 5, 5, 5], O: [2, 5, 5, 5, 2],
  P: [6, 5, 6, 4, 4], Q: [2, 5, 5, 6, 3], R: [6, 5, 6, 5, 5], S: [3, 4, 2, 1, 6], T: [7, 2, 2, 2, 2],
  U: [5, 5, 5, 5, 7], V: [5, 5, 5, 5, 2], W: [5, 5, 7, 7, 5], X: [5, 5, 2, 5, 5], Y: [5, 5, 2, 2, 2],
  Z: [7, 1, 2, 4, 7], ' ': [0, 0, 0, 0, 0], ':': [0, 2, 0, 2, 0], '-': [0, 0, 7, 0, 0], '!': [2, 2, 2, 0, 2],
  '.': [0, 0, 0, 0, 2], '+': [0, 2, 7, 2, 0], '/': [1, 1, 2, 4, 4], ',': [0, 0, 0, 2, 4],
};

function textWidth(str, scale = 1) { return (String(str).length * 4 - 1) * scale; }

// 도트 텍스트 출력 (align: left | center | right)
function drawText(str, x, y, color, scale = 1, align = 'left') {
  str = String(str).toUpperCase();
  const w = textWidth(str, scale);
  if (align === 'center') x -= Math.floor(w / 2);
  else if (align === 'right') x -= w;
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = color;
  for (let i = 0; i < str.length; i++) {
    const g = FONT[str[i]];
    if (!g) continue;
    for (let r = 0; r < 5; r++) {
      const bits = g[r];
      for (let c = 0; c < 3; c++) {
        if (bits & (4 >> c)) ctx.fillRect(x + (i * 4 + c) * scale, y + r * scale, scale, scale);
      }
    }
  }
}
// 그림자 있는 텍스트 (배경 위에서 잘 보이게)
function drawTextS(str, x, y, color, scale = 1, align = 'left') {
  drawText(str, x + scale, y + scale, '#000', scale, align);
  drawText(str, x, y, color, scale, align);
}
// 5x5 아이콘 (비트 16=왼쪽)
function drawIcon(bits, x, y, color) {
  ctx.fillStyle = color;
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) if (bits[r] & (16 >> c)) ctx.fillRect(x + c, y + r, 1, 1);
}

// 왼쪽 절반(가운데 열 포함)만 그리면 좌우 대칭으로 완성
function mirror(rows) {
  return rows.map((r) => r + r.slice(0, -1).split('').reverse().join(''));
}

// 문자열 배열 → 캔버스 스프라이트 (+피격 시 깜빡일 흰 실루엣)
// outline: 바로 바깥 1px 밝은 윤곽, outer: 그 바깥 1px 어두운 윤곽 (밝은/어두운 배경 모두에서 잘 보이게)
function makeSprite(rows, pal, outline, outer) {
  const sw = Math.max(...rows.map((r) => r.length)), sh = rows.length;
  if (rows.some((r) => r.length !== sw)) console.warn('sprite row width mismatch:', rows.join('|'));
  const pad = (outline ? 1 : 0) + (outer ? 1 : 0), w = sw + pad * 2, h = sh + pad * 2;
  // 0=빈칸, 1=본체, 2=밝은 윤곽, 3=어두운 윤곽
  const m = Array.from({ length: h }, () => new Uint8Array(w));
  rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (pal[row[x]]) m[y + pad][x + pad] = 1; });
  const grow = (from, to) => {
    const add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (m[y][x]) continue;
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) {
        const v = m[y + dy] && m[y + dy][x + dx];
        if (v && v <= from) { near = true; break; }
      }
      if (near) add.push(x, y);
    }
    for (let i = 0; i < add.length; i += 2) m[add[i + 1]][add[i]] = to;
  };
  if (outline) grow(1, 2);
  if (outer) grow(outline ? 2 : 1, 3);
  const img = newCanvas(w, h), white = newCanvas(w, h);
  const g = img.getContext('2d'), gw = white.getContext('2d');
  gw.fillStyle = '#ffffff';
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = m[y][x];
    if (!v) continue;
    g.fillStyle = v === 1 ? pal[rows[y - pad][x - pad]] : v === 2 ? outline : outer;
    g.fillRect(x, y, 1, 1);
    gw.fillRect(x, y, 1, 1);
  }
  return { img, white, w, h, colors: Object.values(pal) };
}

// 큰 스프라이트(보스)용: 좌우 대칭 도형(타원/선/사각)으로 도트 그리드를 그림
function gridArt(w, h, paint) {
  const g = Array.from({ length: h }, () => Array(w).fill('.'));
  const set = (x, y, c) => { x = Math.floor(x); y = Math.floor(y); if (x >= 0 && x < w && y >= 0 && y < h) g[y][x] = c; };
  const api = {
    px(x, y, c) { set(x, y, c); set(w - 1 - Math.floor(x), y, c); },
    ell(cx, cy, rx, ry, c) {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) api.px(x, y, c);
      }
    },
    line(x0, y0, x1, y1, c) {
      const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2) + 1;
      for (let i = 0; i <= n; i++) api.px(lerp(x0, x1, i / n), lerp(y0, y1, i / n), c);
    },
    rect(x, y, rw, rh, c) { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) api.px(x + i, y + j, c); },
  };
  paint(api);
  return g.map((r) => r.join(''));
}

// --- 3-1. 드래곤 + 기사 (부위 조립식) ---
// 왼쪽 절반 11칸(10번 = 가운데 열) x 20줄. 날개 → 몸통 → 뿔 → 꼬리 → 장식 → 기사 순서로 겹쳐 그림
const DRAGON_BODY = [
  '...........', '...........', '..........B', '.........BB', '........BEB',
  '........BBB', '.........dB', '.........BB', '........BBB', '.......BBbb',
  '.......BBbb', '.......BBbb', '.......dBBb', '........BBB', '.........BB',
  '.........dB', '..........B', '..........B', '...........', '...........',
];
const HORNS = {
  curl:    [[8, 4, 'h'], [7, 3, 'h'], [7, 2, 'h'], [8, 1, 'h']],                       // 말린 뿔
  spike:   [[8, 3, 'h'], [8, 2, 'h'], [8, 1, 'h'], [8, 0, 'h']],                       // 곧은 가시 뿔
  antler:  [[8, 3, 'h'], [7, 2, 'h'], [6, 1, 'h'], [7, 1, 'h'], [5, 0, 'h'], [7, 0, 'h']], // 사슴뿔
  unicorn: [[8, 3, 'h'], [7, 2, 'h'], [10, 1, 'h'], [10, 0, 'h']],                     // 외뿔 + 작은 뿔
  many:    [[7, 5, 'h'], [6, 5, 'h'], [7, 4, 'h'], [6, 3, 'h'], [8, 3, 'h'], [5, 2, 'h'], [8, 2, 'h']], // 가시 왕관 뿔
};
const TAILS = {
  flame:   [[10, 17, 'F'], [9, 18, 'e'], [10, 18, 'F'], [10, 19, 'e']],     // 불꽃 꼬리
  crystal: [[10, 17, 'i'], [9, 18, 'i'], [10, 18, 'B'], [10, 19, 'i']],     // 얼음 결정 꼬리
  leaf:    [[9, 17, 'l'], [9, 18, 'l'], [10, 18, 'l'], [10, 19, 'l']],      // 잎사귀 꼬리
  gem:     [[10, 17, 'h'], [9, 18, 'h'], [10, 18, 'E'], [10, 19, 'h']],     // 보석 고리 꼬리
  spade:   [[9, 17, 'd'], [8, 18, 'd'], [9, 18, 'd'], [10, 18, 'd'], [10, 19, 'd']], // 갈고리 꼬리
};
const KNIGHT = [[9, 8, 'H'], [10, 8, 'H'], [9, 9, 'H'], [10, 9, 'V'], [8, 10, 'A'], [9, 10, 'A'], [10, 10, 'A'], [9, 11, 'A'], [10, 11, 'A']];
const HELMS = {
  plume:  [[10, 7, 'P'], [10, 6, 'P']],                 // 깃털 장식 투구
  winged: [[8, 8, 'w'], [8, 7, 'w'], [7, 7, 'w']],      // 날개 투구
  hood:   [[10, 7, 'H'], [10, 9, 'K']],                 // 두건
  cross:  [[9, 6, 'G'], [10, 9, 'G']],                  // 성기사: 후광 + 십자 바이저
  horned: [[9, 7, 'h'], [8, 6, 'h'], [10, 9, 'R']],     // 뿔 투구 + 붉은 눈
};
const DECO_BACK = [[10, 14, 'g'], [10, 16, 'g'], [8, 10, 'g']];               // 진화2: 등 장식 + 금빛 견갑
const DECO_CAPE = [[8, 11, 'C'], [8, 12, 'C'], [9, 12, 'C'], [10, 12, 'C'], [9, 13, 'C'], [10, 13, 'C'], [10, 14, 'C']];
const DECO_CROWN = [[9, 7, 'g'], [10, 7, 'g'], [9, 6, 'g']];                 // 진화4: 왕관

// 날개는 삼각형(어깨-날개끝-뿌리)으로 계산해서 스킨별 모양 변형을 적용
const WING_TIPS = [[0.5, 2], [0, 9.5], [1.5, 17]];   // 프레임: 올림 / 수평 / 내림
function wingCells(style, frame, flameEdge) {
  const S = [8, 9], T = WING_TIPS[frame], R = [8, 13.5];
  const cross = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  const segDist = (a, b, p) => {
    const vx = b[0] - a[0], vy = b[1] - a[1], t = clamp(((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / (vx * vx + vy * vy), 0, 1);
    return [Math.hypot(p[0] - a[0] - vx * t, p[1] - a[1] - vy * t), t];
  };
  const out = [];
  for (let y = 0; y < 20; y++) for (let x = 0; x < 9; x++) {
    const p = [x + 0.5, y + 0.5];
    const c1 = cross(S, T, p), c2 = cross(T, R, p), c3 = cross(R, S, p);
    const inside = (c1 >= 0 && c2 >= 0 && c3 >= 0) || (c1 <= 0 && c2 <= 0 && c3 <= 0);
    const [boneD] = segDist(S, T, p);
    const [edgeD, t] = segDist(T, R, p);
    let ch = null;
    if (boneD < 0.75) ch = 'W';
    else if (inside) {
      ch = 'm';
      if (style === 'bat' && edgeD < 1.0 && t < 0.9 && (t * 4) % 1 > 0.4 && (t * 4) % 1 < 0.85) ch = null;  // 박쥐 날개 홈
      if (style === 'leaf') { if (edgeD < 1.0) ch = 'l'; if (segDist(S, [(T[0] + R[0]) / 2, (T[1] + R[1]) / 2], p)[0] < 0.5) ch = 'v'; }
      if (style === 'feather' && edgeD < 1.6 && Math.floor(t * 6) % 2 === 0) ch = 'f';
      if (style === 'tattered' && (hash2(x, y) < 0.18 || (edgeD < 1.2 && hash2(y, x) < 0.5))) ch = null;  // 찢어진 날개
    } else {
      if (style === 'crystal' && edgeD < 1.3 && t < 0.85 && (t * 5) % 1 < 0.35) ch = 'i';             // 얼음 가시
      if (style === 'feather' && edgeD < 1.1 && t < 0.9 && Math.floor(t * 6) % 2 === 0) ch = 'f';   // 깃털 끝
    }
    if (ch && flameEdge && ch !== 'W' && edgeD < 1.0) ch = 'F';   // 진화3: 날개 불꽃
    if (ch) out.push([x, y, ch]);
  }
  return out;
}
function buildDragon(sk, frame, tier) {
  const g = Array.from({ length: 20 }, () => Array(11).fill('.'));
  const put = (x, y, c) => { if (x >= 0 && x < 11 && y >= 0 && y < 20) g[y][x] = c; };
  for (const [x, y, c] of wingCells(sk.wing, frame, tier >= 3)) put(x, y, c);
  DRAGON_BODY.forEach((row, y) => { for (let x = 0; x < 11; x++) if (row[x] !== '.') put(x, y, row[x]); });
  HORNS[sk.horn].forEach(([x, y, c], i, a) => put(x, y, tier >= 1 && i >= a.length - 2 ? 'g' : c)); // 진화1: 뿔 장식
  TAILS[sk.tail].forEach(([x, y, c]) => put(x, y, c));
  if (tier >= 2) DECO_BACK.forEach(([x, y, c]) => put(x, y, c));
  if (tier >= 4) DECO_CAPE.forEach(([x, y, c]) => put(x, y, c));
  KNIGHT.forEach(([x, y, c]) => put(x, y, c));
  if (tier >= 2) put(8, 10, 'g');
  HELMS[sk.helm].forEach(([x, y, c]) => put(x, y, c));
  if (tier >= 4) DECO_CROWN.forEach(([x, y, c]) => put(x, y, c));
  return mirror(g.map((r) => r.join('')));
}
// 스킨 공통 팔레트 + 스킨별 장식 색
SKINS.forEach((s) => {
  s.fullPal = Object.assign({
    K: '#1a0a0a', w: '#ffffff', G: '#ffd23f', R: '#ff2a3a', i: '#e8fcff', l: '#b8f070', f: '#fff8d0', v: '#2a4a20',
  }, s.pal, { g: s.deco, C: s.cape, F: s.flame, e: s.breath[2] });
  s.cache = {};
});
// (스킨, 날개 프레임, 진화 단계)별 스프라이트 캐시
function dragonSprite(sk, frame, tier) {
  const key = frame * 10 + tier;
  return sk.cache[key] || (sk.cache[key] = makeSprite(buildDragon(sk, frame, tier), sk.fullPal, sk.outline));
}
const FLAP = [0, 1, 2, 1];
const EVOLVE_NAMES = ['', 'HORN CREST', 'GOLDEN ARMOR', 'FLAME WINGS', 'DRAGON KING'];

// --- 3-2. 악마 (밝은 윤곽 + 어두운 바깥 윤곽) ---
const SPR = {
  // 임프: 박쥐날개 작은 악마
  imp: makeSprite(mirror([
    '....h...',
    '....RRRR',
    'W...RYRR',
    'WW..RRRR',
    'WmW..RRR',
    'WmmWRRRR',
    '.WmmRrRR',
    '..WWRRRR',
    '.....R.r',
    '....RR.r',
    '.......r',
  ]), { R: '#e8382a', r: '#8a1a14', h: '#f0e0c0', Y: '#ffe14d', W: '#3a0a0a', m: '#a0281e' }, '#ffc8b0', '#1a0004'),

  // 박쥐 악마: 넓은 날개, 붉은 눈
  bat: makeSprite(mirror([
    'W.......h.',
    'WW......PP',
    'WmW....PYP',
    'WmmW..PPPP',
    'WmmmWPPPPP',
    '.WmmmmPPpP',
    '..WmWmWPPP',
    '...W.W..P.',
    '........P.',
  ]), { P: '#8a46c0', p: '#4a1a6a', W: '#1a0a24', m: '#6a3090', Y: '#ff3a3a', h: '#d8c8e8' }, '#e8d0ff', '#10001a'),

  // 마법사 악마: 두건 + 양손 불덩이
  mage: makeSprite(mirror([
    '..h.....',
    '...hKKKK',
    '....KKKK',
    '...KKYKK',
    '...KKKKK',
    '..RRRRRR',
    '.oRRRRRR',
    'oOoRRrRR',
    '.oRRRrRR',
    '..RRRrRR',
    '..RRrrRR',
    '.RRRrrRR',
    '.RRrrrRR',
    'RRr.rrRR',
    'Rr..r.rR',
  ]), { K: '#3a1a2a', R: '#2e7a52', r: '#1a4a32', Y: '#ffe14d', h: '#e0d0b0', o: '#ff7a1a', O: '#ffe08a' }, '#c8ffe0', '#00140a'),

  // 돌진 악마: 황소 뿔
  charger: makeSprite(mirror([
    'h.......',
    'hh......',
    '.hh.BBBB',
    '..hBBBBB',
    '...BBYBB',
    '...BBBBB',
    '...BBnnn',
    '.BBBBnKn',
    'BBBBBBBB',
    'BbBBBBBB',
    'B.BBbBBB',
    '..BB.BbB',
    '..d..d..',
  ]), { B: '#b05a1a', b: '#5a2a0a', h: '#f0e8d0', Y: '#ff2a2a', n: '#d88a4a', K: '#2a0a0a', d: '#2a1a0a' }, '#ffd8a8', '#1a0800'),

  // 대형 정예 악마
  elite: makeSprite(mirror([
    '...h..........',
    '...hh.........',
    '....hh...KKKKK',
    '.....hKKKRRRRR',
    'W.....KRRRRRRR',
    'WW...KRRYYRRRR',
    'WmW..KRRRRRRRR',
    'WmmW.KRRRrrrrr',
    'WmmmWKRRRrtrtr',
    'WmmmmWKRRRRRRR',
    '.WmmmmKRRRRRRR',
    '..WmmmKRRRRRRR',
    '...WmmKRRRrRRR',
    '....WWKRRRrRRR',
    '......KRRRRRRR',
    '......KRR.RRRR',
    '.....KRR...RRR',
    '.....KR....RR.',
    '.....hh.....hh',
  ]), { K: '#3a0a14', R: '#b8202e', r: '#5a0a14', Y: '#ffe14d', t: '#ffffff', W: '#2a0a10', m: '#7a1a24', h: '#f0e0c0' }, '#ffc0c8', '#140004'),

  heart: makeSprite(['.RR.RR.', 'RRRRRRR', 'RRRRRRR', '.RRRRR.', '..RRR..', '...R...'], { R: '#ff4a5a' }),
  heartEmpty: makeSprite(['.RR.RR.', 'RRRRRRR', 'RRRRRRR', '.RRRRR.', '..RRR..', '...R...'], { R: '#3a3550' }),
  speaker: makeSprite(['..W....', '.WW.W..', 'WWW..W.', 'WWW..W.', '.WW.W..', '..W....'], { W: '#c8d0e8' }),
  speakerOff: makeSprite(['..W....', '.WW.R.R', 'WWW..R.', 'WWW.R.R', '.WW....', '..W....'], { W: '#6a7090', R: '#ff4a5a' }),
};

// 적 탄 세트: 불덩이 / 마법구(2프레임 깜빡임) / 뼈 가시(8방향). 밝은 테두리 + 어두운 바깥 윤곽
// 지구 하늘에선 따뜻한 색, 붉은 지옥 배경에선 묻히지 않도록 파랑·흰색 세트를 사용
function makeBulletSet(c) {
  return {
    fire: [
      makeSprite(['.o.', 'oWo', '.o.'], { o: c.fire[0], W: c.fire[2] }, c.fire[1], c.outer),
      makeSprite(['.Y.', 'YWY', '.Y.'], { Y: c.fire[1], W: '#ffffff' }, c.fire[0], c.outer),
    ],
    magic: [
      makeSprite(['.M.', 'MWM', '.M.'], { M: c.magic[0], W: '#ffffff' }, c.magic[2], c.outer),
      makeSprite(['MmM', 'mWm', 'MmM'], { M: c.magic[0], m: c.magic[1], W: '#ffffff' }, c.magic[2], c.outer),
    ],
    spike: Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2, g = Array.from({ length: 5 }, () => Array(5).fill('.'));
      for (let k = -2; k <= 2; k++) g[Math.round(2 + Math.sin(a) * k)][Math.round(2 + Math.cos(a) * k)] = k === 2 ? 'W' : k === 1 ? 'R' : 'B';
      return makeSprite(g.map((r) => r.join('')), { B: c.spike[0], R: c.spike[1], W: '#ffffff' }, c.spike[2], c.outer);
    }),
    glow: c.glow, laser: c.laser,
  };
}
const BULLETS_WARM = makeBulletSet({
  fire: ['#ff3a10', '#ffb040', '#fff2a0'], magic: ['#ff2ad0', '#b0109a', '#ffc0f0'], spike: ['#f0e2c8', '#ff3a3a', '#ff9a9a'],
  outer: '#2a0004', glow: { fire: '#ff3a10', magic: '#ff2ad0', spike: '#ff3040' },
  laser: ['rgba(255,40,70,', '#ff6a9a'],
});
const BULLETS_COLD = makeBulletSet({
  fire: ['#2a9aff', '#9ae4ff', '#ffffff'], magic: ['#6a8aff', '#2a4ad8', '#e0e8ff'], spike: ['#ffffff', '#3ab0ff', '#b8e8ff'],
  outer: '#000a24', glow: { fire: '#3ab0ff', magic: '#7a9aff', spike: '#c8ecff' },
  laser: ['rgba(80,170,255,', '#9ad8ff'],
});
const bulletSet = () => (game.sceneIdx >= CONFIG.COLD_BULLETS_FROM_SCENE ? BULLETS_COLD : BULLETS_WARM);

// --- 3-3. 보스 4종 (대칭 도형으로 그린 거대 악마) ---
const BOSS_ART = {
  cerberus: gridArt(45, 30, (p) => {
    p.ell(22.5, 20, 13, 7.5, 'B'); p.ell(22.5, 22, 8, 4, 'b');                // 몸통, 배
    p.rect(9, 24, 3, 5, 'B'); p.rect(9, 28, 4, 1, 'S');                       // 앞발
    p.rect(15, 26, 3, 3, 'B'); p.rect(15, 28, 4, 1, 'S');
    p.ell(13, 14, 4.5, 4, 'B');                                               // 옆 목
    p.ell(8.5, 11, 5.5, 4.8, 'B'); p.ell(6.5, 14.5, 3, 2, 'b');               // 옆 머리 + 주둥이
    p.px(5, 14, 'D'); p.px(6, 16, 'T'); p.px(8, 16, 'T'); p.px(7, 17, 'F');
    p.px(7, 10, 'E'); p.px(10, 10, 'E');
    p.line(5, 8, 4, 5, 'B'); p.line(11, 8, 12, 5, 'B');                       // 귀
    p.line(10, 15, 16, 17, 'K'); p.px(12, 16, 'S'); p.px(15, 17, 'S');        // 가시 목줄
    p.ell(22.5, 9, 6.5, 6, 'B'); p.ell(22.5, 13.5, 4, 2.6, 'b');              // 가운데 머리
    p.px(22, 13, 'D'); p.px(20, 15, 'T'); p.px(22, 16, 'F'); p.px(21, 16, 'F');
    p.px(19, 7, 'E'); p.px(20, 7, 'E');
    p.line(17, 4, 16, 0, 'B');
    p.line(16, 15, 19, 16, 'K');
    p.line(16, 18, 14, 13, 'S');                                              // 등 가시
  }),
  succubus: gridArt(45, 30, (p) => {
    p.ell(10, 12, 10, 7, 'm'); p.ell(9, 20, 7, 4, 'm');                       // 날개
    p.ell(4, 19, 2.5, 2, '.'); p.ell(10, 24, 3, 1.5, '.');                    // 날개 홈
    p.line(20, 9, 1, 4, 'W'); p.line(20, 10, 0, 12, 'W'); p.line(20, 11, 3, 19, 'W'); p.line(20, 12, 9, 23, 'W');
    p.ell(22.5, 8, 5, 5.5, 'H');                                              // 머리카락
    p.ell(22.5, 17, 4, 7, 'P'); p.ell(22.5, 25, 7.5, 4.5, 'P'); p.ell(22.5, 26, 4, 3, 'p'); // 드레스
    p.line(19, 13, 15, 17, 's'); p.ell(14.5, 18, 1.8, 1.8, 'O');              // 팔 + 마법구
    p.ell(22.5, 7, 3.2, 3.6, 's');                                            // 얼굴
    p.px(21, 7, 'E'); p.px(22, 9, 'p');
    p.line(20, 4, 17, 0, 'h'); p.px(16, 1, 'h');                              // 뿔
    p.px(21, 3, 'G'); p.px(22, 2, 'G'); p.px(20, 3, 'G');                     // 왕관
    p.line(19, 16, 21, 16, 'G');
  }),
  giant: gridArt(45, 30, (p) => {
    p.line(18, 4, 16, 0, 'F'); p.line(20, 3, 19, 0, 'Y'); p.line(22, 3, 22, 0, 'F'); // 불꽃 머리칼
    p.ell(6.5, 16, 5, 8, 'R'); p.ell(6.5, 25, 5.5, 3.5, 'r');                  // 팔, 주먹
    p.line(5, 13, 8, 19, 'L'); p.px(6, 25, 'L');
    p.ell(22.5, 15, 13, 10, 'R'); p.ell(22.5, 22, 9, 5, 'r');                  // 몸통
    p.rect(15, 25, 5, 5, 'r');                                                 // 다리
    p.ell(22.5, 6, 6, 5, 'R');                                                 // 머리
    p.px(19, 6, 'E'); p.px(20, 6, 'E'); p.line(20, 9, 22, 9, 'L');
    p.ell(22.5, 15, 3, 3, 'L'); p.ell(22.5, 15, 1.5, 1.5, 'Y');                // 용암 심장
    p.line(14, 10, 18, 14, 'L'); p.line(12, 18, 17, 21, 'L'); p.line(18, 22, 20, 26, 'L'); // 용암 균열
  }),
  lord: gridArt(45, 30, (p) => {
    p.ell(22.5, 20, 15, 9.5, 'C'); p.ell(22.5, 24, 12, 6, 'c');               // 망토
    for (let x = 8; x < 22; x += 3) p.px(x, 29, 'C');
    p.ell(13, 12, 6, 4, 'A'); p.line(11, 9, 9, 5, 'S'); p.line(14, 9, 13, 5, 'S'); // 어깨 가시
    p.ell(22.5, 17, 7, 9, 'K'); p.ell(22.5, 14, 4, 3, 'A'); p.ell(22.5, 14, 1.5, 1.5, 'G'); // 갑옷 + 보석
    p.ell(14, 20, 2.5, 4, 'A'); p.px(13, 24, 'S'); p.px(15, 24, 'S');          // 건틀릿
    p.ell(22.5, 7, 4.5, 4.5, 'K'); p.px(20, 7, 'R'); p.px(21, 7, 'R');         // 투구 + 눈
    p.line(19, 4, 15, 1, 'h'); p.line(15, 1, 12, 3, 'h'); p.line(12, 3, 11, 6, 'h'); // 큰 뿔
    p.px(20, 2, 'g'); p.px(21, 2, 'g'); p.px(22, 1, 'g');                      // 왕관
  }),
};
// 보스 정의: pool = 단계/페이즈가 오를수록 앞에서부터 더 많이 쓰는 패턴 목록
const BOSS_DEFS = [
  { id: 'cerberus', name: 'CERBERUS', bullet: 'fire', minion: 'imp', mouths: [[-14, 2], [0, 0], [14, 2]],
    pool: ['fan', 'burst', 'dive', 'ring', 'spiral', 'summon'],
    pal: { D: '#2a0e0a', B: '#7a2c1c', b: '#b8582e', E: '#ffe14d', T: '#fff0d0', S: '#c8b8a8', F: '#ff7a1a', K: '#3a3a40' },
    outline: '#ffc8a0', outer: '#1a0400' },
  { id: 'succubus', name: 'SUCCUBUS QUEEN', bullet: 'magic', minion: 'bat', mouths: [[-9, 3], [9, 3]],
    pool: ['spiral', 'burst', 'summon', 'fan', 'laser', 'ring'],
    pal: { W: '#1e0a2a', m: '#6a2a8a', P: '#b03aa0', p: '#701e66', s: '#f0b8c8', H: '#3a103a', h: '#e8d8f0', G: '#ffd23f', E: '#ff3a8a', O: '#ff8af0' },
    outline: '#ffd0f4', outer: '#14001a' },
  { id: 'giant', name: 'FIRE GIANT', bullet: 'fire', minion: 'imp', mouths: [[0, -5], [-16, 10], [16, 10]],
    pool: ['ring', 'laser', 'fan', 'dive', 'burst', 'spiral'],
    pal: { R: '#4a2a22', r: '#2e1814', L: '#ff7a1a', Y: '#ffd040', F: '#ff4a10', E: '#fff0a0' },
    outline: '#ffb080', outer: '#140400' },
  { id: 'lord', name: 'DEMON LORD', bullet: 'spike', minion: 'bat', mouths: [[0, -2], [-12, 6], [12, 6]],
    pool: ['fan', 'laser', 'ring', 'summon', 'spiral', 'dive', 'burst'],
    pal: { C: '#7a0e1c', c: '#4a0812', K: '#24202c', A: '#4a4458', h: '#d8d0c0', R: '#ff2030', G: '#ff3ad0', g: '#ffd23f', S: '#8a8498' },
    outline: '#e0c8ff', outer: '#0a0010' },
];
BOSS_DEFS.forEach((d) => { d.spr = makeSprite(BOSS_ART[d.id], d.pal, d.outline, d.outer); });

// 스킬 코인: 스킬 색 원판 + 어두운 아이콘 + 흰 테두리 + 어두운 바깥 윤곽 (15x15)
function makeCoin(info) {
  const c = newCanvas(15, 15), g = c.getContext('2d');
  const base = hexRgb(info.color);
  for (let y = 0; y < 15; y++) for (let x = 0; x < 15; x++) {
    const d = Math.hypot(x - 7, y - 7);
    if (d <= 5.4) {
      const rim = d > 4.2, lit = (x + y) < 11;
      g.fillStyle = rgbStr(rim ? shade(base, lit ? 1.15 : 0.55) : shade(base, 0.95));
    } else if (d <= 6.4) g.fillStyle = '#ffffff';
    else if (d <= 7.4) g.fillStyle = '#140818';
    else continue;
    g.fillRect(x, y, 1, 1);
  }
  g.fillStyle = '#1a1028';
  for (let r = 0; r < 5; r++) for (let col = 0; col < 5; col++) if (info.icon[r] & (16 >> col)) g.fillRect(5 + col, 5 + r, 1, 1);
  g.fillStyle = '#ffffff'; g.fillRect(4, 4, 1, 1);
  return c;
}
const COIN_IMG = {};
for (const k in SKILL_INFO) COIN_IMG[k] = makeCoin(SKILL_INFO[k]);

function drawSprite(spr, x, y, white = false) {
  ctx.drawImage(white ? spr.white : spr.img, Math.round(x - spr.w / 2), Math.round(y - spr.h / 2));
}

// --- 3-4. 배경 요소 절차적 생성 (지구: 들판/숲/산/구름, 지옥: 화산/용암/뼈/가시) ---
function genField(p) {
  const w = rand(30, 56) | 0, h = rand(20, 34) | 0, cv = newCanvas(w, h), g = cv.getContext('2d');
  let x = 0;
  while (x < w) {
    const sw = Math.min(w - x, rand(8, 20) | 0), c = hexRgb(pick(p.field));
    for (let y = 0; y < h; y++) {
      g.fillStyle = rgbStr(shade(c, y % 3 === 0 ? 0.85 : 1));   // 밭고랑
      g.fillRect(x, y, sw, 1);
    }
    g.fillStyle = rgbStr(shade(c, 0.7)); g.fillRect(x, 0, 1, h);
    x += sw;
  }
  // 가장자리를 들쭉날쭉하게 깎아 자연스러운 땅 조각으로
  for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
    const ex = Math.min(xx, w - 1 - xx), ey = Math.min(y, h - 1 - y);
    if (Math.min(ex, ey) < 3 * hash2(xx * 0.3 | 0, y * 0.3 | 0) + (ex + ey < 5 ? 2 : 0)) g.clearRect(xx, y, 1, 1);
  }
  return cv;
}
function genForest(p) {
  const w = rand(26, 44) | 0, h = rand(18, 30) | 0, cv = newCanvas(w, h), g = cv.getContext('2d');
  const n = (w * h / 30) | 0;
  for (let i = 0; i < n; i++) {
    const r = rand(2, 4), cx = rand(r, w - r), cy = rand(r, h - r);
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      if (x * x + y * y > r * r) continue;
      g.fillStyle = x + y > 0 ? p.forest[0] : x + y < -r ? p.forest[2] : p.forest[1];
      g.fillRect((cx + x) | 0, (cy + y) | 0, 1, 1);
    }
  }
  return cv;
}
function genMountain(p) {
  const w = rand(34, 60) | 0, h = rand(20, 32) | 0, cv = newCanvas(w, h), g = cv.getContext('2d'), ph = rand(0, 6);
  for (let y = 0; y < h; y++) {
    const hw = (y / h) * w / 2 + Math.sin(y * 0.9 + ph) * 1.2;
    for (let x = Math.round(w / 2 - hw); x <= Math.round(w / 2 + hw); x++) {
      const snow = p.mountain[2] && y < h * 0.3 && BAYER[(y & 3) * 4 + (x & 3)] < 1 - y / (h * 0.3);
      g.fillStyle = snow ? p.mountain[2] : x < w / 2 ? p.mountain[1] : p.mountain[0];
      g.fillRect(x, y, 1, 1);
    }
  }
  return cv;
}
function genCloud(p, far = false) {
  const w = (far ? rand(18, 34) : rand(28, 50)) | 0, h = (far ? rand(8, 13) : rand(12, 20)) | 0, cv = newCanvas(w, h), g = cv.getContext('2d');
  const c = hexRgb(far ? p.cloudFar : p.cloud);
  const blobs = Array.from({ length: 5 }, () => [rand(w * 0.2, w * 0.8), rand(h * 0.4, h * 0.7), rand(4, Math.min(9, h / 2))]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!blobs.some(([bx, by, r]) => (x - bx) ** 2 + (y - by) ** 2 <= r * r)) continue;
    g.fillStyle = rgbStr(shade(c, y > h * 0.6 ? 0.82 : 1));
    g.fillRect(x, y, 1, 1);
  }
  return cv;
}
function genVolcano(p) {
  const w = rand(30, 48) | 0, h = rand(22, 32) | 0, cv = newCanvas(w, h), g = cv.getContext('2d');
  for (let y = 0; y < h; y++) {
    const hw = 3 + (y / h) * (w / 2 - 3);
    for (let x = Math.round(w / 2 - hw); x <= Math.round(w / 2 + hw); x++) {
      g.fillStyle = x < w / 2 ? p.volcano[1] : p.volcano[0];
      g.fillRect(x, y, 1, 1);
    }
  }
  g.fillStyle = p.volcano[2];
  g.fillRect((w / 2 - 3) | 0, 0, 7, 1);                    // 분화구
  for (let k = 0; k < 3; k++) {                             // 흘러내리는 용암
    let x = w / 2 + rand(-2, 2);
    for (let y = 1; y < h * rand(0.4, 0.8); y++) { x += rand(-0.6, 0.6); if (BAYER[(y & 3) * 4 + 1] < 0.8) g.fillRect(x | 0, y, 1, 1); }
  }
  return cv;
}
function genLava(p) {
  const w = W + 20, h = rand(14, 24) | 0, cv = newCanvas(w, h), g = cv.getContext('2d'), ph = rand(0, 6), ph2 = rand(0, 6);
  for (let x = 0; x < w; x++) {
    const cy = h / 2 + Math.sin(x * 0.07 + ph) * h * 0.25, th = 3 + Math.sin(x * 0.11 + ph2) * 1.2;
    for (let y = 0; y < h; y++) {
      const d = Math.abs(y - cy);
      if (d > th + 1) continue;
      g.fillStyle = d > th ? p.lava[0] : d < th * 0.4 && hash2(x, y) < 0.5 ? p.lava[2] : p.lava[1];
      g.fillRect(x, y, 1, 1);
    }
  }
  return cv;
}
const BONE_SHAPES = [
  ['.BBB.', 'BKBKB', 'BBBBB', '.B.B.'],                         // 해골
  ['B...B', '.BBB.', '.BBB.', 'B...B'],                         // 엇갈린 뼈
  ['..B..', 'BBBBB', '..B..', 'BBBBB', '..B..', '.BBB.'],       // 갈비뼈
];
function genBones(p) {
  const shp = pick(BONE_SHAPES), cv = newCanvas(shp[0].length, shp.length), g = cv.getContext('2d');
  shp.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] !== '.') { g.fillStyle = row[x] === 'K' ? p.bones[1] : p.bones[0]; g.fillRect(x, y, 1, 1); } });
  return cv;
}
function genSpikes(p) {
  const w = rand(16, 28) | 0, h = rand(10, 16) | 0, cv = newCanvas(w, h), g = cv.getContext('2d');
  for (let k = 0; k < 4; k++) {
    const bx = rand(2, w - 2), bh = rand(h * 0.5, h), bw = rand(1.5, 3);
    for (let y = 0; y < bh; y++) {
      const hw = (y / bh) * bw;
      for (let x = Math.round(bx - hw); x <= Math.round(bx + hw); x++) {
        g.fillStyle = x < bx ? p.spikes[1] : p.spikes[0];
        g.fillRect(x, h - bh + y, 1, 1);
      }
    }
  }
  return cv;
}
const DECO_GEN = { cloudFar: (p) => genCloud(p, true), field: genField, forest: genForest, mountain: genMountain, cloud: genCloud, volcano: genVolcano, lava: genLava, bones: genBones, spikes: genSpikes };
// 배경 요소 near(가까운 층) 여부 / 투명도
const DECO_INFO = {
  field: { near: false, alpha: 0.5 }, forest: { near: false, alpha: 0.8 }, mountain: { near: false, alpha: 0.75 },
  cloud: { near: true, alpha: 0.5 }, cloudFar: { near: false, alpha: 0.35 }, volcano: { near: false, alpha: 0.8 }, lava: { near: false, alpha: 0.55 },
  bones: { near: true, alpha: 0.55 }, spikes: { near: true, alpha: 0.7 },
};
const decoCache = {};
function decoImage(si, kind) {
  const key = si + kind;
  if (!decoCache[key]) decoCache[key] = Array.from({ length: 4 }, () => DECO_GEN[kind](SCENES[si].pal));
  return pick(decoCache[key]);
}
SCENES.forEach((s) => { s.topRgb = hexRgb(s.top); s.botRgb = hexRgb(s.bot); s.speckRgb = s.specks.map(hexRgb); });

// ===== 4. 사운드 (Web Audio로 8비트 효과음 생성) =====
const Sound = {
  ctx: null, master: null, noiseBuf: null,
  muted: storeGet(MUTE_KEY) === '1',
  lastPlay: {},

  // 모바일은 사용자 터치 이후에만 오디오가 켜지므로 첫 입력 때 호출
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.45;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 0.6;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  },
  toggle() {
    this.muted = !this.muted;
    storeSet(MUTE_KEY, this.muted ? '1' : '0');
  },
  // 같은 소리가 너무 촘촘히 겹치지 않게 최소 간격 제한
  ok(name, gap) {
    if (!this.ctx || this.muted) return false;
    const t = this.ctx.currentTime;
    if (this.lastPlay[name] && t - this.lastPlay[name] < gap) return false;
    this.lastPlay[name] = t;
    return true;
  },
  tone(type, f0, f1, dur, vol, delay = 0) {
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol, freq, delay = 0) {
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    src.buffer = this.noiseBuf;
    f.type = 'lowpass';
    f.frequency.setValueAtTime(freq, t);
    f.frequency.exponentialRampToValueAtTime(80, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur);
  },
  // 속성별 브레스 소리
  breath(el) {
    if (!this.ok('breath', 0.06)) return;
    if (el === 'fire') this.noise(0.06, 0.08, 3000);
    else if (el === 'ice') this.tone('triangle', 1800, 1200, 0.05, 0.04);
    else if (el === 'nature') this.tone('triangle', 900, 700, 0.05, 0.04);
    else if (el === 'light') this.tone('square', 1600, 2400, 0.04, 0.03);
    else this.tone('sawtooth', 300, 200, 0.05, 0.035);
  },
  enemyShot() { if (this.ok('eshot', 0.08)) this.tone('square', 500, 300, 0.06, 0.03); },
  hitTick() { if (this.ok('tick', 0.05)) this.tone('square', 260, 180, 0.03, 0.04); },
  explode(big) {
    if (!this.ok(big ? 'bigboom' : 'boom', big ? 0.1 : 0.04)) return;
    this.noise(big ? 0.9 : 0.3, big ? 0.6 : 0.34, big ? 1200 : 2600);
    this.tone('square', big ? 140 : 260, 40, big ? 0.6 : 0.16, 0.08);
  },
  coin() { if (this.ok('coin', 0.05)) { this.tone('square', 988, null, 0.06, 0.08); this.tone('square', 1319, null, 0.1, 0.08, 0.06); } },
  // 스킬마다 다른 상승 아르페지오
  powerup(kind) {
    if (!this.ok('power', 0.05)) return;
    const base = { rate: 660, spread: 523, damage: 440, pierce: 587, score: 784 }[kind] || 523;
    [1, 1.25, 1.5, 2].forEach((m, i) => this.tone('square', base * m, null, 0.09, 0.09, i * 0.06));
    this.tone('triangle', base * 2, base * 3, 0.3, 0.08, 0.24);
  },
  evolve() {
    if (!this.ok('evolve', 0.5)) return;
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone('square', f, null, 0.12, 0.08, i * 0.08));
    this.tone('triangle', 1047, 2093, 0.6, 0.1, 0.5);
  },
  locked() { if (this.ok('locked', 0.2)) { this.tone('square', 330, null, 0.08, 0.06); this.tone('square', 262, null, 0.12, 0.06, 0.08); } },
  hurt() {
    if (!this.ok('hurt', 0.1)) return;
    this.tone('sawtooth', 320, 50, 0.35, 0.18);
    this.noise(0.3, 0.3, 1500);
  },
  roar() { if (this.ok('roar', 0.5)) { this.tone('sawtooth', 120, 60, 0.8, 0.16); this.noise(0.8, 0.3, 600); } },
  laser() { if (this.ok('laser', 0.2)) this.tone('sawtooth', 220, 880, 0.4, 0.08); },
  warning() {
    if (!this.ok('warn', 0.5)) return;
    for (let i = 0; i < 3; i++) this.tone('square', 220, 180, 0.3, 0.08, i * 0.45);
  },
  thunder() { if (this.ok('thunder', 0.5)) this.noise(0.5, 0.12, 500); },
  select() { if (this.ok('select', 0.04)) this.tone('square', 880, 1320, 0.06, 0.07); },
  wave() { if (this.ok('wave', 0.3)) { this.tone('triangle', 523, null, 0.1, 0.15); this.tone('triangle', 784, null, 0.18, 0.15, 0.1); } },
  start() { if (this.ok('start', 0.3)) [523, 659, 784, 1047].forEach((f, i) => this.tone('square', f, null, 0.08, 0.07, i * 0.07)); },
};

// ===== 5. 오브젝트 풀 (생성/GC 비용을 줄이기 위해 객체 재사용) =====
class Pool {
  constructor(factory) { this.factory = factory; this.active = []; this.free = []; }
  spawn() {
    const o = this.free.pop() || this.factory();
    this.active.push(o);
    return o;
  }
  // fn이 false를 반환하면 해당 객체를 풀로 반납 (뒤에서부터 순회 + swap-remove)
  update(fn) {
    const a = this.active;
    for (let i = a.length - 1; i >= 0; i--) {
      if (!fn(a[i])) {
        this.free.push(a[i]);
        a[i] = a[a.length - 1];
        a.pop();
      }
    }
  }
  clear() { while (this.active.length) this.free.push(this.active.pop()); }
}

const bullets = new Pool(() => ({ hit: [] }));   // 내 브레스
const enemyBullets = new Pool(() => ({}));       // 적 탄
const enemies = new Pool(() => ({}));            // 악마 + 보스
const coins = new Pool(() => ({}));
const particles = new Pool(() => ({}));
const rings = new Pool(() => ({}));              // 원형 충격파/강화 링
const texts = new Pool(() => ({}));              // 떠오르는 글자
const decos = new Pool(() => ({}));              // 배경 요소
const lasers = [];                               // 보스 레이저 (경고선 → 발사)

// ===== 6. 게임 로직 =====
const game = {
  state: 'title',          // title | play | over
  time: 0, wave: 1, score: 0,
  best: parseInt(storeGet(BEST_KEY), 10) || 0,
  spawnT: 0, bossCount: 0, warningT: 0, boss: null, nextBoss: null, warnPlayed: false,
  shake: 0, shakeMag: 0, banner: '', sub: '', bannerT: 0, overT: 0, newRecord: false, clock: 0,
  skillText: '', skillColor: '#fff', skillT: 0, evolveT: 0, lastCoin: -99,
  purgeBullets: false,
  // 배경 단계 보간 상태
  timeScale: 1, slowmo: 0, evolveFx: null,   // 진화 슬로모션 / 연출
  sceneIdx: 0, sceneT: 1, sceneFrom: null, decoTimers: [], flash: null, lightning: null, lightningT: 0,
};

let skinIdx = clamp(SKINS.findIndex((s) => s.id === storeGet(SKIN_KEY)), 0, SKINS.length - 1);
const skin = () => SKINS[skinIdx];

const player = {
  x: W / 2, y: H - 40, hp: CONFIG.PLAYER_HP, invuln: 0, fireT: 0, alive: true, muzzle: 0, powerT: 0, tier: 0,
  skills: { rate: 0, spread: 0, damage: 0, pierce: 0 },
  coinProg: { rate: 0, spread: 0, damage: 0, pierce: 0, orb: 0 },   // 다음 강화까지 모은 코인
  orb: 0, orbAngle: 0,            // 수호 구체 레벨 / 회전 각도
};

// 별(먼지) 패럴랙스 3겹. 색은 배경 단계에서 보간
const STAR_LAYERS = [
  { n: 30, speed: 10 }, { n: 18, speed: 24 }, { n: 8, speed: 50 },
].map((l) => ({ ...l, stars: Array.from({ length: l.n }, () => ({ x: rand(0, W) | 0, y: rand(0, H) })) }));

// 시작/게임오버 화면 버튼 영역 (내부 좌표)
const UI = {
  left: { x: 6, y: 93 + OY, w: 28, h: 40 },
  right: { x: W - 34, y: 93 + OY, w: 28, h: 40 },
  thumbs: SKINS.map((s, i) => ({ x: 7 + i * 34, y: 180 + OY, w: 30, h: 28 })),
  start: { x: W / 2 - 46, y: 216 + OY, w: 92, h: 24 },
  retry: { x: W / 2 - 62, y: 216 + OY, w: 58, h: 22 },
  menu: { x: W / 2 + 4, y: 216 + OY, w: 58, h: 22 },
};
const preview = { beams: [], fireT: 0 };   // 드래곤 선택 미리보기 브레스
const arrowPress = { l: -1, r: -1 };

const speedMul = () => 1 + CONFIG.ENEMY_SPEED_UP * (game.wave - 1);
// 적 체력은 웨이브마다 조금씩이 아니라 ENEMY_HP_STEP_WAVES마다 한 단계씩 오름
const hpMul = () => 1 + CONFIG.ENEMY_HP_STEP * Math.floor((game.wave - 1) / CONFIG.ENEMY_HP_STEP_WAVES);
const enemyBulletSpeed = () =>
  Math.min(CONFIG.ENEMY_BULLET_SPEED_MAX, CONFIG.ENEMY_BULLET_SPEED + CONFIG.ENEMY_BULLET_SPEED_UP * (game.wave - 1));
const fireInterval = () => CONFIG.FIRE_INTERVAL - CONFIG.FIRE_INTERVAL_STEP * player.skills.rate;
const beamDamage = () => CONFIG.BEAM_DAMAGE + CONFIG.BEAM_DAMAGE_STEP * player.skills.damage;
const totalPower = () => SKILL_ORDER.reduce((s, k) => s + player.skills[k], 0);
const powerCap = () => CONFIG.POWER_CAP_BY_BOSS[Math.min(game.bossCount, CONFIG.POWER_CAP_BY_BOSS.length - 1)];
const tierFor = (total) => CONFIG.EVOLVE_AT.filter((t) => total >= t).length;
const sceneForWave = (w) => { let s = 0; CONFIG.SCENE_WAVES.forEach((sw, i) => { if (w >= sw) s = i; }); return s; };

function resetGame() {
  Object.assign(game, {
    state: 'play', time: 0, wave: 1, score: 0, spawnT: 1, bossCount: 0, warningT: 0, boss: null, nextBoss: null, warnPlayed: false,
    shake: 0, overT: 0, newRecord: false, purgeBullets: false, skillT: 0, evolveT: 0, lastCoin: -99, lightning: null,
  });
  Object.assign(player, { x: W / 2, y: H - 40, hp: CONFIG.PLAYER_HP, invuln: 0, fireT: 0.2, alive: true, muzzle: 0, powerT: 0, tier: 0 });
  player.skills = { rate: 0, spread: 0, damage: 0, pierce: 0 };
  player.coinProg = { rate: 0, spread: 0, damage: 0, pierce: 0, orb: 0 };
  player.orb = 0; player.orbAngle = 0;
  game.timeScale = 1; game.slowmo = 0; game.evolveFx = null;
  input.tx = player.x; input.ty = player.y;
  [bullets, enemyBullets, enemies, coins, particles, rings, texts].forEach((p) => p.clear());
  lasers.length = 0;
  setScene(0);
  showBanner('WAVE 1', SCENES[0].name);
  Sound.start();
}

function showBanner(text, sub = '') { game.banner = text; game.sub = sub; game.bannerT = 1.8; }
function showSkill(text, color) { game.skillText = text; game.skillColor = color; game.skillT = CONFIG.SKILL_BANNER_TIME; }
function shake(t, mag) {
  if (game.shake <= 0) game.shakeMag = 0;
  game.shake = Math.max(game.shake, t);
  game.shakeMag = Math.max(game.shakeMag, mag);
}
function popText(x, y, str, color) {
  const t = texts.spawn();
  t.x = clamp(x, textWidth(str) / 2 + 2, W - textWidth(str) / 2 - 2);
  t.y = y; t.str = str; t.color = color; t.life = 1;
}

// 파티클 (g: 세로 가속도, 음수면 위로 떠오름 — 연기/불씨)
function explode(x, y, colors, n, speed, size = 2, g = 0, life = 1) {
  for (let i = 0; i < n; i++) {
    const p = particles.spawn();
    const a = Math.random() * Math.PI * 2, s = rand(0.25, 1) * speed;
    p.x = x + rand(-2, 2); p.y = y + rand(-2, 2);
    p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s; p.g = g;
    p.life = p.max = rand(0.3, 0.8) * life;
    p.color = Math.random() < 0.2 ? '#ffffff' : pick(colors);
    p.size = 1 + ((Math.random() * size) | 0);
  }
}
// 악마 사망: 불꽃 + 떠오르는 연기
function demonBurst(e, scale = 1) {
  explode(e.x, e.y, ['#ff6a10', '#ffb030', '#ff2a10', ...e.spr.colors.slice(0, 2)], Math.round(CONFIG.DEATH_PARTICLES * scale), 50 * Math.sqrt(scale), 2);
  explode(e.x, e.y, ['#4a4048', '#6a6070', '#3a3038'], Math.round(4 * scale), 20, 2, -40, 1.2);
}
// 원형 충격파 링 (follow=true면 드래곤을 따라다님)
function ring(x, y, color, maxR, life, follow = false, delay = 0) {
  const r = rings.spawn();
  r.x = x; r.y = y; r.color = color; r.maxR = maxR; r.life = r.max = life; r.follow = follow; r.delay = delay;
}

// --- 배경 단계 ---
function sceneColors() {
  const to = SCENES[game.sceneIdx], f = game.sceneFrom;
  const t = game.sceneT * game.sceneT * (3 - 2 * game.sceneT);   // smoothstep
  if (!f || t >= 1) return { top: to.topRgb, bot: to.botRgb, specks: to.speckRgb, speed: to.speed };
  return {
    top: lerpRgb(f.top, to.topRgb, t), bot: lerpRgb(f.bot, to.botRgb, t),
    specks: f.specks.map((c, i) => lerpRgb(c, to.speckRgb[i], t)), speed: lerp(f.speed, to.speed, t),
  };
}
function setScene(idx) {
  if (idx === game.sceneIdx && game.sceneT >= 1 && game.sceneFrom) return;
  const changed = idx !== game.sceneIdx;
  game.sceneFrom = sceneColors();
  game.sceneIdx = idx;
  game.sceneT = 0;
  game.decoTimers = SCENES[idx].spawns.map((s) => s.every * rand(0.1, 0.5));
  game.lightningT = rand(1, 3);
  if (changed && SCENES[idx].flash && game.state === 'play') {     // 전환 화면 효과
    game.flash = { color: SCENES[idx].flash, t: 1 };
    shake(0.4, 2);
  }
}
function spawnDeco(si, kind, y) {
  const d = decos.spawn(), sp = SCENES[si].speed;
  d.kind = kind; d.si = si; d.img = null; d.fade = y !== undefined && y > 0 ? 1 : 0;
  if (kind === 'ember') {
    // 불씨: 아래에서 위로 떠오름
    d.layer = 1; d.x = rand(0, W); d.w = 1; d.h = 2; d.len = Math.random() < 0.3 ? 2 : 1;
    d.vy = -rand(18, 45); d.vx = rand(-6, 6); d.alpha = rand(0.5, 0.9);
    d.color = pick(SCENES[si].pal.ember);
    d.y = y !== undefined ? y : H + 2;
    return;
  }
  const info = DECO_INFO[kind];
  d.img = decoImage(si, kind); d.w = d.img.width; d.h = d.img.height;
  d.layer = info.near ? 1 : 0;
  d.x = kind === 'lava' ? W / 2 : rand(-d.w / 4, W + d.w / 4);
  d.vy = (info.near ? rand(34, 50) : rand(14, 20)) * sp;
  d.vx = 0; d.alpha = info.alpha;
  d.y = y !== undefined ? y : -d.h / 2 - 2;
}
function updateBackground(dt) {
  if (game.sceneT < 1) game.sceneT = Math.min(1, game.sceneT + dt / CONFIG.THEME_FADE);
  const sc = SCENES[game.sceneIdx], tc = sceneColors();
  const boost = game.boss || game.warningT > 0 ? 1.4 : 1;
  for (const l of STAR_LAYERS) for (const s of l.stars) {
    s.y += l.speed * tc.speed * boost * dt;
    if (s.y >= H) { s.y -= H; s.x = rand(0, W) | 0; }
  }
  sc.spawns.forEach((spec, i) => {
    game.decoTimers[i] -= dt;
    if (game.decoTimers[i] <= 0) { game.decoTimers[i] = spec.every * rand(0.7, 1.3); spawnDeco(game.sceneIdx, spec.k); }
  });
  decos.update((d) => {
    d.y += d.vy * (d.kind === 'ember' ? 1 : boost) * dt; d.x += d.vx * dt;
    // 현재 단계 요소는 서서히 나타나고, 이전 단계 요소는 서서히 사라짐
    if (d.si === game.sceneIdx) d.fade = Math.min(1, d.fade + dt);
    else if ((d.fade -= dt / CONFIG.THEME_FADE) <= 0) return false;
    return d.kind === 'ember' ? d.y > -4 : d.y - d.h / 2 < H;
  });
  // 붉은 번개
  if (sc.lightning) {
    game.lightningT -= dt;
    if (game.lightningT <= 0) {
      game.lightningT = sc.lightning * rand(0.6, 1.4);
      const pts = []; let x = rand(20, W - 20), y = 0;
      const end = rand(H * 0.3, H * 0.7);
      while (y < end) { pts.push(x | 0, y | 0); y += rand(6, 14); x += rand(-10, 10); }
      game.lightning = { pts, t: 0.3 };
      Sound.thunder();
    }
  }
  if (game.lightning && (game.lightning.t -= dt) <= 0) game.lightning = null;
  if (game.flash && (game.flash.t -= dt) <= 0) game.flash = null;
}

// --- 플레이어 ---
function updatePlayer(dt) {
  const p = player;
  if (!p.alive) return;
  let kx = 0, ky = 0;
  if (keys.left) kx--; if (keys.right) kx++;
  if (keys.up) ky--; if (keys.down) ky++;
  if (kx || ky) {
    const len = Math.hypot(kx, ky);
    p.x += (kx / len) * CONFIG.PLAYER_KEY_SPEED * dt;
    p.y += (ky / len) * CONFIG.PLAYER_KEY_SPEED * dt;
  } else if (input.active) {
    const k = Math.min(1, CONFIG.PLAYER_FOLLOW * dt);
    p.x += (input.tx - p.x) * k;
    p.y += (input.ty - p.y) * k;
  }
  p.x = clamp(p.x, 8, W - 8);
  p.y = clamp(p.y, 34, H - 10);
  if (p.invuln > 0) p.invuln -= dt;
  if (p.muzzle > 0) p.muzzle -= dt;
  if (p.powerT > 0) p.powerT -= dt;
  // 최종 진화 오라: 몸 주위로 빛 입자
  if (p.tier >= 4 && Math.random() < dt * 14) {
    const a = rand(0, Math.PI * 2);
    explode(p.x + Math.cos(a) * 11, p.y + Math.sin(a) * 11, [skin().breath[1], skin().deco], 1, 8, 1, -30, 1.2);
  }

  // 자동 브레스 (남은 시간을 누적해 고레벨 발사속도가 프레임 단위로 깎이지 않게)
  p.fireT -= dt;
  if (p.fireT <= 0) {
    p.fireT = Math.max(0, p.fireT + fireInterval());
    firePlayer();
  }
}

// 브레스 갈래 패턴 (spread 레벨 0~3): dx = 가로 오프셋, a = 각도
const SPREAD_PATTERNS = [
  [{ dx: 0, a: 0 }],
  [{ dx: -3, a: 0 }, { dx: 3, a: 0 }],
  [{ dx: -5, a: 0 }, { dx: 0, a: 0 }, { dx: 5, a: 0 }],
  [{ dx: 0, a: -0.3 }, { dx: -2, a: -0.14 }, { dx: 0, a: 0 }, { dx: 2, a: 0.14 }, { dx: 0, a: 0.3 }],
];

// 스킬 레벨 → 브레스 외형/성능 (코인 → 레벨 → 매 발사마다 여기서 읽음)
function firePlayer() {
  const s = player.skills, sk = skin();
  const dmg = beamDamage();
  for (const pt of SPREAD_PATTERNS[s.spread]) {
    const b = bullets.spawn();
    b.x = player.x + pt.dx; b.y = player.y - 10;
    b.vx = Math.sin(pt.a) * CONFIG.BEAM_SPEED;
    b.vy = -Math.cos(pt.a) * CONFIG.BEAM_SPEED;
    b.dmg = dmg;
    b.pierce = s.pierce; b.pierceLv = s.pierce;
    b.hit.length = 0;
    b.el = sk.el; b.colors = sk.breath; b.seed = (Math.random() * 8) | 0;
    b.wid = CONFIG.BEAM_WIDTH_BY_DAMAGE[s.damage];
    b.len = CONFIG.BEAM_LEN_BY_PIERCE[s.pierce];
    b.glow = s.damage >= 3;
  }
  player.muzzle = 0.06;
  Sound.breath(sk.el);
}

function hitPlayer() {
  if (player.invuln > 0 || game.state !== 'play') return;
  player.hp--;
  player.invuln = CONFIG.INVULN_TIME;
  shake(CONFIG.HURT_SHAKE, CONFIG.HURT_SHAKE_MAG);
  game.hurtT = CONFIG.HURT_FLASH;                                       // 붉은 섬광
  game.slowmo = CONFIG.HURT_HITSTOP; game.slowmoScale = 0.1;            // 히트스톱
  game.purgeBullets = true;           // 피격 시 화면의 적 탄 제거 (숨 돌릴 틈)
  explode(player.x, player.y, ['#ffffff', ...skin().breath], 14, 50);
  ring(player.x, player.y, '#ff4a5a', 26, 0.45);
  ring(player.x, player.y, '#ffffff', 16, 0.3, false, 0.08);
  Sound.hurt();
  if (player.hp <= 0) gameOver();
}

function gameOver() {
  game.state = 'over';
  game.overT = 0;
  player.alive = false;
  input.active = false;
  lasers.length = 0;
  explode(player.x, player.y, ['#ffffff', ...skin().breath, skin().pal.B], 50, 70, 3);
  ring(player.x, player.y, '#ffffff', 34, 0.6);
  shake(0.6, 3);
  Sound.explode(true);
  if (game.score > game.best) {
    game.best = game.score;
    game.newRecord = true;
    storeSet(BEST_KEY, String(game.best));
  }
}

// --- 수호 구체 ---
const orbPositions = [];   // 매 프레임 갱신되는 구체 좌표 (재사용 배열)
function updateOrbs(dt) {
  const n = CONFIG.ORB_COUNT_BY_LV[player.orb];
  player.orbAngle += CONFIG.ORB_SPEED_BY_LV[player.orb] * dt;
  orbPositions.length = 0;
  if (!player.alive || !n) return;
  const r = CONFIG.ORB_RADIUS + (player.orb >= 4 ? 2 : 0);
  for (let i = 0; i < n; i++) {
    const a = player.orbAngle + (i / n) * Math.PI * 2;
    orbPositions.push(player.x + Math.cos(a) * r, player.y + Math.sin(a) * r * 0.9);
  }
}
const orbHit = (x, y, rad) => {
  for (let i = 0; i < orbPositions.length; i += 2) {
    const dx = orbPositions[i] - x, dy = orbPositions[i + 1] - y;
    if (dx * dx + dy * dy < rad * rad) return i;
  }
  return -1;
};
function levelUpOrb(fromWave = false) {
  if (player.orb >= CONFIG.ORB_MAX) return false;
  const prevCount = CONFIG.ORB_COUNT_BY_LV[player.orb];
  player.orb++;
  player.coinProg.orb = 0;
  const info = SKILL_INFO.orb, more = CONFIG.ORB_COUNT_BY_LV[player.orb] > prevCount;
  showSkill(player.orb >= CONFIG.ORB_MAX ? info.max : more ? info.text : 'ORB SPEED UP!', info.color);
  ring(player.x, player.y, info.color, 22, 0.5, true);
  explode(player.x, player.y, [info.color, '#ffffff'], 16, 55);
  player.powerT = 0.45;
  Sound.powerup('orb');
  if (fromWave) popText(player.x, player.y - 20, 'WAVE BONUS', info.color);
  return true;
}

// --- 스킬 & 진화 ---
function levelUp(kind, fromBoss = false) {
  const s = player.skills, info = SKILL_INFO[kind];
  s[kind]++;
  player.coinProg[kind] = 0;
  showSkill(s[kind] >= CONFIG.SKILL_MAX[kind] ? info.max : info.text, info.color);
  if (kind === 'rate') player.fireT = Math.min(player.fireT, fireInterval());
  ring(player.x, player.y, info.color, 20, 0.45, true);
  ring(player.x, player.y, '#ffffff', 14, 0.35, true, 0.12);
  explode(player.x, player.y, [info.color, '#ffffff'], 16, 55);
  player.powerT = 0.45;
  Sound.powerup(kind);
  checkEvolve();
  if (fromBoss) popText(player.x, player.y - 18, 'BOSS BONUS', info.color);
}
function checkEvolve() {
  const t = tierFor(totalPower());
  if (t <= player.tier) return;
  player.tier = t;
  // 진화 연출: 슬로모션 + 화면 섬광 + 회전 빛줄기 + 큰 충격파 4겹 + 파티클 폭발 + 주변 탄 제거
  const sk = skin();
  game.slowmo = CONFIG.EVOLVE_SLOWMO; game.slowmoScale = CONFIG.EVOLVE_SLOWMO_SCALE;
  game.evolveFx = { t: 0, dur: CONFIG.EVOLVE_FX_TIME, color: sk.breath[1], deco: sk.deco };
  game.purgeBullets = true;
  ring(player.x, player.y, '#ffffff', 70, 0.8, true);
  ring(player.x, player.y, sk.deco, 55, 0.8, true, 0.12);
  ring(player.x, player.y, sk.breath[1], 90, 1.0, true, 0.24);
  ring(player.x, player.y, sk.breath[0], 120, 1.1, true, 0.4);
  explode(player.x, player.y, [sk.deco, sk.breath[1], sk.breath[2], '#ffffff'], 90, 130, 3);
  explode(player.x, player.y, [sk.breath[1], sk.deco], 30, 40, 2, -50, 2);
  game.evolveT = 2.2;
  player.powerT = 1.2;
  shake(0.6, 3);
  Sound.evolve();
}

// --- 적 생성 ---
function pickEnemyType() {
  const w = game.wave;
  const eliteAlive = enemies.active.filter((e) => e.type === 'elite').length;
  const table = [
    ['imp', 5],
    ['bat', 1.5 + w * 0.5],
    ['mage', w >= 2 ? 0.6 + w * 0.5 : 0],
    ['charger', w >= 3 ? 0.5 + w * 0.4 : 0],
    ['elite', w >= 4 && eliteAlive < CONFIG.ELITE_MAX_ALIVE ? 0.15 + w * 0.08 : 0],
  ];
  let r = Math.random() * table.reduce((s, t) => s + t[1], 0);
  for (const [type, weight] of table) { if ((r -= weight) < 0) return type; }
  return 'imp';
}

function spawnEnemy(type, x, y) {
  const def = ENEMY_TYPES[type], spr = SPR[type], e = enemies.spawn();
  e.type = type; e.boss = false; e.spr = spr; e.w = spr.w; e.h = spr.h;
  e.hp = e.maxHp = def.hp * hpMul();
  e.x = x !== undefined ? x : rand(spr.w / 2 + 3, W - spr.w / 2 - 3);
  e.y = y !== undefined ? y : -spr.h;
  e.vy = def.speed * speedMul() * rand(0.85, 1.15);
  e.vx = 0; e.t = rand(0, 6); e.flash = -1; e.orbCd = 0; e.dead = false; e.state = 'move'; e.life = 0;
  e.score = CONFIG.SCORE[type]; e.drop = def.drop;
  e.willFire = false;
  if (type === 'bat') {
    e.amp = def.amp; e.freq = def.freq;
    e.baseX = clamp(e.x, e.amp + spr.w / 2 + 2, W - e.amp - spr.w / 2 - 2);
    e.x = e.baseX + Math.sin(e.t * e.freq) * e.amp;
  } else if (type === 'mage' || type === 'elite') {
    e.stopY = type === 'elite' ? rand(50, 80) : rand(44, 120);
    e.fireT = rand(0.6, 1.2);
    e.vx = Math.random() < 0.5 ? -12 : 12;
  } else if (type === 'charger') {
    e.stopY = rand(24, 40);
  } else {
    const chance = (game.wave - CONFIG.IMP_FIRE_FROM_WAVE + 1) * CONFIG.IMP_FIRE_CHANCE_STEP;
    e.willFire = Math.random() < Math.min(CONFIG.IMP_FIRE_CHANCE_MAX, chance);
    e.fireY = rand(40, 140);
  }
  return e;
}

// 편대: 임프 3기 V자
function spawnGroup() {
  const cx = rand(32, W - 32);
  spawnEnemy('imp', cx, -10);
  spawnEnemy('imp', cx - 20, -24);
  spawnEnemy('imp', cx + 20, -24);
}

function spawnBoss(defIdx) {
  const def = defIdx !== undefined ? BOSS_DEFS[defIdx] : (game.nextBoss || BOSS_DEFS[game.bossCount % BOSS_DEFS.length]);
  const spr = def.spr, e = enemies.spawn();
  const stage = game.bossCount;
  const hp = CONFIG.BOSS_HP * (1 + CONFIG.BOSS_HP_GROWTH * stage);
  Object.assign(e, {
    type: 'boss', boss: true, def, spr, w: spr.w, h: spr.h, x: W / 2, y: -spr.h, baseY: 64,
    hp, maxHp: hp, t: 0, flash: -1, orbCd: 0, dead: false, state: 'enter', stage, phase: 0,
    pat: null, patIdx: -1, patT: 0, patDur: 0, fireT: 0, rest: 1.2, spin: 0, sub: {},
    score: CONFIG.SCORE.boss * (stage + 1),
  });
  game.boss = e;
  Sound.roar();
}

function updateSpawner(dt) {
  if (game.boss) return;                       // 보스전 중엔 잡몹 등장 중지 (보스 소환은 예외)
  if (game.warningT > 0) {
    game.warningT -= dt;
    if (game.warningT <= 0) spawnBoss();
    return;
  }
  game.spawnT -= dt;
  if (game.spawnT <= 0) {
    const base = Math.max(CONFIG.SPAWN_INTERVAL_MIN, CONFIG.SPAWN_INTERVAL * Math.pow(CONFIG.SPAWN_DECAY, game.wave - 1));
    game.spawnT = base * rand(0.7, 1.3);
    if (Math.random() < CONFIG.GROUP_CHANCE_PER_WAVE * (game.wave - 1)) spawnGroup();
    else spawnEnemy(pickEnemyType());
  }
}

// 적 탄 발사 (kind: fire | magic | spike)
function spawnEnemyBullet(x, y, vx, vy, kind) {
  const b = enemyBullets.spawn();
  b.x = x; b.y = y; b.vx = vx; b.vy = vy; b.kind = kind; b.seed = (Math.random() * 10) | 0;
}
// 플레이어 방향으로 n발 (spread 간격 부채꼴)
function fireAimed(x, y, n, spread, speed, kind) {
  const a0 = Math.atan2(player.y - y, player.x - x);
  for (let i = 0; i < n; i++) {
    const a = a0 + (i - (n - 1) / 2) * spread;
    spawnEnemyBullet(x, y, Math.cos(a) * speed, Math.sin(a) * speed, kind);
  }
}

// --- 적 업데이트 ---
function updateHoverer(e, dt) {
  // 마법사/정예: 내려와서 좌우로 떠다니며 사격 후 퇴장
  if (e.state === 'move') {
    e.y += e.vy * dt;
    if (e.y >= e.stopY) e.state = 'hover';
  } else if (e.state === 'hover') {
    e.life += dt;
    e.x += e.vx * dt;
    if (e.x < e.w / 2 + 2 || e.x > W - e.w / 2 - 2) { e.vx = -e.vx; e.x = clamp(e.x, e.w / 2 + 2, W - e.w / 2 - 2); }
    e.fireT -= dt;
    if (e.fireT <= 0 && game.state === 'play') {
      const bs = enemyBulletSpeed();
      if (e.type === 'mage') {
        const n = Math.min(CONFIG.MAGE_MAX_SHOTS, 1 + Math.floor((game.wave - 1) / CONFIG.MAGE_SHOTS_EVERY));
        fireAimed(e.x, e.y + 4, n, 0.22, bs, 'fire');
        e.fireT = Math.max(CONFIG.MAGE_FIRE_MIN, CONFIG.MAGE_FIRE_INTERVAL * Math.pow(CONFIG.MAGE_FIRE_DECAY, game.wave - 1));
      } else {
        const n = Math.min(CONFIG.ELITE_MAX_SHOTS, CONFIG.ELITE_SHOTS + Math.floor(game.wave / CONFIG.ELITE_SHOTS_EVERY));
        fireAimed(e.x, e.y + 8, n, 0.18, bs * 0.9, 'spike');
        e.fireT = CONFIG.ELITE_FIRE_INTERVAL;
      }
      Sound.enemyShot();
    }
    if (e.life > (e.type === 'elite' ? 14 : 7)) e.state = 'leave';
  } else {
    e.y += e.vy * 1.2 * dt;
  }
}
function updateCharger(e, dt) {
  // 돌진 악마: 내려옴 → 조준(떨림 + 경고) → 빠르게 돌진
  if (e.state === 'move') {
    e.y += 50 * dt;
    if (e.y >= e.stopY) { e.state = 'aim'; e.life = 0.6; }
  } else if (e.state === 'aim') {
    e.life -= dt;
    if (e.life <= 0) {
      e.state = 'charge';
      const dx = player.x - e.x, dy = Math.max(40, player.y - e.y);
      const sp = CONFIG.CHARGER_SPEED * speedMul();
      e.vx = clamp(dx / dy, -0.35, 0.35) * sp; e.vy = sp;
    }
  } else {
    e.x += e.vx * dt; e.y += e.vy * dt;
  }
}

// AABB 충돌 (중심 좌표 + 반폭/반높이)
const overlap = (ax, ay, ahw, ahh, bx, by, bhw, bhh) =>
  Math.abs(ax - bx) < ahw + bhw && Math.abs(ay - by) < ahh + bhh;

function updateEnemies(dt) {
  const hb = CONFIG.PLAYER_HURTBOX, sh = CONFIG.ENEMY_BODY_SHRINK;
  enemies.update((e) => {
    if (e.dead) return false;
    if (e.flash > -1) e.flash -= dt;
    if (e.type === 'imp') {
      e.y += e.vy * dt;
      if (e.willFire && e.y >= e.fireY && game.state === 'play') { e.willFire = false; fireAimed(e.x, e.y + 4, 1, 0, enemyBulletSpeed(), 'magic'); }
    } else if (e.type === 'bat') {
      e.t += dt;
      e.y += e.vy * dt;
      e.x = e.baseX + Math.sin(e.t * e.freq) * e.amp;
    } else if (e.type === 'mage' || e.type === 'elite') updateHoverer(e, dt);
    else if (e.type === 'charger') updateCharger(e, dt);
    else updateBoss(e, dt);
    // 수호 구체가 닿으면 피해 (적마다 쿨타임)
    if (e.orbCd > 0) e.orbCd -= dt;
    if (orbPositions.length && !(e.orbCd > 0) && game.state === 'play') {
      for (let i = 0; i < orbPositions.length; i += 2) {
        if (overlap(orbPositions[i], orbPositions[i + 1], 2.5, 2.5, e.x, e.y, e.w / 2 - 2, e.h / 2 - 2)) {
          e.orbCd = CONFIG.ORB_HIT_COOLDOWN;
          damageEnemy(e, CONFIG.ORB_DAMAGE, orbPositions[i], orbPositions[i + 1]);
          break;
        }
      }
      if (e.dead) return false;
    }
    // 몸체 충돌 (판정은 외형보다 작게, 잡몹은 함께 폭발)
    const bsh = e.boss ? 8 : sh;
    if (game.state === 'play' && player.invuln <= 0 &&
        overlap(e.x, e.y, e.w / 2 - bsh, e.h / 2 - bsh, player.x, player.y, hb.hw, hb.hh)) {
      hitPlayer();
      if (!e.boss) killEnemy(e, false);
    }
    return !e.dead && (e.boss || (e.y < H + e.h && e.x > -40 && e.x < W + 40));
  });
}

function damageEnemy(e, dmg, hx, hy) {
  if (e.boss && e.state === 'enter') return;    // 등장 연출 중엔 무적
  e.hp -= dmg;
  if (e.flash < -0.05) e.flash = CONFIG.HIT_FLASH;   // 흰색 번쩍임 (연속 피격 시 깜빡이도록 짧은 쿨타임)
  if (e.hp <= 0) killEnemy(e, true);
  else {
    explode(hx, hy, ['#ffffff', '#fff6c8'], 3, 35, 1);
    Sound.hitTick();
  }
}

function killEnemy(e, drop) {
  if (e.dead) return;
  e.dead = true;
  game.score += e.score;
  if (e.boss) {
    onBossDefeated(e);
    return;
  }
  demonBurst(e, e.type === 'elite' ? 2.2 : 1);
  if (e.type === 'elite') { ring(e.x, e.y, '#ffb030', e.w * 0.8, 0.3); shake(CONFIG.ELITE_DEATH_SHAKE, CONFIG.ELITE_DEATH_SHAKE_MAG); }
  else if (CONFIG.DEATH_SHAKE > 0) shake(CONFIG.DEATH_SHAKE, CONFIG.DEATH_SHAKE_MAG);
  // 코인: 낮은 확률 + 최소 드랍 간격(쿨타임)
  if (drop && game.clock - game.lastCoin >= CONFIG.COIN_DROP_COOLDOWN && Math.random() < e.drop) {
    spawnCoin(e.x, e.y);
    game.lastCoin = game.clock;
  }
  Sound.explode(e.type === 'elite');
}

function onBossDefeated(e) {
  for (let i = 0; i < 8; i++) {
    explode(e.x + rand(-20, 20), e.y + rand(-10, 10), ['#ff6a10', '#ffb030', '#ffffff', ...e.spr.colors.slice(0, 3)], 18, 80, 3);
  }
  explode(e.x, e.y, ['#4a4048', '#6a6070'], 24, 40, 3, -30, 2);
  ring(e.x, e.y, '#ffffff', 60, 0.7);
  ring(e.x, e.y, '#ffcf3f', 40, 0.5, false, 0.15);
  game.boss = null;
  game.bossCount++;
  lasers.length = 0;
  shake(0.8, 3);
  game.purgeBullets = true;
  showBanner('BOSS DOWN', 'POWER LIMIT ' + powerCap());
  popText(e.x, e.y + 18, '+' + e.score, '#ffd23f');
  Sound.explode(true);
  // 보상: 상한 해제 + 확정 스킬 강화 1회 (진화 구간을 넘으면 EVOLVE 연출)
  const options = SKILL_ORDER.filter((k) => player.skills[k] < CONFIG.SKILL_MAX[k]);
  if (options.length && totalPower() < powerCap() && player.alive) levelUp(pick(options), true);
}

// --- 보스 패턴 ---
const PATTERN_DUR = { fan: 3.0, ring: 3.2, spiral: 3.4, burst: 2.4, summon: 1.2, laser: 2.2, dive: 99 };
function bossPatternList(b) {
  return b.def.pool.slice(0, Math.min(b.def.pool.length, 2 + b.phase + b.stage));   // 단계·페이즈가 오를수록 패턴 수 증가
}
function startPattern(b) {
  const list = bossPatternList(b);
  b.patIdx = (b.patIdx + 1) % list.length;
  b.pat = list[b.patIdx];
  b.patT = 0; b.fireT = 0.25; b.patDur = PATTERN_DUR[b.pat]; b.sub = {};
  const lv = b.stage + b.phase * 0.5;
  if (b.pat === 'laser') {
    // 경고선 → 발사 (경고 시간 동안 피할 수 있음)
    const n = Math.min(3, 1 + Math.floor(lv / 2)), warn = Math.max(0.7, CONFIG.LASER_WARN - 0.05 * lv);
    const xs = [player.x];
    if (n >= 2) xs.push(player.x + (player.x < W / 2 ? 46 : -46));
    if (n >= 3) xs.push(player.x + (player.x < W / 2 ? -46 : 46));
    xs.forEach((x) => lasers.push({ x: clamp(x, 8, W - 8), y0: b.y + 10, warn, fire: CONFIG.LASER_TIME }));
    b.patDur = warn + CONFIG.LASER_TIME + 0.3;
    Sound.laser();
  } else if (b.pat === 'summon') {
    const n = Math.min(4, 2 + Math.floor(lv / 2));
    const alive = enemies.active.filter((m) => !m.boss).length;
    for (let i = 0; i < n && alive + i < 8; i++) {
      const m = spawnEnemy(b.def.minion, clamp(b.x + (i % 2 ? 1 : -1) * (14 + i * 6), 12, W - 12), b.y + 8);
      m.vy *= 1.1;
    }
    ring(b.x, b.y, '#ff3a8a', 30, 0.5);
  } else if (b.pat === 'dive') {
    b.sub = { st: 'warn', t: 0.75, tx: clamp(player.x, b.w / 2, W - b.w / 2) };
  }
}
function bossFire(b, lv) {
  const bs = enemyBulletSpeed() * 0.85 + b.stage * 6;
  const kind = b.def.bullet === 'spike' ? (b.pat === 'ring' || b.pat === 'spiral' ? 'magic' : 'spike') : b.def.bullet;
  const m = b.def.mouths;
  if (b.pat === 'fan') {
    const n = Math.min(CONFIG.BOSS_FAN_MAX, 3 + Math.floor(lv / 2));
    m.forEach(([dx, dy], i) => { if (m.length < 3 || i !== 1 || lv >= 1) fireAimed(b.x + dx, b.y + dy, n, 0.2, bs, kind); });
    b.fireT = Math.max(0.6, 1.0 - 0.08 * lv);
  } else if (b.pat === 'ring') {
    // 원형 탄막: 플레이어 근처 방향에 3발짜리 빈틈을 항상 남김
    const n = Math.min(CONFIG.BOSS_RING_MAX, CONFIG.BOSS_RING_BASE + Math.floor(2 * lv)), gap = Math.atan2(player.y - b.y, player.x - b.x) + rand(-0.5, 0.5);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + b.spin;
      const d = Math.abs(((a - gap) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
      if (d < (1.6 * Math.PI * 2) / n) continue;
      spawnEnemyBullet(b.x, b.y + 4, Math.cos(a) * bs * 0.8, Math.sin(a) * bs * 0.8, kind);
    }
    b.spin += 0.2;
    b.fireT = Math.max(0.8, 1.25 - 0.1 * lv);
  } else if (b.pat === 'spiral') {
    const arms = lv >= 3 ? 3 : 2;
    for (let k = 0; k < arms; k++) {
      const a = b.spin + (k * Math.PI * 2) / arms;
      spawnEnemyBullet(b.x, b.y + 4, Math.cos(a) * bs * 0.7, Math.sin(a) * bs * 0.7, kind);
    }
    b.spin += 0.33;
    b.fireT = Math.max(CONFIG.BOSS_SPIRAL_MIN_INTERVAL, 0.13 - 0.01 * lv);
  } else if (b.pat === 'burst') {
    const [dx, dy] = m[m.length > 1 ? 1 : 0];
    fireAimed(b.x + dx, b.y + dy, lv >= 3 ? 3 : 1, 0.25, bs * 1.15, kind);
    b.fireT = Math.max(0.16, 0.26 - 0.02 * lv);
  }
}
function updateBoss(b, dt) {
  if (b.state === 'enter') {
    b.y += 30 * dt;
    if (b.y >= b.baseY) { b.y = b.baseY; b.state = 'fight'; b.t = 0; }
    return;
  }
  b.t += dt;
  if (game.state !== 'play') return;
  // 페이즈 전환 (체력 구간): 탄 제거 + 포효
  const ratio = b.hp / b.maxHp;
  const phase = ratio < CONFIG.BOSS_PHASES[1] ? 2 : ratio < CONFIG.BOSS_PHASES[0] ? 1 : 0;
  if (phase > b.phase) {
    b.phase = phase;
    game.purgeBullets = true;
    lasers.length = 0;
    b.pat = null; b.rest = 1.0; b.patIdx = -1; b.sub = {};
    b.y = Math.min(b.y, b.baseY + 10);
    shake(0.5, 2);
    popText(b.x, b.y + b.h / 2 + 6, phase === 1 ? 'RAGE!' : 'FURY!', '#ff4a5a');
    ring(b.x, b.y, '#ff3a3a', 50, 0.6);
    Sound.roar();
  }
  const lv = b.stage + b.phase * 0.5;
  // 기본 이동: 좌우로 흔들림 (돌진 중엔 고정)
  const swayX = W / 2 + Math.sin(b.t * 0.6) * 36;
  if (b.pat !== 'dive') {
    b.x += (swayX - b.x) * Math.min(1, dt * 3);
    b.y += (b.baseY + Math.sin(b.t * 1.3) * 5 - b.y) * Math.min(1, dt * 3);
  }
  if (b.rest > 0) {
    b.rest -= dt;
    if (b.rest <= 0) startPattern(b);
    return;
  }
  b.patT += dt;
  if (b.pat === 'dive') {
    // 돌진: 경고(떨림) → 아래로 돌진 → 복귀, 고레벨이면 바닥에서 원형 탄
    const s = b.sub;
    if (s.st === 'warn') {
      b.x += (s.tx - b.x) * Math.min(1, dt * 6) + rand(-1, 1);
      if ((s.t -= dt) <= 0) s.st = 'down';
    } else if (s.st === 'down') {
      b.y += 260 * dt;
      if (b.y >= H * 0.55) {
        s.st = 'up'; shake(0.25, 2);
        if (lv >= 1) {
          const n = 8 + Math.floor(lv);
          for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; spawnEnemyBullet(b.x, b.y, Math.cos(a) * 55, Math.sin(a) * 55, b.def.bullet === 'spike' ? 'magic' : b.def.bullet); }
        }
      }
    } else {
      b.y -= 140 * dt;
      if (b.y <= b.baseY) { b.y = b.baseY; b.pat = null; b.rest = CONFIG.BOSS_REST; }
    }
    return;
  }
  if (b.pat === 'fan' || b.pat === 'ring' || b.pat === 'spiral' || b.pat === 'burst') {
    b.fireT -= dt;
    if (b.fireT <= 0) { bossFire(b, lv); Sound.enemyShot(); }
  }
  if (b.patT >= b.patDur) { b.pat = null; b.rest = CONFIG.BOSS_REST; }
}
function updateLasers(dt) {
  const hb = CONFIG.PLAYER_HURTBOX;
  for (let i = lasers.length - 1; i >= 0; i--) {
    const l = lasers[i];
    if (l.warn > 0) { l.warn -= dt; if (l.warn <= 0) shake(0.15, 1); continue; }
    l.fire -= dt;
    if (game.state === 'play' && player.invuln <= 0 && Math.abs(player.x - l.x) < CONFIG.LASER_HALF_WIDTH + hb.hw - 1 && player.y > l.y0) hitPlayer();
    if (l.fire <= 0) lasers.splice(i, 1);
  }
}

// --- 내 브레스 ---
function updateBullets(dt) {
  bullets.update((b) => {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.y < -16 || b.x < -6 || b.x > W + 6) return false;
    const list = enemies.active;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.dead || b.hit.includes(e)) continue;
      if (overlap(b.x, b.y, b.wid / 2 + 0.5, b.len / 2, e.x, e.y, e.w / 2 - 2, e.h / 2 - 2)) {
        damageEnemy(e, b.dmg, b.x, b.y - b.len / 2);
        b.hit.push(e);
        if (b.pierce <= 0) return false;
        b.pierce--;
      }
    }
    return true;
  });
}

// --- 적 탄 ---
function updateEnemyBullets(dt) {
  const hb = CONFIG.PLAYER_HURTBOX, r = CONFIG.ENEMY_BULLET_HITBOX;
  enemyBullets.update((b) => {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.y > H + 6 || b.y < -10 || b.x < -6 || b.x > W + 6) return false;
    // 수호 구체에 닿으면 탄 소멸
    if (orbPositions.length && orbHit(b.x, b.y, CONFIG.ORB_BLOCK_RADIUS) >= 0) {
      explode(b.x, b.y, [SKILL_INFO.orb.color, '#ffffff'], 3, 30, 1);
      return false;
    }
    if (game.state === 'play' && player.invuln <= 0 && overlap(b.x, b.y, r, r, player.x, player.y, hb.hw, hb.hh)) {
      hitPlayer();
      return false;
    }
    return true;
  });
}

// --- 코인 ---
// 코인 종류는 떨어질 때 결정 (상한 도달 시엔 점수 코인)
function spawnCoin(x, y, kind) {
  const s = player.skills;
  const options = SKILL_ORDER.filter((k) => s[k] < CONFIG.SKILL_MAX[k]);
  const c = coins.spawn();
  c.x = clamp(x, 8, W - 8); c.y = y; c.t = rand(0, 3);
  // 상한 아래면 일반 스킬 위주(구체는 ORB_COIN_CHANCE 확률), 상한에 막히면 구체 코인
  const powerOk = options.length && totalPower() < powerCap(), orbOk = player.orb < CONFIG.ORB_MAX;
  if (!kind) {
    if (powerOk && orbOk) kind = Math.random() < CONFIG.ORB_COIN_CHANCE ? 'orb' : pick(options);
    else kind = powerOk ? pick(options) : orbOk ? 'orb' : 'score';
  }
  c.kind = kind;
  return c;
}

function collectCoin(c) {
  const s = player.skills;
  let kind = c.kind;
  game.score += CONFIG.SCORE.coin;
  // 수호 구체 코인: 총합 상한과 무관하게 코인을 모아 강화
  if (kind === 'orb' && player.orb < CONFIG.ORB_MAX) {
    const cost = CONFIG.ORB_COIN_COST[player.orb];
    if (++player.coinProg.orb >= cost) levelUpOrb();
    else {
      showSkill('ORB ' + player.coinProg.orb + '/' + cost, SKILL_INFO.orb.color);
      ring(player.x, player.y, SKILL_INFO.orb.color, 12, 0.3, true);
      Sound.coin();
    }
    return;
  }
  if (kind === 'orb') kind = 'score';
  // 이미 최대이거나 총합 상한이면 강화 대신 점수
  const capped = totalPower() >= powerCap();
  if (kind !== 'score' && (s[kind] >= CONFIG.SKILL_MAX[kind] || capped)) kind = 'score';
  if (kind === 'score') {
    game.score += CONFIG.SCORE.cappedCoin;
    showSkill(capped && totalPower() < MAX_TOTAL ? 'DEFEAT BOSS!' : 'BONUS +' + CONFIG.SCORE.cappedCoin, SKILL_INFO.score.color);
    popText(c.x, c.y - 8, '+' + CONFIG.SCORE.cappedCoin, '#ffd23f');
    explode(c.x, c.y, ['#ffffff', '#ffd23f'], 8, 30);
    if (capped) Sound.locked(); else Sound.coin();
    return;
  }
  // 코인 누적 → 필요 수량(레벨이 오를수록 증가)을 채우면 강화
  const cost = CONFIG.COIN_COST[s[kind]];
  player.coinProg[kind]++;
  if (player.coinProg[kind] >= cost) levelUp(kind);
  else {
    const info = SKILL_INFO[kind];
    showSkill(info.short + ' ' + player.coinProg[kind] + '/' + cost, info.color);
    ring(player.x, player.y, info.color, 12, 0.3, true);
    explode(c.x, c.y, [info.color, '#ffffff'], 8, 30);
    Sound.coin();
  }
}

function updateCoins(dt) {
  coins.update((c) => {
    c.t += dt;
    c.y += CONFIG.COIN_SPEED * dt;
    c.x += Math.sin(c.t * 3) * 8 * dt;
    if (player.alive && game.state === 'play') {
      const dx = player.x - c.x, dy = player.y - c.y, d = Math.hypot(dx, dy);
      if (d < CONFIG.COIN_PICKUP_RANGE) { collectCoin(c); return false; }
      if (d < CONFIG.COIN_MAGNET_RANGE) { c.x += (dx / d) * 90 * dt; c.y += (dy / d) * 90 * dt; }
    }
    return c.y < H + 10;
  });
}

function updateEffects(dt) {
  const damp = Math.pow(0.04, dt);    // 프레임레이트와 무관한 감속
  particles.update((p) => {
    p.vy += p.g * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= damp; if (!p.g) p.vy *= damp;
    return (p.life -= dt) > 0;
  });
  rings.update((r) => {
    if (r.delay > 0) { r.delay -= dt; return true; }
    if (r.follow) { r.x = player.x; r.y = player.y; }
    return (r.life -= dt) > 0;
  });
  texts.update((t) => { t.y -= 14 * dt; return (t.life -= dt) > 0; });
}

// 시작 화면 미리보기: 드래곤이 브레스를 쏘는 연출
function updatePreview(dt) {
  preview.fireT -= dt;
  const sk = skin();
  if (preview.fireT <= 0) {
    preview.fireT = 0.24;
    preview.beams.push({ x: W / 2 + Math.sin(game.clock * 1.6) * 10, y: 100 + OY, len: 10, wid: 2, el: sk.el, colors: sk.breath, seed: (Math.random() * 8) | 0, pierceLv: 0, glow: true });
  }
  for (const b of preview.beams) b.y -= 140 * dt;
  while (preview.beams.length && preview.beams[0].y < 80 + OY) preview.beams.shift();
}

function onWaveStart(w) {
  const si = sceneForWave(w);
  if (si !== game.sceneIdx) setScene(si);
  showBanner('WAVE ' + w, SCENES[si].name);
  Sound.wave();
  // 웨이브 도달 시 수호 구체 자동 강화
  if (CONFIG.ORB_AUTO_WAVES.includes(w)) levelUpOrb(true);
  // N웨이브마다 보스: WAVE 배너 뒤에 경고 → 등장
  if (w % CONFIG.BOSS_EVERY_WAVES === 0) {
    game.nextBoss = BOSS_DEFS[game.bossCount % BOSS_DEFS.length];
    game.warningT = CONFIG.BOSS_WARNING + 1.6;
  }
}

function update(dt) {
  // 진화 슬로모션: 잠깐 느려졌다가 원래 속도로 복귀
  if (game.slowmo > 0) { game.slowmo -= dt; game.timeScale = game.slowmoScale || CONFIG.EVOLVE_SLOWMO_SCALE; }
  else game.timeScale = Math.min(1, game.timeScale + dt * 3);
  if (game.evolveFx && (game.evolveFx.t += dt) >= game.evolveFx.dur) game.evolveFx = null;
  dt *= game.timeScale;
  game.clock += dt;
  updateBackground(dt);
  if (game.state === 'title') updatePreview(dt);
  if (game.state === 'play') {
    // 보스전/경고 중엔 웨이브 시간이 멈춤
    if (!game.boss && game.warningT <= 0) game.time += dt;
    const w = 1 + Math.floor(game.time / CONFIG.WAVE_DURATION);
    if (w > game.wave) { game.wave = w; onWaveStart(w); }
    if (game.warningT > 0 && game.warningT <= CONFIG.BOSS_WARNING && !game.warnPlayed) { game.warnPlayed = true; Sound.warning(); }
    if (game.warningT <= 0) game.warnPlayed = false;
    updateSpawner(dt);
    updatePlayer(dt);
    updateOrbs(dt);
  } else if (game.state === 'over') {
    game.overT += dt;
    orbPositions.length = 0;
  }
  if (game.state !== 'title') {
    updateEnemies(dt);
    updateLasers(dt);
    updateBullets(dt);
    updateEnemyBullets(dt);
    updateCoins(dt);
  }
  updateEffects(dt);

  // 탄 제거는 순회가 끝난 뒤 한 번에 처리
  if (game.purgeBullets) {
    for (const b of enemyBullets.active) explode(b.x, b.y, [bulletSet().glow[b.kind]], 1, 15, 1);
    enemyBullets.clear();
    game.purgeBullets = false;
  }
  if (game.shake > 0) game.shake -= dt;
  if (game.bannerT > 0) game.bannerT -= dt;
  if (game.skillT > 0) game.skillT -= dt;
  if (game.evolveT > 0) game.evolveT -= dt;
  if (game.hurtT > 0) game.hurtT -= dt / Math.max(0.1, game.timeScale);   // 히트스톱 중에도 실제 시간으로 감소
}

// ===== 7. 렌더링 =====
const blink = (hz) => Math.floor(game.clock * hz) % 2 === 0;

function drawBackground() {
  const tc = sceneColors();
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, rgbStr(tc.top));
  grad.addColorStop(1, rgbStr(tc.bot));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  return tc;
}
function drawDecos(layer) {
  for (const d of decos.active) {
    if (d.layer !== layer) continue;
    ctx.globalAlpha = d.alpha * d.fade * (d.kind === 'ember' && blink(6 + (d.x | 0) % 5) ? 0.6 : 1);
    if (d.img) ctx.drawImage(d.img, Math.round(d.x - d.w / 2), Math.round(d.y - d.h / 2));
    else { ctx.fillStyle = d.color; ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, d.len); }
  }
  ctx.globalAlpha = 1;
}
function drawStars(tc) {
  STAR_LAYERS.forEach((l, i) => {
    ctx.fillStyle = rgbStr(tc.specks[i]);
    for (const s of l.stars) ctx.fillRect(s.x, s.y | 0, 1, i === 2 ? 2 : 1);
  });
}
function drawLightning() {
  const l = game.lightning;
  if (!l || !blink(20)) return;
  ctx.fillStyle = 'rgba(255,40,40,0.08)'; ctx.fillRect(0, 0, W, H);
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? '#ffd0d0' : '#ff2a2a';
    for (let i = 0; i < l.pts.length - 2; i += 2) {
      const x0 = l.pts[i], y0 = l.pts[i + 1], x1 = l.pts[i + 2], y1 = l.pts[i + 3];
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let k = 0; k <= n; k++) {
        const x = Math.round(lerp(x0, x1, k / n)), y = Math.round(lerp(y0, y1, k / n));
        if (pass) ctx.fillRect(x, y, 1, 1); else ctx.fillRect(x - 1, y, 3, 1);
      }
    }
  }
}

// 오라: 가운데가 진하고 바깥으로 갈수록 디더링으로 옅어지는 도트 원 (스킨·반지름별 캐시)
const auraCache = {};
function auraImage(color, r) {
  const key = color + r;
  if (auraCache[key]) return auraCache[key];
  const s = r * 2 + 1, c = newCanvas(s, s), g = c.getContext('2d');
  g.fillStyle = color;
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const d = Math.hypot(x - r, y - r) / r;
    if (d <= 1 && 1 - d > BAYER[(y & 3) * 4 + (x & 3)] * 0.9) g.fillRect(x, y, 1, 1);
  }
  return (auraCache[key] = c);
}
// 드래곤 그리기 (scale: 미리보기 확대용)
function drawDragon(sk, x, y, scale = 1, tier = 0, white = false) {
  const frame = FLAP[((game.clock * CONFIG.WING_FLAP_FPS) | 0) % 4];
  const s = dragonSprite(sk, frame, tier), w = s.w * scale, h = s.h * scale;
  // 진화 단계마다 커지고 진해지는 오라 (맥동) + 3단계부터 궤도를 도는 빛 입자
  if (tier >= 1) {
    const r = 8 + tier * 2 + (blink(3) ? 1 : 0), img = auraImage(tier >= 4 ? sk.deco : sk.breath[1], r), d = (r * 2 + 1) * scale;
    ctx.globalAlpha = 0.12 + tier * 0.08;
    ctx.drawImage(img, Math.round(x - d / 2), Math.round(y - d / 2), d, d);
    ctx.globalAlpha = 1;
    if (tier >= 3) {
      const n = tier * 2, rr = (r + 2) * scale;
      ctx.fillStyle = tier >= 4 ? sk.deco : sk.breath[2];
      for (let i = 0; i < n; i++) {
        const a = game.clock * (i % 2 ? 2.2 : -1.6) + (i / n) * Math.PI * 2;
        ctx.fillRect(Math.round(x + Math.cos(a) * rr), Math.round(y + Math.sin(a) * rr * 0.85), scale, scale);
      }
    }
  }
  ctx.drawImage(white ? s.white : s.img, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
}

// 수호 구체: 스킨 브레스 색의 빛 구슬 + 글로우 + 잔상
function drawOrbs(cx, cy, list, scale = 1) {
  const sk = skin();
  for (let i = 0; i < list.length; i += 2) {
    const x = Math.round(list[i]), y = Math.round(list[i + 1]), s = scale;
    ctx.globalAlpha = blink(10) ? 0.35 : 0.22;
    ctx.fillStyle = SKILL_INFO.orb.color; ctx.fillRect(x - 4 * s, y - 3 * s, 9 * s, 7 * s); ctx.fillRect(x - 3 * s, y - 4 * s, 7 * s, 9 * s);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#1a0818'; ctx.fillRect(x - 2 * s, y - 3 * s, 5 * s, 7 * s); ctx.fillRect(x - 3 * s, y - 2 * s, 7 * s, 5 * s);
    ctx.fillStyle = sk.breath[1]; ctx.fillRect(x - 2 * s, y - 2 * s, 5 * s, 5 * s);
    ctx.fillStyle = SKILL_INFO.orb.color; ctx.fillRect(x - 1 * s, y - 2 * s, 3 * s, 1 * s); ctx.fillRect(x - 2 * s, y - 1 * s, 1 * s, 3 * s);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1 * s, y - 1 * s, 2 * s, 2 * s);
  }
}
// 진화 연출: 회전하는 빛줄기 + 화면 섬광
function drawEvolveFx() {
  const fx = game.evolveFx;
  if (!fx) return;
  const k = fx.t / fx.dur, len = 30 + k * 260, fade = 1 - k;
  ctx.globalAlpha = Math.max(0, 0.55 * fade);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + fx.t * 1.5;
    ctx.fillStyle = i % 2 ? fx.color : fx.deco;
    for (let d = 10; d < len; d += 3) {
      const w = d < 60 ? 2 : 1;
      ctx.fillRect(Math.round(player.x + Math.cos(a) * d), Math.round(player.y + Math.sin(a) * d), w, w);
    }
  }
  ctx.globalAlpha = 1;
}
function drawEvolveFlash() {
  const fx = game.evolveFx;
  if (!fx) return;
  if (fx.t < 0.12) { ctx.globalAlpha = 0.7; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); }
  else { ctx.globalAlpha = Math.max(0, 0.25 * (1 - fx.t / 0.8)); ctx.fillStyle = fx.color; ctx.fillRect(0, 0, W, H); }
  ctx.globalAlpha = 1;
}

function drawPlayer() {
  if (!player.alive || game.state === 'title') return;
  drawOrbs(player.x, player.y, orbPositions);
  if (player.invuln > 0 && Math.floor(player.invuln * 14) % 2 === 0) return;   // 무적 깜빡임
  drawDragon(skin(), player.x, player.y, 1, player.tier, player.powerT > 0 && blink(16));
  if (player.muzzle > 0) {                                                      // 입에서 나오는 브레스 섬광
    ctx.fillStyle = skin().breath[2];
    ctx.fillRect(Math.round(player.x) - 1, Math.round(player.y) - 12, 3, 2);
  }
}

// 브레스: 속성별 모양(불꽃 일렁임/얼음 결정/자연 물결/빛 번개/어둠) + 데미지 → 굵기·글로우, 관통 → 길이·화살촉
function drawBreath(b) {
  const x = Math.round(b.x), top = Math.round(b.y - b.len / 2), half = b.wid >> 1;
  const [c0, c1, c2] = b.colors, fr = ((game.clock * 20) | 0) + b.seed;
  if (b.glow) {
    ctx.globalAlpha = 0.35; ctx.fillStyle = c0;
    ctx.fillRect(x - half - 1, top - 1, b.wid + 2, b.len + 2);
    ctx.globalAlpha = 1;
  }
  if (b.pierceLv > 0) {
    ctx.globalAlpha = 0.35; ctx.fillStyle = c0;
    ctx.fillRect(x - half, top + b.len, b.wid, 3 + b.pierceLv * 3);   // 잔상 꼬리
    ctx.globalAlpha = 1;
  }
  for (let i = 0; i < b.len; i += 2) {
    let ox = 0, w = b.wid;
    if (b.el === 'fire') w += (fr + i) % 3 === 0 ? 1 : 0;                 // 불꽃: 폭이 일렁임
    else if (b.el === 'nature') ox = Math.round(Math.sin((b.y + i) * 0.45));
    else if (b.el === 'light') ox = ((fr + (i >> 1)) & 1) ? 1 : -1;       // 번개: 지그재그
    else if (b.el === 'dark') w += (fr + i) % 4 === 0 ? 1 : 0;
    ctx.fillStyle = i < 3 ? c2 : i < b.len * 0.6 ? c1 : c0;               // 앞은 밝고 뒤로 갈수록 진함
    ctx.fillRect(x - (w >> 1) + ox, top + i, w, 2);
  }
  ctx.fillStyle = b.el === 'dark' ? '#1a0a2a' : '#ffffff';                // 심
  if (b.wid >= 2) ctx.fillRect(x, top + 1, 1, Math.ceil(b.len * 0.5));
  if (b.el === 'ice') { ctx.fillStyle = c2; ctx.fillRect(x - 1, top - 1, 3, 1); ctx.fillRect(x, top - 2, 1, 1); }  // 결정 촉
  if (b.el === 'fire' && fr % 2) { ctx.fillStyle = c1; ctx.fillRect(x + ((fr % 3) - 1), top - 2, 1, 1); }      // 불씨
  if (b.pierceLv > 0) {                                                   // 관통 화살촉
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - half - 1, top + 1, b.wid + 2, 1);
    ctx.fillRect(x, top - 2, 1, 2);
  }
}

function drawEnemyBullet(b) {
  const f = ((game.clock * 12 + b.seed) | 0) & 1, gx = Math.round(b.x), gy = Math.round(b.y);
  // 깜빡이는 글로우 (팔각형)
  ctx.globalAlpha = f ? 0.32 : 0.18;
  const set = bulletSet();
  ctx.fillStyle = set.glow[b.kind];
  ctx.fillRect(gx - 5, gy - 3, 11, 7);
  ctx.fillRect(gx - 3, gy - 5, 7, 2); ctx.fillRect(gx - 3, gy + 4, 7, 2);
  ctx.globalAlpha = 1;
  if (b.kind !== 'spike') { drawSprite(set[b.kind][f], b.x, b.y); return; }
  const dir = ((Math.round(Math.atan2(b.vy, b.vx) / (Math.PI / 4)) % 8) + 8) % 8;   // 진행 방향
  drawSprite(set.spike[dir], b.x, b.y);
}

function drawCoin(c) {
  // 회전: 대부분 정면(아이콘이 보이게), 잠깐씩 옆면
  const widths = [15, 15, 15, 15, 13, 9, 13, 15], w = widths[((c.t * 10) | 0) % 8];
  const bob = Math.round(Math.sin(c.t * 4));
  ctx.drawImage(COIN_IMG[c.kind], Math.round(c.x - w / 2), Math.round(c.y - 7.5) + bob, w, 15);
  if (((c.t * 3) | 0) % 3 === 0) {
    const sx = Math.round(c.x + 6), sy = Math.round(c.y - 8) + bob;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx, sy - 1, 1, 3); ctx.fillRect(sx - 1, sy, 3, 1);
  }
}

function drawRing(r) {
  if (r.delay > 0) return;
  const t = 1 - r.life / r.max, rad = 2 + r.maxR * t;
  const n = Math.max(12, (rad * 3) | 0);
  ctx.globalAlpha = Math.min(1, r.life / r.max * 1.5);
  ctx.fillStyle = r.color;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    ctx.fillRect(Math.round(r.x + Math.cos(a) * rad), Math.round(r.y + Math.sin(a) * rad), 1, 1);
  }
  ctx.globalAlpha = 1;
}

function drawLasers(warnLayer) {
  const [rgba, mid] = bulletSet().laser;
  for (const l of lasers) {
    if (warnLayer && l.warn > 0) {
      // 경고선: 깜빡이는 얇은 붉은 선
      if (blink(12)) { ctx.fillStyle = rgba + '0.75)'; ctx.fillRect(Math.round(l.x), Math.round(l.y0), 1, H); }
      ctx.fillStyle = rgba + '0.15)'; ctx.fillRect(Math.round(l.x) - CONFIG.LASER_HALF_WIDTH, Math.round(l.y0), CONFIG.LASER_HALF_WIDTH * 2 + 1, H);
    } else if (!warnLayer && l.warn <= 0) {
      const hw = CONFIG.LASER_HALF_WIDTH + (blink(20) ? 1 : 0);
      ctx.fillStyle = rgba + '0.6)'; ctx.fillRect(Math.round(l.x) - hw - 1, Math.round(l.y0), hw * 2 + 3, H);
      ctx.fillStyle = mid; ctx.fillRect(Math.round(l.x) - hw + 1, Math.round(l.y0), hw * 2 - 1, H);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(l.x) - 1, Math.round(l.y0), 3, H);
    }
  }
}

function drawEnemy(e) {
  if (e.boss) {
    // 보스는 원래 그림 위에 반투명 흰색을 겹쳐 그림 (계속 맞아도 모습이 보이게)
    drawSprite(e.spr, e.x, e.y);
    if (e.flash > 0) { ctx.globalAlpha = 0.45; drawSprite(e.spr, e.x, e.y, true); ctx.globalAlpha = 1; }
  } else drawSprite(e.spr, e.x, e.y, e.flash > 0);
  if (e.type === 'charger' && e.state === 'aim' && blink(10)) drawTextS('!', e.x, e.y - e.h / 2 - 7, '#ff4a5a', 1, 'center');
  if (e.type === 'elite' && e.hp < e.maxHp) {        // 정예 체력바
    const w = 20, x = Math.round(e.x - w / 2), y = Math.round(e.y - e.h / 2 - 3);
    ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y - 1, w + 2, 3);
    ctx.fillStyle = '#ff3a4a'; ctx.fillRect(x, y, Math.max(0, Math.round(w * e.hp / e.maxHp)), 1);
  }
  if (e.boss && e.pat === 'dive' && e.sub.st === 'warn' && blink(10)) {   // 돌진 경고 표시
    ctx.fillStyle = 'rgba(255,40,70,0.18)';
    ctx.fillRect(Math.round(e.sub.tx - e.w / 2), Math.round(e.y), e.w, Math.round(H * 0.55 - e.y + e.h / 2));
  }
}

function drawHUD() {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, 20);
  drawText(String(game.score).padStart(7, '0'), 3, 2, '#ffffff');
  drawText('WAVE ' + game.wave, W / 2, 2, '#9fb3ff', 1, 'center');
  drawSprite(Sound.muted ? SPR.speakerOff : SPR.speaker, 172, 5);

  for (let i = 0; i < CONFIG.PLAYER_HP; i++) {
    ctx.drawImage(i < player.hp ? SPR.heart.img : SPR.heartEmpty.img, 3 + i * 9, 10);
  }
  // 스킬 총합 / 상한 (상한 도달 시 깜빡임 → 보스를 잡아야 해제)
  const tot = totalPower(), cap = powerCap(), locked = tot >= cap && tot < MAX_TOTAL;
  drawText('P' + tot + '/' + cap, 31, 11, locked ? (blink(2) ? '#ff6a7a' : '#ffb0b8') : '#c8cde0');
  // 스킬별: 아이콘 + LV (최대면 MAX) + 코인 진행 바
  const hudSkills = [...SKILL_ORDER, 'orb'];
  let x = W - 3 - (hudSkills.length * 18 + (hudSkills.length - 1) * 3);
  for (const k of hudSkills) {
    const isOrb = k === 'orb';
    const info = SKILL_INFO[k], lv = isOrb ? player.orb : player.skills[k], max = lv >= (isOrb ? CONFIG.ORB_MAX : CONFIG.SKILL_MAX[k]);
    drawIcon(info.icon, x, 10, info.color);
    drawText(max ? 'MAX' : 'LV' + lv, x + 7, 10, max ? (blink(3) ? '#ffffff' : info.color) : '#c8cde0');
    if (!max) {
      ctx.fillStyle = '#3a3f5c'; ctx.fillRect(x, 17, 18, 1);
      ctx.fillStyle = info.color; ctx.fillRect(x, 17, Math.round(18 * player.coinProg[k] / (isOrb ? CONFIG.ORB_COIN_COST : CONFIG.COIN_COST)[lv]), 1);
    }
    x += 21;
  }
  // 보스 체력바 + 이름 + 페이즈
  if (game.boss) {
    const b = game.boss;
    ctx.fillStyle = '#000'; ctx.fillRect(19, 22, W - 38, 5);
    ctx.fillStyle = '#3a1520'; ctx.fillRect(20, 23, W - 40, 3);
    ctx.fillStyle = b.flash > 0 ? '#ffffff' : ['#ff3f6c', '#ff7a2a', '#ff2a2a'][b.phase];
    ctx.fillRect(20, 23, Math.max(0, Math.round((W - 40) * b.hp / b.maxHp)), 3);
    ctx.fillStyle = '#000';
    CONFIG.BOSS_PHASES.forEach((p) => ctx.fillRect(20 + Math.round((W - 40) * p), 23, 1, 3));   // 페이즈 눈금
    drawTextS(b.def.name, W / 2, 29, '#ffb0c0', 1, 'center');
  }
}

function drawButton(r, label, primary = true) {
  ctx.fillStyle = '#000'; ctx.fillRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = primary ? '#b8322a' : '#3a3f5c'; ctx.fillRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
  ctx.fillStyle = primary ? '#7a1a16' : '#2a2e45'; ctx.fillRect(r.x + 1, r.y + r.h - 3, r.w - 2, 2);
  drawText(label, r.x + r.w / 2, r.y + Math.floor(r.h / 2) - 3, '#ffffff', 1, 'center');
}
function drawArrow(r, dir) {
  const pressed = game.clock - (dir < 0 ? arrowPress.l : arrowPress.r) < 0.12;
  ctx.fillStyle = pressed ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = '#ffffff';
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  for (let i = 0; i < 7; i++) {   // 도트 삼각형 화살표
    const h = 7 - i;
    ctx.fillRect(Math.round(cx + dir * (i - 3)), Math.round(cy - h), 1, h * 2);
  }
}

function drawTitle() {
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, W, H);
  drawTextS('PIXEL', W / 2, 14 + OY, '#ffb030', 3, 'center');
  drawTextS('STRIKER', W / 2, 32 + OY, '#ff4a5a', 3, 'center');
  drawText('DRAGON KNIGHT VS DEMONS', W / 2, 52 + OY, '#e8d8c0', 1, 'center');

  // 드래곤 선택 영역
  drawText('SELECT DRAGON', W / 2, 64 + OY, '#9fb3ff', 1, 'center');
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(40, 74 + OY, W - 80, 78);
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(40, 74 + OY, W - 80, 1); ctx.fillRect(40, 151 + OY, W - 80, 1);
  const sk = skin();
  for (const b of preview.beams) drawBreath(b);
  // 미리보기는 진화 단계를 천천히 순환해서 보여줌
  const tierPreview = Math.floor(game.clock / 1.5) % 5;
  const px = W / 2 + Math.sin(game.clock * 1.6) * 10, py = 120 + OY + Math.sin(game.clock * 3) * 2;
  drawDragon(sk, px, py, 2, tierPreview);
  const pv = [];
  for (let i = 0; i < 2; i++) { const a = game.clock * 2.4 + i * Math.PI; pv.push(px + Math.cos(a) * 30, py + Math.sin(a) * 27); }
  drawOrbs(px, py, pv, 1);
  drawText(tierPreview ? 'EVOLVE ' + tierPreview : 'BASE', W - 44, 145 + OY, '#7a82a8', 1, 'right');
  drawArrow(UI.left, -1);
  drawArrow(UI.right, 1);
  drawTextS(sk.name, W / 2, 156 + OY, sk.breath[1], 2, 'center');
  drawText(sk.desc, W / 2, 170 + OY, '#c0c4d8', 1, 'center');

  SKINS.forEach((s, i) => {
    const r = UI.thumbs[i], sel = i === skinIdx;
    ctx.fillStyle = sel ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.3)';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    if (sel) {
      ctx.fillStyle = s.breath[1];
      ctx.fillRect(r.x, r.y, r.w, 1); ctx.fillRect(r.x, r.y + r.h - 1, r.w, 1);
      ctx.fillRect(r.x, r.y, 1, r.h); ctx.fillRect(r.x + r.w - 1, r.y, 1, r.h);
    }
    const spr = dragonSprite(s, 1, 0);
    ctx.drawImage(spr.img, Math.round(r.x + (r.w - spr.w) / 2), Math.round(r.y + (r.h - spr.h) / 2));
  });

  drawButton(UI.start, 'START', true);
  drawTextS('BEST ' + String(game.best).padStart(7, '0'), W / 2, 250 + OY, '#ffd23f', 1, 'center');
  drawText('DRAG TO MOVE - AUTO BREATH', W / 2, 270 + OY, '#a0a8c8', 1, 'center');
  drawText('PC: ARROWS/WASD  ENTER: START', W / 2, 280 + OY, '#a0a8c8', 1, 'center');
}

function drawGameOver() {
  const a = Math.min(1, game.overT / 0.6);
  ctx.fillStyle = `rgba(0,0,0,${0.6 * a})`; ctx.fillRect(0, 0, W, H);
  if (game.overT < 0.6) return;
  drawTextS('GAME OVER', W / 2, 96 + OY, '#ff4a5a', 2, 'center');
  drawText('SCORE', W / 2, 130 + OY, '#8f98bb', 1, 'center');
  drawTextS(String(game.score), W / 2, 139 + OY, '#ffffff', 2, 'center');
  drawText('BEST', W / 2, 162 + OY, '#8f98bb', 1, 'center');
  drawTextS(String(game.best), W / 2, 171 + OY, '#ffd23f', 1, 'center');
  if (game.newRecord && blink(3)) drawTextS('NEW RECORD!', W / 2, 186 + OY, '#ffd23f', 1, 'center');
  drawText('WAVE ' + game.wave + '  BOSS ' + game.bossCount, W / 2, 198 + OY, '#9fb3ff', 1, 'center');
  if (game.overT > 0.9) {
    drawButton(UI.retry, 'RETRY', true);
    drawButton(UI.menu, 'DRAGONS', false);
  }
}

function render() {
  const tc = drawBackground();
  ctx.save();
  if (game.shake > 0) {
    const m = game.shakeMag;
    ctx.translate(Math.round(rand(-m, m)), Math.round(rand(-m, m)));
  }
  drawDecos(0);
  drawStars(tc);
  drawDecos(1);
  drawLightning();

  drawLasers(true);
  for (const c of coins.active) drawCoin(c);
  for (const e of enemies.active) drawEnemy(e);
  for (const b of bullets.active) drawBreath(b);
  drawEvolveFx();
  drawPlayer();
  for (const b of enemyBullets.active) drawEnemyBullet(b);
  drawLasers(false);
  for (const p of particles.active) {
    if (p.life < p.max * 0.25 && blink(20)) continue;
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
  }
  for (const r of rings.active) drawRing(r);
  for (const t of texts.active) drawTextS(t.str, t.x, t.y, t.color, 1, 'center');
  ctx.restore();

  drawEvolveFlash();
  if (game.hurtT > 0) {
    const a = game.hurtT / CONFIG.HURT_FLASH;
    ctx.globalAlpha = 0.18 * a; ctx.fillStyle = '#ff1a2a'; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.7 * a;
    for (let i = 0; i < 6; i++) {                       // 가장자리 붉은 테두리 (안쪽으로 옅어짐)
      ctx.globalAlpha = 0.7 * a * (1 - i / 6);
      ctx.fillRect(i, i, W - i * 2, 1); ctx.fillRect(i, H - 1 - i, W - i * 2, 1);
      ctx.fillRect(i, i, 1, H - i * 2); ctx.fillRect(W - 1 - i, i, 1, H - i * 2);
    }
    ctx.globalAlpha = 1;
  }
  // 배경 단계 전환 화면 효과 (색 섬광)
  if (game.flash) {
    ctx.globalAlpha = game.flash.t * 0.35;
    ctx.fillStyle = game.flash.color; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  if (game.state === 'title') { drawTitle(); drawSprite(Sound.muted ? SPR.speakerOff : SPR.speaker, 172, 5); return; }

  drawHUD();
  const by = game.boss ? 40 : 30;
  if (game.skillT > 0) {           // 스킬 강화 텍스트 (화면 중앙 상단)
    const t = CONFIG.SKILL_BANNER_TIME - game.skillT;
    const y = by - (t < 0.12 ? Math.round((0.12 - t) * 60) : 0);
    ctx.globalAlpha = Math.min(1, game.skillT / 0.3);
    drawTextS(game.skillText, W / 2, y, t < 0.1 ? '#ffffff' : game.skillColor, 2, 'center');
    ctx.globalAlpha = 1;
  }
  if (game.evolveT > 0) {          // 진화 텍스트: 크게 튀어나왔다가 자리 잡음
    const t = 2.2 - game.evolveT, sc = t < 0.25 ? 4 : 3;
    ctx.globalAlpha = Math.min(1, game.evolveT / 0.4);
    drawTextS('EVOLVE!', W / 2, by + 12, blink(8) ? '#ffffff' : skin().deco, sc, 'center');
    drawTextS('STAGE ' + player.tier + ' - ' + EVOLVE_NAMES[player.tier], W / 2, by + 12 + sc * 5 + 4, skin().breath[1], 1, 'center');
    ctx.globalAlpha = 1;
  }
  if (game.state === 'play') {
    if (game.warningT > 0 && game.warningT <= CONFIG.BOSS_WARNING) {
      if (blink(4)) {
        ctx.fillStyle = 'rgba(255,40,70,0.2)'; ctx.fillRect(0, H / 2 - 42, W, 40);
        drawTextS('WARNING', W / 2, H / 2 - 36, '#ff4a5a', 2, 'center');
      }
      drawTextS(game.nextBoss ? game.nextBoss.name : '', W / 2, H / 2 - 18, '#ffb0b8', 1, 'center');
    } else if (game.bannerT > 0) {
      // WAVE N: 좌우로 펼쳐지는 띠 + 배경 단계 이름
      const t = 1.8 - game.bannerT, open = Math.min(1, t / 0.2);
      ctx.globalAlpha = Math.min(1, game.bannerT / 0.4);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      const bw = Math.round(W * open);
      ctx.fillRect(Math.round((W - bw) / 2), H / 2 - 40, bw, game.sub ? 30 : 22);
      if (open >= 1) {
        drawTextS(game.banner, W / 2, H / 2 - 35, '#ffffff', 2, 'center');
        if (game.sub) drawText(game.sub, W / 2, H / 2 - 20, SCENES[game.sceneIdx].specks[2], 1, 'center');
      }
      ctx.globalAlpha = 1;
    }
  }
  if (game.state === 'over') drawGameOver();
}

// ===== 8. 입력 =====
const input = { active: false, id: null, tx: W / 2, ty: H - 40 };
const keys = { left: false, right: false, up: false, down: false };

function toGame(e) {
  const r = canvas.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
}
function setTarget(x, y) {
  input.tx = x;
  input.ty = y - CONFIG.TOUCH_OFFSET_Y;   // 손가락보다 위에 드래곤 배치
}
const inRect = (x, y, r, pad = 4) => x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad;
const onMuteBtn = (x, y) => x >= 156 && y <= 20;

function selectSkin(i) {
  skinIdx = (i + SKINS.length) % SKINS.length;
  storeSet(SKIN_KEY, SKINS[skinIdx].id);       // 다음 실행 때도 유지
  preview.beams.length = 0;
  Sound.select();
}
function goTitle() {
  game.state = 'title';
  [bullets, enemyBullets, enemies, coins, rings, texts].forEach((p) => p.clear());
  lasers.length = 0;
  game.boss = null;
  setScene(0);
}

// 시작 화면 터치 처리 (화살표 / 썸네일 / START). 게임 시작이면 true
function titleTap(x, y) {
  if (inRect(x, y, UI.left, 2)) { arrowPress.l = game.clock; selectSkin(skinIdx - 1); return false; }
  if (inRect(x, y, UI.right, 2)) { arrowPress.r = game.clock; selectSkin(skinIdx + 1); return false; }
  for (let i = 0; i < UI.thumbs.length; i++) if (inRect(x, y, UI.thumbs[i], 1)) { if (i !== skinIdx) selectSkin(i); return false; }
  if (inRect(x, y, UI.start)) { resetGame(); return true; }
  return false;
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  Sound.init();
  const { x, y } = toGame(e);
  if (onMuteBtn(x, y)) { Sound.toggle(); return; }
  if (game.state === 'title') {
    if (!titleTap(x, y)) return;
  } else if (game.state === 'over') {
    if (game.overT <= 0.9) return;
    if (inRect(x, y, UI.retry)) resetGame();
    else { if (inRect(x, y, UI.menu)) goTitle(); return; }
  }
  input.active = true;
  input.id = e.pointerId;
  setTarget(x, y);
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
});
canvas.addEventListener('pointermove', (e) => {
  if (!input.active || e.pointerId !== input.id) return;
  e.preventDefault();
  const { x, y } = toGame(e);
  setTarget(x, y);
});
const endPointer = (e) => { if (e.pointerId === input.id) { input.active = false; input.id = null; } };
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
// iOS 사파리 더블탭 확대/스크롤 방지
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
document.addEventListener('contextmenu', (e) => e.preventDefault());

const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
};
window.addEventListener('keydown', (e) => {
  Sound.init();
  if (game.state === 'title' && KEYMAP[e.code]) {
    e.preventDefault();
    if (e.repeat) return;
    if (KEYMAP[e.code] === 'left') { arrowPress.l = game.clock; selectSkin(skinIdx - 1); }
    if (KEYMAP[e.code] === 'right') { arrowPress.r = game.clock; selectSkin(skinIdx + 1); }
    return;
  }
  if (KEYMAP[e.code]) { keys[KEYMAP[e.code]] = true; input.active = false; e.preventDefault(); }
  if (e.code === 'KeyM') Sound.toggle();
  if (e.code === 'Enter' || e.code === 'Space') {
    e.preventDefault();
    if (game.state === 'title' || (game.state === 'over' && game.overT > 0.9)) resetGame();
  }
});
window.addEventListener('keyup', (e) => { if (KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; input.active = false; });

function resize() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width = Math.floor(W * s) + 'px';
  canvas.style.height = Math.floor(H * s) + 'px';
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
resize();

// 첫 화면부터 배경이 비어 보이지 않게 배경 요소 몇 개 미리 배치
setScene(0); game.sceneT = 1;
SCENES[0].spawns.forEach((spec) => spawnDeco(0, spec.k, rand(40, H - 60)));

// ===== 9. 메인 루프 (requestAnimationFrame + delta time) =====
let lastTs = 0;
const perf = { frames: 0, work: 0, maxWork: 0 };   // 성능 측정 (update+render 소요 ms)
function loop(ts) {
  const dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 1 / 60;
  lastTs = ts;
  const t0 = performance.now();
  update(dt);
  render();
  const w = performance.now() - t0;
  perf.frames++; perf.work += w; perf.maxWork = Math.max(perf.maxWork, w);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// 테스트/디버그용 핸들
window.__game = {
  game, player, enemies, bullets, enemyBullets, coins, decos, lasers, CONFIG, SKINS, SCENES, BOSS_DEFS, H, perf,
  resetGame, spawnBoss, hitPlayer, spawnCoin, spawnEnemy, setScene, selectSkin, levelUp, totalPower, powerCap,
  skin: () => skinIdx, killEnemy, levelUpOrb, orbPositions, checkEvolve,
};
