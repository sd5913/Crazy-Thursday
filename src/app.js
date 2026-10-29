import { nextMessage } from './logic.js';
let count = 0;
const button = document.querySelector('#signal');
button.addEventListener('click', () => {
  count += 1;
  document.body.classList.toggle('active');
  document.querySelector('#status').textContent = nextMessage(count);
});
