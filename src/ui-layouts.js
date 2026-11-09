// Full-scene review fixtures. Sample numbers are not saved game progress.
const $ = id => document.getElementById(id);
export const LAYOUTS = [
  { id: 'menu', title: '主菜单', note: '3D 病房背景、开始入口、玩法说明和制作人员。' },
  { id: 'prepare', title: '摄像头准备与教学', note: '检查摄像头状态，了解接受、拒绝和补救三种操作。此页是布局样例。' },
  { id: 'feeding', title: '正常喂食', note: '中央放大食物与倒计时，右上集中人脸、识别和恶心值，底部显示护士台词。' },
  { id: 'accepted', title: '判定：接受成功', note: '同一场景短暂显示本次结果与加分，随后继续下一口。' },
  { id: 'rejected', title: '判定：拒绝成功', note: '反馈拒绝动作生效，并显示正确拒绝异物的加分。' },
  { id: 'rescue', title: '误食与呕吐补救', note: '暂停喂食，画框变红震动，显示补救动作与剩余时间。' },
  { id: 'recovered', title: '补救结果', note: '显示补救成功和恶心值减轻，然后返回正常喂食。' },
  { id: 'paused', title: '暂停', note: '保留当前画面，提供继续、重新开始和返回主页。' },
  { id: 'report', title: '游戏结束', note: '展示得分、坚持时间、误食和成功补救次数。' },
];

const link = (id, label, primary = false) => `<a class="layout-button${primary ? ' primary' : ''}" href="ui-preview.html?layout=${id}">${label}</a>`;

export function mountLayout({ showScreen, openModal }) {
  const requested = new URLSearchParams(location.search).get('layout');
  const current = LAYOUTS.find(layout => layout.id === requested) || LAYOUTS[0];
  const id = current.id;
  document.title = `Crazy Thursday · ${current.title}`;
  $('app').classList.add('layout-review');
  $('app').dataset.layout = id;
  $('previewModeLabel').textContent = 'LAYOUT REVIEW · SAMPLE DATA · TIMERS FROZEN';
  $('faceDetail').textContent = 'Layout sample · enable camera to test live view';
  showScreen(id === 'menu' ? 'menu' : id === 'prepare' ? 'prepare' : id === 'report' ? 'report' : 'play');

  // Fixtures make all views reviewable independently, including transient states.
  $('scoreValue').textContent = '120';
  $('elapsed').textContent = '00:48';
  $('round').textContent = 'BITE 12';
  $('nauseaValue').textContent = '35 / 100';
  $('nauseaFill').style.width = '35%';
  $('itemName').textContent = 'CARAMEL PUDDING';
  $('foodImage').src = 'assets/food-png/02-caramel-pudding.png';
  $('foodImage').alt = 'Caramel pudding';
  $('prop').style.transform = 'scale(1.15)';
  $('biteFill').style.width = '60%';
  $('biteTime').textContent = '2.1s';
  $('inputValue').textContent = '— WAITING';
  $('dialogueText').textContent = 'Sugar fixes everything. Maybe.';

  if (id === 'prepare') {
    $('prepare').innerHTML = `<div class="intake-layout"><section class="paper intake-camera"><div class="paper-head">PATIENT CAMERA <span>SETUP PREVIEW</span></div><div class="intake-view"><span class="camera-face">＋_＋</span><p>POSITION YOUR FACE HERE</p><small>Camera off · layout sample</small></div><div class="intake-status"><span class="label">DETECTED EXPRESSION</span><strong>WAITING FOR CAMERA</strong><p>Keep your face visible and your room well lit.</p></div></section><section class="paper intake-guide"><div class="paper-head">BEFORE WE BEGIN <span>WARD 04</span></div><div class="paper-content"><p class="eyebrow">YOUR FACE. YOUR FATE.</p><h2>A quick check<br>before lunch.</h2><ol class="intake-steps"><li><b>01 / ACCEPT</b><span>Open your mouth for food.</span></li><li><b>02 / REFUSE</b><span>Close your mouth for strange objects.</span></li><li><b>03 / RESCUE</b><span>Stick out your tongue after a wrong bite.</span></li></ol><p class="notice">Intended facial controls shown for design review. The current playable UI demo uses S / F / V; camera input is display-only.</p><div class="button-row">${link('menu','← BACK')}${link('feeding','PREVIEW FEEDING →',true)}</div><a class="legacy-link" href="ui-preview.html">Test the interactive preview and camera ↗</a></div></section></div>`;
  }

  function resultPanel(title, message, detail, next, nextLabel) {
    $('prop').hidden = true;
    $('phaseLabel').textContent = 'OBSERVATION';
    $('biteTime').textContent = 'FEEDING PAUSED';
    $('play').insertAdjacentHTML('beforeend', `<section class="bite-result paper" role="status"><div class="paper-head">${title}<span>PATIENT RESPONSE</span></div><div class="paper-content"><div class="result-symbol">＋</div><h2>${message}</h2><p>${detail}</p><div class="button-row">${link(next,nextLabel,true)}</div></div></section>`);
  }
  if (id === 'accepted') {
    $('scoreValue').textContent = '130';
    $('inputValue').textContent = '▰ ACCEPTING';
    $('dialogueText').textContent = 'A model patient. We will make a note.';
    resultPanel('BITE ACCEPTED', 'GOOD CHOICE.', '+10 POINTS / PUDDING ACCEPTED', 'feeding', 'NEXT BITE →');
  }
  if (id === 'rejected') {
    $('scoreValue').textContent = '130';
    $('itemName').textContent = 'CACTUS';
    $('inputValue').textContent = '━ REFUSING';
    $('dialogueText').textContent = 'Fine. More vegetables for someone else.';
    resultPanel('ITEM REFUSED', 'NICE REFLEXES.', '+10 POINTS / CACTUS REFUSED', 'feeding', 'NEXT BITE →');
  }
  if (id === 'rescue') {
    $('app').dataset.phase = 'rescue';
    $('prop').hidden = true;
    $('rescue').hidden = false;
    $('rescueTime').textContent = '1.8s';
    $('rescueFill').style.width = '72%';
    $('phaseLabel').textContent = 'FEEDING PAUSED';
    $('itemName').textContent = 'CACTUS / WRONG BITE';
    $('biteTime').textContent = 'RECOVERY REQUIRED';
    $('nauseaValue').textContent = '60 / 100';
    $('nauseaFill').style.width = '60%';
    $('inputValue').textContent = '▼ RESCUE REQUIRED';
    $('dialogueText').textContent = 'Changed your mind? A little late.';
    $('rescue').querySelector('.rescue-instruction').innerHTML = 'TONGUE OUT <small>INTENDED ACTION / DEMO KEY V</small>';
    $('rescue').querySelector('.paper-content').insertAdjacentHTML('beforeend', `<div class="button-row">${link('recovered','PREVIEW SUCCESS →',true)}</div>`);
  }
  if (id === 'recovered') {
    $('nauseaValue').textContent = '45 / 100';
    $('nauseaFill').style.width = '45%';
    $('inputValue').textContent = '▼ RESCUE COMPLETE';
    $('dialogueText').textContent = 'Recovered. We will leave that off your chart.';
    resultPanel('RECOVERY SUCCESSFUL','CRISIS AVERTED.','NAUSEA −15 / BACK TO FEEDING','feeding','CONTINUE →');
  }
  if (id === 'paused') {
    openModal('FEEDING SUSPENDED', `<p class="eyebrow">SESSION ON HOLD</p><h2>Take a breath.</h2><p>Your lunch can wait. For once.</p><div class="pause-options">${link('feeding','RESUME FEEDING →',true)}${link('prepare','RESTART SESSION')}${link('menu','MAIN MENU')}</div>`);
    $('closeModal').addEventListener('click', () => location.assign('ui-preview.html?layout=feeding'));
    $('modal').addEventListener('cancel', event => { event.preventDefault(); location.assign('ui-preview.html?layout=feeding'); });
  }
  if (id === 'report') {
    $('finalScore').textContent = '240';
    $('finalTime').textContent = '02:38';
    $('finalWrong').textContent = '3';
    $('finalRescues').textContent = '2';
  }

  // Route review controls between static layouts; no hidden game loop is started.
  document.addEventListener('click', event => {
    const command = event.target.closest('[data-action]')?.dataset.action;
    const pause = event.target.closest('#pauseButton');
    if (!command && !pause) return;
    const destination = pause ? 'paused' : { prepare:'prepare', menu:'menu', play:'feeding', resume:'feeding', leave:'menu', finish:'report' }[command];
    if (!destination) return;
    event.preventDefault(); event.stopImmediatePropagation();
    location.assign(`ui-preview.html?layout=${destination}`);
  }, true);
}
