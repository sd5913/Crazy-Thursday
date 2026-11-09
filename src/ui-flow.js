import { LAYOUTS } from './ui-layouts.js';
const $ = id => document.getElementById(id);
let index = 0;
$('flowNav').innerHTML = LAYOUTS.map((layout,i) => `<a href="#${layout.id}" data-step="${i}"><span>${String(i+1).padStart(2,'0')}</span>${layout.title}</a>`).join('');
function render() {
  index = Math.max(0, LAYOUTS.findIndex(layout => layout.id === location.hash.slice(1)));
  const layout = LAYOUTS[index];
  const url = `ui-preview.html?layout=${layout.id}`;
  $('flowTitle').textContent = layout.title;
  $('flowCount').textContent = `${String(index+1).padStart(2,'0')} / ${String(LAYOUTS.length).padStart(2,'0')}`;
  $('flowNote').textContent = layout.note;
  $('screenFrame').src = url;
  $('screenFrame').title = `${layout.title}完整布局`;
  $('openPage').href = url;
  $('previous').disabled = index === 0;
  $('next').disabled = index === LAYOUTS.length-1;
  document.querySelectorAll('[data-step]').forEach(link => {
    if (Number(link.dataset.step) === index) link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  });
}
$('previous').addEventListener('click',()=>location.hash = LAYOUTS[Math.max(0,index-1)].id);
$('next').addEventListener('click',()=>location.hash = LAYOUTS[Math.min(LAYOUTS.length-1,index+1)].id);
window.addEventListener('hashchange',render);
// Keep sidebar in sync if the reviewer clicks a button inside a page.
$('screenFrame').addEventListener('load',()=>{
  const id = new URL($('screenFrame').contentWindow.location.href).searchParams.get('layout');
  const nextIndex = LAYOUTS.findIndex(layout=>layout.id===id);
  if(nextIndex >= 0 && nextIndex !== index) location.hash = id;
});
render();
