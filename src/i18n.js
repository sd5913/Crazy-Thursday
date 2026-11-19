// Global language switch: one dictionary, one toggle, every UI string.
// Rule for future work: any new user-visible text gets BOTH an English and a
// Chinese entry here (or in food-assets/catalogue.json for food lines), so the
// 中/EN button always switches the whole game.

import { GLITCH_NAME } from './cthulhu.js';

export const LANGUAGES = ['en', 'zh'];
const STORAGE_KEY = 'expression-feeding.language.v1';

// English-string keys double as pass-through identifiers: t(status.error)
// resolves calibration errors without a second mapping layer.
const STRINGS = {
  en: {
    documentTitle: 'Eat by Face · Crazy Thursday',
    langButton: '中文',
    langButtonAria: '切换到中文',

    titleLine1: 'EAT BY',
    titleLine2: 'FACE',
    appTitle: 'Eat by Face',
    hudScore: 'SCORE',
    hudDiscomfort: 'DISCOMFORT',
    combo: 'combo ×{n}',

    face: {
      smile: 'SMILE', refusal: 'REFUSAL', vomit: 'VOMIT', blink: 'LIDDED',
      neutral: 'RELAXED', none: 'NO FACE', waiting: 'WAITING', error: 'ERROR',
    },
    badge: {
      accepting: 'accepting', refusing: 'refusing', purging: 'purging',
      defending: 'defending', noAction: 'no action', notDetected: 'not detected',
    },

    startTagline: 'High spinal cord injury - everything below the neck has resigned, and the nurse feeds you anyway - Your face is now your only way to say anything.',
    startBtn: 'Start & Calibrate',
    demoBtn: 'Keyboard Demo (no camera)',
    faceDebugBtn: 'Face Debug',
    privacyNote: 'The camera is processed locally and private.',
    settingsSaved: 'Saved developer baseline + player calibration at game start.',
    loading: 'Loading…',

    nurseLines: [
      'Open up. It is for your own good.',
      'Be a dear and swallow.',
      'Doctor says you need the nutrients.',
      'Try this little something.',
      'You are doing so well today.',
    ],
    defenseLines: ['Excuse me?!', 'You Need To EAT!', "Don't go hungry.", 'Anyone there?'],
    outcomeSwallowed: 'Swallowed. +10',
    outcomeRejected: 'Rejected. +10',
    outcomeSurreal: 'Suspiciously good. +{n}',
    outcomeSurrealReject: 'Refused. Combo kept, somehow.',
    outcomeDeclined: 'You declined food.',
    wrongBite: 'Wrong bite! Gag now!',
    rescueUp: 'Upchucked. Discomfort -{n}',
    rescueHeld: 'Held it in. Discomfort worsens…',
    demoHint: 'S smile · F refusal · V vomit · B lidded · release = relaxed',

    calStep: 'Calibration {n}/5 · {label}',
    calStartSampling: 'Start sampling',
    calSkip: 'Skip',
    calSampling: 'Sampling…',
    calProgress: 'Sampling… {s} s',
    calHintNeutral: 'Keep a relaxed face. Click to sample.',
    calHintSmile: 'Smile and hold — that is how you say "yes, keep feeding me". Click to sample.',
    calHintFrown: 'Lower your eyebrows or mouth corners and hold — your only polite refusal. Click to sample.',
    calHintJaw: 'Open your mouth wide and hold — plan B if the nurse misses "no". Click to sample.',
    calHintBlink: 'Close both eyes and hold — she will probably keep serving anyway. Click to sample.',
    calAltNeutral: 'Relaxed face',
    calAltSmile: 'Smile with mouth corners raised',
    calAltFrown: 'Refusal: lower eyebrows or mouth corners',
    calAltJaw: 'Open your mouth wide',
    calAltBlink: 'Keep both eyes closed',
    // Post-calibration test: prove each expression on a few food items.
    trialTitle: 'Quick test: {label}',
    trialIntro: 'Now show the same face when each dish appears. Get {need} of {total} right to continue.',
    trialRelaxed: 'Keep a relaxed face — do not react.',
    trialProgress: 'Dish {n} / {total}',
    trialHit: 'Got it!',
    trialMiss: 'Missed — try again on the next one.',
    trialPass: 'Nice — that face works!',
    trialFail: 'That face was not clear enough. Let us test it again.',
    trialRetry: 'Test again',
    trialContinue: 'Next expression',
    trialStart: 'Start test',
    trialSkip: 'Skip test',
    trialCounting: 'Hold it…',
    // Calibration errors surface as English strings from face-calibration.js.
    'Not enough fresh face samples. Face the camera and retry.': 'Not enough fresh face samples. Face the camera and retry.',
    'Eye landmarks unavailable. Face the camera and retry.': 'Eye landmarks unavailable. Face the camera and retry.',
    'Open and closed eyes are not distinct enough. Retry with both eyes fully closed.': 'Open and closed eyes are not distinct enough. Retry with both eyes fully closed.',
    'Action is not distinct enough from other face. Hold the target pose and retry.': 'Action is not distinct enough from other face. Hold the target pose and retry.',

    loadingCamera: 'Opening camera and loading model…',
    couldNotStart: 'Could not start',
    cameraHelp: 'Grant camera permission and open this in a WebRTC-capable browser (desktop Chrome/Edge).',

    gameoverTitle: 'Game Over',
    // Endings, in priority order. Several use a fixed card picture.
    'result.sixtySeven': '?!67!?',
    'result.cthulhu': `Disturbed the ${GLITCH_NAME}`,
    cthulhuChant: 'NONONONONONONO WHY DON\'T YOU LOOK AT MEEEEEEE',
    'result.glutton': 'Bon appétit',
    'result.vegetative': 'Vegetative',
    'result.mask': 'The Mask',
    'result.stillHungry': 'I Can Still Eat…',
    'result.sharpEyes': 'Sharp eyes',
    'result.pica': 'Pica',
    'result.observation': 'Under Observation',
    // One-line achievement hints under the ending title, outside the PNG.
    'resultHint.sixtySeven': '676767',
    'resultHint.cthulhu': 'I tolerate no disobedience!',
    'resultHint.glutton': 'Over five hundred points, mostly food.',
    'resultHint.vegetative': '...',
    'resultHint.mask': 'Twenty valid reactions in a row.',
    'resultHint.stillHungry': 'Ate enough surreal food to feel queasy.',
    'resultHint.sharpEyes': 'Discerns right from wrong.',
    'resultHint.pica': 'You win. Your taste is niche and twisted.',
    'resultHint.observation': 'Discharge denied.',
    resultCardAlt: 'Feeding Result Card',
    playAgain: 'Play Again',
    playAgainTitle: 'Same player: keep the current calibration',
    newPlayer: 'New Player',
    newPlayerTitle: 'Recalibrate for a different player or new lighting',
    saveCard: 'Save Result Card',
    shareNote: 'Share this meal!',
    cardResultsTitle: 'Feeding Results',
    cardTheCrush: 'The Crush',
    cardScore: 'SCORE',
    cardSurvived: 'SURVIVED',
    cardSeconds: '{n}s',
    cardBadBites: 'BAD BITES',
    cardMaxCombo: 'MAX COMBO',
  },
  zh: {
    documentTitle: '看脸吃饭 · 疯狂星期四',
    langButton: 'EN',
    langButtonAria: '切换到英文',

    titleLine1: '看脸',
    titleLine2: '吃饭',
    appTitle: '看脸吃饭',
    hudScore: '得分',
    hudDiscomfort: '不适度',
    combo: '连击 ×{n}',

    face: {
      smile: '微笑', refusal: '拒绝', vomit: '呕吐', blink: '闭眼',
      neutral: '放松', none: '无脸', waiting: '等待识别', error: '错误',
    },
    badge: {
      accepting: '接受中', refusing: '拒绝中', purging: '催吐中',
      defending: '防御中', noAction: '无动作', notDetected: '未检测',
    },

    startTagline: '高位截瘫，脖子以下全线停摆。护士照旧按时投喂，你只剩一张脸能表态——请珍惜这张脸。',
    startBtn: '开始并校准',
    demoBtn: '键盘演示（无摄像头）',
    faceDebugBtn: '面部调试',
    privacyNote: '摄像头画面只在本地处理。',
    settingsSaved: '已保存开发基准；开始游戏时会进行玩家校准。',
    loading: '加载中……',

    nurseLines: [
      '张嘴，这是为你好。',
      '听话，咽下去。',
      '医生说你缺营养。',
      '乖，就这一小口。',
      '你今天表现很棒哦。',
    ],
    defenseLines: ['咦？！', '你必须吃！', '别饿着。', '有人吗？'],
    outcomeSwallowed: '吞下去了。+10',
    outcomeRejected: '拒绝了。+10',
    outcomeSurreal: '可疑地好吃。+{n}',
    outcomeSurrealReject: '拒绝了。连击莫名保住了。',
    outcomeDeclined: '你拒绝了美食。',
    wrongBite: '想吐出来吗？！',
    rescueUp: '吐出来了。不适度 -{n}',
    rescueHeld: '吃进去了。不适恶化...',
    demoHint: 'S 微笑 · F 拒绝 · V 催吐 · B 闭眼 · 松开=放松',

    calStep: '校准 {n}/5 · {label}',
    calStartSampling: '开始采样',
    calSkip: '跳过',
    calSampling: '采样中……',
    calProgress: '采样中…… {s} 秒',
    calHintNeutral: '保持自然放松，点击开始采样。',
    calHintSmile: '保持微笑——微笑=吃下去。点按开始采样。',
    calHintFrown: '压低眉毛或撇嘴角——这就是拒绝。保持动作，点击开始采样。',
    calHintJaw: '张大嘴并保持——护士装没看见时的催吐预案。点击开始采样。',
    calHintBlink: '闭合双眼并保持——别指望这样能躲过这一切。点击开始采样。',
    calAltNeutral: '放松的脸',
    calAltSmile: '嘴角上扬的微笑',
    calAltFrown: '拒绝：压低眉毛或嘴角',
    calAltJaw: '张大嘴',
    calAltBlink: '闭合双眼',
    trialTitle: '小测试：{label}',
    trialIntro: '每出现一道菜就做出刚才的表情。{total} 道里做对 {need} 道就能继续。',
    trialRelaxed: '保持放松——脸上别做表情。',
    trialProgress: '第 {n} / {total} 道',
    trialHit: '识别到了！',
    trialMiss: '没识别到——下一道再试。',
    trialPass: '很好——这个表情能识别！',
    trialFail: '这个表情做得还不够，再测一次吧。',
    trialRetry: '重新测试',
    trialContinue: '下一个表情',
    trialStart: '开始测试',
    trialSkip: '跳过测试',
    trialCounting: '保持动作……',
    'Not enough fresh face samples. Face the camera and retry.': '有效样本不足，请面对镜头重试。',
    'Eye landmarks unavailable. Face the camera and retry.': '眼睑关键点不可用，请正对摄像头重试。',
    'Open and closed eyes are not distinct enough. Retry with both eyes fully closed.': '睁眼与闭眼区分不足，请完全闭合双眼后重试。',
    'Action is not distinct enough from other face. Hold the target pose and retry.': '动作与其他表情区分不足，请保持目标动作重试。',

    loadingCamera: '正在开启摄像头并加载模型……',
    couldNotStart: '无法开始',
    cameraHelp: '请授予摄像头权限，并用支持 WebRTC 的浏览器（桌面版 Chrome/Edge）打开。',

    gameoverTitle: '游戏结束',
    'result.sixtySeven': '?!67!?',
    'result.cthulhu': `你惊动了${GLITCH_NAME}`,
    cthulhuChant: 'NONONONONONONO WHY DON\'T YOU LOOK AT MEEEEEEE',
    'result.glutton': '大胃王',
    'result.vegetative': '植物人',
    'result.mask': '变相怪杰',
    'result.stillHungry': '我还能吃…',
    'result.sharpEyes': '火眼金睛',
    'result.pica': '异食癖',
    'result.observation': '留院观察',
    'resultHint.sixtySeven': '676767',
    'resultHint.cthulhu': '服从我！',
    'resultHint.glutton': '得分超过五百，且进食得分过半。',
    'resultHint.vegetative': '。。。',
    'resultHint.mask': '达成二十次连续有效反应。',
    'resultHint.stillHungry': '吃下了足够多让人不适的食物',
    'resultHint.sharpEyes': '明辨是非',
    'resultHint.pica': '你赢了。你的口味小众又变态',
    'resultHint.observation': '出院申请不予批准',
    resultCardAlt: '喂食结果卡',
    playAgain: '再玩一局',
    playAgainTitle: '同一玩家：保留当前校准',
    newPlayer: '新玩家',
    newPlayerTitle: '为其他玩家或新光线环境重新校准',
    saveCard: '保存结果卡',
    shareNote: '分享这一餐！',
    cardResultsTitle: '喂食结果',
    cardTheCrush: '强喂碾压局',
    cardScore: '得分',
    cardSurvived: '存活',
    cardSeconds: '{n}秒',
    cardBadBites: '咬错',
    cardMaxCombo: '最大连击',
  },
};

const browserStorage = () => typeof window === 'undefined' ? null : window.localStorage;
const browserLanguage = () => {
  try {
    return typeof navigator !== 'undefined' && /^zh/i.test(navigator.language || '') ? 'zh' : 'en';
  } catch { return 'en'; }
};

// Exposed for tests: every UI string in both languages (key-coverage contract).
export const UI_STRINGS = STRINGS;

function detectLanguage() {
  try {
    const saved = browserStorage()?.getItem(STORAGE_KEY);
    if (saved && LANGUAGES.includes(saved)) return saved;
  } catch { /* Storage unavailable: fall through to the browser language. */ }
  return browserLanguage();
}

let language = detectLanguage();
const listeners = new Set();

export function getLanguage() {
  return language;
}

export function setLanguage(next) {
  if (!LANGUAGES.includes(next)) throw new Error(`Unsupported language: ${next}`);
  if (next === language) return language;
  language = next;
  try { browserStorage()?.setItem(STORAGE_KEY, language); } catch { /* Session-only switch still works. */ }
  for (const listener of listeners) listener(language);
  return language;
}

export function toggleLanguage() {
  return setLanguage(language === 'en' ? 'zh' : 'en');
}

export function onLanguageChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Lookup with {name} interpolation; arrays and nested groups pass through.
// Resolution order: exact key first (English-string error keys contain dots),
// then dotted-path traversal for nested groups (face.smile -> STRINGS.face.smile).
// Unknown keys return the key itself, so pass-through error strings stay safe.
export function t(key, vars = {}) {
  const resolve = (group) => {
    if (group == null) return undefined;
    if (Object.prototype.hasOwnProperty.call(group, key)) return group[key];
    let value = group;
    for (const part of key.split('.')) {
      if (value == null || typeof value !== 'object') return undefined;
      value = value[part];
    }
    return value;
  };
  let value = resolve(STRINGS[language]);
  if (value == null) value = resolve(STRINGS.en);
  if (value == null) return key;
  if (typeof value !== 'string') return value;
  return value.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match);
}

// Gameplay face labels resolved against the active language.
export function faceLabel(state) {
  return t(`face.${state}`);
}

// Translate every [data-i18n] element (and optional title/aria attributes),
// the document title and the html lang attribute. Safe to call repeatedly.
export function applyI18nDom(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  if (typeof document !== 'undefined') {
    document.title = t('documentTitle');
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  }
}
