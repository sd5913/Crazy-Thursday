// Debug-only presentation; never changes model keys, settings or game labels.
export const DEBUG_TRANSLATIONS = [
  ['Both raw eye openness ratios must be at or below the configured limit (default 0.05).', '左右眼原始开合比例都须不超过配置上限（默认0.05）。'],
  ['Eye landmarks unavailable. Face the camera and retry.', '眼睑关键点不可用，请正对摄像头重试。'],
  ['Open and closed eyes are not distinct enough. Retry with both eyes fully closed.', '睁眼与闭眼的区分不足，请完全闭合双眼后重试。'],
  ['Eye openness limit', '眼睑开合比例上限'], ['Left eye openness ratio', '左眼开合比例'], ['Right eye openness ratio', '右眼开合比例'], ['leftEAR', '左眼开合比例'], ['rightEAR', '右眼开合比例'], ['Eyes', '眼部'], ['Mouth', '嘴部'], ['Brows', '眉毛'],
  ['left eye openness', '左眼剩余开合量'], ['right eye openness', '右眼剩余开合量'],
  ['Both Blink scores must reach the threshold. After calibration, both eyelid ratios must also be near the personal closed-eye reference.', '左右闭眼信号都须达标；玩家校准后，两眼眼睑比例还须接近个人闭眼参考。'],
  ['mouthSmileLeft', '左嘴角上扬'], ['mouthSmileRight', '右嘴角上扬'],
  ['mouthFrownLeft', '左嘴角下压'], ['mouthFrownRight', '右嘴角下压'],
  ['mouthPressLeft', '左侧抿嘴'], ['mouthPressRight', '右侧抿嘴'],
  ['jawOpen', '下颌张开'],
  ['eyeBlinkLeft', '左眼闭合'], ['eyeBlinkRight', '右眼闭合'],
  ['eyeSquintLeft', '左眼眯起'], ['eyeSquintRight', '右眼眯起'],
  ['eyeWideLeft', '左眼睁大'], ['eyeWideRight', '右眼睁大'],
  ['browDownLeft', '左眉下压'], ['browDownRight', '右眉下压'],
  ['browInnerUp', '眉毛内侧上抬'],
  ['browOuterUpLeft', '左眉外侧上抬'], ['browOuterUpRight', '右眉外侧上抬'],
  ["Not ranked. Gameplay reuses the latest valid face briefly and marks it lost after 400 ms.", "不参与动作排序；正式游戏会短暂复用上次有效结果，超过 400ms 无有效结果才视为丢脸。"],
  ["An actual inference returns no valid face.", "实际执行检测后，没有返回有效的人脸结果。"],
  ["Face is outside the frame or cannot be detected.", "人脸离开镜头或无法被检测。"],
  ["Fallback classification, not an independent model score.", "兜底分类；不是一个单独的模型分数。"],
  ["A face is detected, but none of the four actions meets all conditions.", "检测到人脸，但上面四种动作没有一项满足完整判定条件。"],
  ["Relax your face.", "放松脸部，没有明确动作。"],
  ["Selected if vomit, eyes closed and smile are inactive.", "呕吐、闭眼、微笑均未触发时选中。"],
  ["Raw refusal = max(average brow down, average mouth-corner down). Corrected, weighted refusal reaches its threshold while smile remains below its threshold.", "原始拒绝值 = max(左右眉毛下压平均值, 左右嘴角下压平均值)。校正、加权后 ≥ 拒绝阈值，且微笑判定值 &lt; 微笑阈值。"],
  ["Lower your brows or mouth corners.", "眉毛下压，或嘴角向下撇。"],
  ["Selected if vomit and eyes closed are inactive.", "呕吐、闭眼均未触发时选中。"],
  ["Smile score reaches its threshold and is at least refusal score + 0.05.", "微笑判定值 ≥ 微笑阈值，且 ≥ 拒绝判定值 + 0.05。"],
  ["Raise both mouth corners.", "嘴角向上扬。"],
  ["Selected if vomit is inactive. Defense requires continuous closure for the configured time (default 500 ms).", "呕吐未触发时选中；正式游戏防御还需连续闭眼达到配置时长（默认 500ms）。"],
  ["Average eye closure after correction and weighting reaches the threshold.", "左右闭眼信号平均值经校正、加权后 ≥ 闭眼阈值。"],
  ["Keep both eyes closed.", "闭合双眼。"],
  ["Highest priority. A new mouth-opening gesture is required during rescue; holding it does not repeatedly trigger.", "最高优先级；游戏救援阶段需重新做出一次张嘴动作，持续保持不会反复触发。"],
  ["Jaw opening after player correction and baseline weighting reaches the vomit threshold.", "张嘴信号经玩家校正和标准权重处理后 ≥ 呕吐阈值。"],
  ["Open your mouth wide.", "明显张大嘴。"],
  ["Decision score = corrected signal × baseline weight. Baseline-only mode uses raw signals. Thresholds follow the current configuration.", "判定值 = 玩家校正后的信号 × 标准权重；仅基准模式直接使用原始信号。阈值以当前配置为准。"],
  ["Five shared calibration steps, 1.5 seconds each. Median/P75 estimates player offset and amplitude without changing the baseline. Gain is limited to ±25%.", "五步共用校准，每步1.5秒；用中位数/P75估计玩家偏置与幅度，不修改开发基准。增益限幅为±25%。"],
  ["Corrected signal × weight = decision score. The top three signals are highlighted.", "校正值×标准权重=判定值；前三项高亮。"],

  ['MediaPipe 0.10.18 · single face · Developer baseline + session player correction', 'MediaPipe 0.10.18 · 单人脸 · 开发基准 + 玩家校正'],
  ['Face Debug', '面部调试'], ['Back to menu', '返回菜单'],
  ['Camera preview', '摄像头预览'], ['Face / expression', '当前识别结果'],
  ['Inference time', '推理耗时'], ['Detection FPS', '检测帧率'], ['Session elapsed', '运行时间'], ['Last inference', '最近检测时间'],
  ['Calibration', '玩家校准'], ['Start calibration', '开始校准'], ['Sample this step', '采样当前动作'], ['Cancel calibration', '取消校准'],
  ['Preview mode', '预览模式'], ['Baseline only', '仅开发基准'], ['Baseline + player correction', '基准 + 玩家校正'], ['Player correction', '玩家校正参数'],
  ['Recognition and tuning', '识别判定与调参'], ['Save developer baseline', '保存开发基准'], ['Reset developer baseline', '恢复默认基准'],
  ['Special States', '特殊状态'], ['Blink protect time (ms)', '眨眼保护时间（毫秒）'],
  ['Action / rank', '动作 / 排名'], ['Raw', '原值'], ['Corrected', '玩家校正值'], ['Weight', '标准权重'], ['Weighted', '判定值'], ['Threshold', '标准阈值'], ['Gate', '达标'], ['Status', '最终状态'], ['Checks / reason', '判定原因'],
  ['Raw signals', '原始信号'], ['Signal', '信号'], ['Value', '数值'], ['Event log', '事件日志'],
  ['States and trigger conditions', '状态与触发条件'], ['State', '状态'], ['Illustration', '示意图'], ['Gesture', '动作'], ['Trigger', '触发条件'], ['Priority / game behavior', '优先级 / 游戏行为'],
  ['Mouth open', '张嘴'], ['Eyes closed', '闭眼'], ['Lidded', '闭眼'], ['Smile', '微笑'], ['Refusal', '拒绝'], ['Neutral', '中性'], ['Relaxed', '放松'], ['No face', '无脸'], ['weight', '权重'], ['threshold', '阈值'], ['SMILE', '微笑'], ['REFUSAL', '拒绝'], ['VOMIT', '呕吐'], ['LIDDED', '闭眼'], ['RELAXED', '放松'], ['NO FACE', '无脸'], ['WAITING', '等待识别'], ['ERROR', '错误'],
  ['SELECTED', '已选中'], ['NOT SELECTED', '未选中'], ['OVERRIDDEN', '被优先级覆盖'], ['NOT OUTPUT', '未输出'], ['PASS', '通过'], ['BELOW', '未达标'], ['FAIL', '失败'],
  ['Camera running', '摄像头运行中'], ['Opening camera…', '正在开启摄像头…'], ['Loading face model…', '正在加载模型…'], ['Waiting for camera and model', '等待摄像头和模型'],
  ['No compatible player correction. Calibrate to compare.', '没有匹配的玩家校正，请先校准'],
  ['Inference found no face', '未检测到人脸'], ['Face detected', '已检测到人脸'], ['Not evaluated: no face', '无人脸，未判定'], ['Waiting for a valid detection', '等待有效检测'], ['Blink protect time not reached', '未达到眨眼保护时长'], ['No action satisfies all its conditions', '没有动作满足完整条件'],
  ['Action selected:', '已选动作：'], ['overridden by', '被覆盖：'], ['hold', '持续时间'], ['Sampling', '采样中'],
  ['smile vs refusal + 0.05', '微笑与拒绝 + 0.05 比较'], ['smile below threshold', '微笑低于阈值'], ['refusal', '拒绝'], ['smile', '微笑'], ['jaw', '张嘴信号'], ['eyes', '闭眼信号'],
  ['Player correction complete. Baseline unchanged; corrected preview enabled.', '玩家校正完成，开发基准未变，已启用校正预览'],
  ['Player correction is session-only. Save baseline separately if edited.', '玩家校正仅本次有效；修改基准后请单独保存'],
  ['Calibration stopped.', '校准已停止'], ['Ready for five-step game calibration (1.5 s per step).', '可开始五步校准，每步 1.5 秒'],
  ['Enter a weight from 0 to 3 and a threshold from 0 to 1.', '权重须为 0–3，阈值须为 0–1'], ['Blink protect time must be 200–1500 ms.', '眨眼保护时间须为 200–1500 毫秒'],
  ['Preview changed — click Apply to game to use these parameters in the game.', '预览参数已修改，保存开发基准后用于游戏'],
  ['Applied to game and saved on this browser. Player calibration still runs at game start.', '开发基准已保存，开始游戏时仍进行玩家校准'],
  ['Applied to game for this page. Storage unavailable: refresh will lose settings.', '已应用，存储不可用，刷新后丢失'],
  ['Default developer baseline restored. Player correction cleared; recalibrate.', '已恢复默认基准并清除玩家校正，请重新校准'],
  ['Loaded developer baseline. Player correction is separate.', '已加载开发基准，玩家校正独立计算'], ['Default developer baseline. Player calibration runs when starting the game.', '使用默认开发基准，开始游戏时进行玩家校准'],
  ['Keep a relaxed face. Click to sample.', '保持自然放松，点击采样'], ['Smile and hold. Click to sample.', '保持微笑，点击采样'], ['Lower your eyebrows or pull the mouth corners down, and hold.', '压低眉毛或嘴角，保持动作'], ['Open your mouth wide and hold. Click to sample.', '张大嘴并保持，点击采样'], ['Close both eyes and hold. Click to sample.', '闭合双眼并保持，点击采样'],
  ['Not enough fresh face samples. Face the camera and retry.', '有效样本不足，请面对镜头重试'], ['Action is not distinct enough from other face. Hold the target pose and retry.', '动作与其他表情区分不足，请保持动作重试'],
  ['Could not run Face Debug:', '调试启动失败：'], ['Requesting camera permission', '请求摄像头权限'], ['Camera ready; loading face model', '摄像头已就绪，加载模型'], ['Model ready', '模型已就绪'], ['detection started', '开始检测'], ['Recognition:', '识别：'], ['Debug settings:', '基准参数：'], ['Calibration sample:', '校准采样：'], ['Player correction:', '玩家校正：'], ['Baseline changed: player correction invalidated', '基准已改变，玩家校正失效'], ['Calibration cancelled; previous settings retained', '校准已取消，保留此前配置'], ['Calibration started: shared game algorithm; baseline stays unchanged', '开始校准，使用游戏共用算法，基准保持不变'],
];

export function translateDebugText(text, language) {
  if (text.includes('\n')) return text.split('\n').map((line) => translateDebugText(line, language)).join('\n');
  const aliases = { '微笑 / Smile': 'SMILE', '拒绝 / Refusal': 'REFUSAL', '呕吐 / Vomit': 'VOMIT', '闭眼 / Lidded': 'LIDDED', '放松 / Relaxed': 'RELAXED', '无脸 / No face': 'NO FACE' };
  for (const [label, canonical] of Object.entries(aliases)) text = text.replace(label, canonical);
  const exact = DEBUG_TRANSLATIONS.find(([en, zh]) => text.trim() === en || text.trim() === zh);
  if (exact) return language === 'zh' ? exact[1] : exact[0];
  if (language !== 'zh') return text;
  // Preserve JSON payloads and identifiers in logs; translate only their prefix.
  const jsonAt = text.indexOf('{');
  const source = jsonAt < 0 ? text : text.slice(0, jsonAt);
  const tail = jsonAt < 0 ? '' : text.slice(jsonAt);
  let result = source;
  for (const [en, zh] of [...DEBUG_TRANSLATIONS].sort((a, b) => b[0].length - a[0].length)) {
    result = result.split(en).join(zh);
  }
  return result + tail;
}

export function createDebugLanguage(view, button) {
  let language = 'en';
  const original = new WeakMap();
  const rendered = new WeakMap();
  function render() {
    observer.disconnect();
    const walker = document.createTreeWalker(view, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.parentElement.closest('script,style,option[value="en"],#debugLanguage')) continue;
      if (node.nodeValue !== rendered.get(node)) original.set(node, node.nodeValue);
      const text = translateDebugText(original.get(node) || node.nodeValue, language);
      node.nodeValue = text;
      rendered.set(node, text);
    }
    for (const el of view.querySelectorAll('[alt], [aria-label]')) {
      for (const attr of ['alt', 'aria-label']) {
        if (!el.hasAttribute(attr)) continue;
        const cacheKey = `debugOriginal${attr === 'alt' ? 'Alt' : 'Aria'}`;
        if (!el.dataset[cacheKey]) el.dataset[cacheKey] = el.getAttribute(attr);
        el.setAttribute(attr, translateDebugText(el.dataset[cacheKey], language));
      }
    }
    view.lang = language === 'zh' ? 'zh-CN' : 'en';
    button.textContent = language === 'en' ? '中文' : 'English';
    button.setAttribute('aria-label', language === 'en' ? 'Switch to Chinese' : '切换到英文');
    observer.observe(view, { childList: true, subtree: true, characterData: true });
  }
  const observer = new MutationObserver(render);
  const toggle = () => { language = language === 'en' ? 'zh' : 'en'; render(); };
  button.addEventListener('click', toggle);
  render();
  return () => { observer.disconnect(); button.removeEventListener('click', toggle); };
}
