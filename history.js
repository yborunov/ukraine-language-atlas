(() => {
  const $ = id => document.getElementById(id);
  const svg = (name, attrs = {}, text) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', name);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
    if (text) el.textContent = text;
    return el;
  };
  const data = window.atlasData;
  if (!data) {
    $('map-note').textContent = 'Не вдалося завантажити дані карти. Оновіть сторінку.';
    return;
  }
  const { min, modern, width, height, history, modernCountries, ukraine, kyiv } = data;
  const slider = $('year-range'), number = $('year-number'), max = Number(slider.max);
  const names = window.atlasNames || {};
  const paths = $('polities'), labels = $('map-labels'), list = $('entity-list');
  const outline = $('ukraine-outline'), toggle = $('show-ukraine');
  const markers = [...document.querySelectorAll('[data-year]')];
  const palette = ['#a6ccae','#b2c5e1','#e7c194','#d3b8d7','#a0cacb','#e4a8a5','#d5cf92','#b5c5ad','#c7b5aa','#b5b9da','#d2cae8','#deb6a4'];
  const fixed = { 'Київська Русь':'#dca797', 'Україна':'#e8c571', 'Білорусь':'#b3c9a5', 'Польща':'#c5b5da', 'Росія':'#a9c3de' };
  const occupied = name => /occupation|occupied/i.test(name);
  const labelFor = name => names[name] || name;
  const colorFor = name => fixed[name] || palette[Array.from(name).reduce((n,c) => (n * 31 + c.codePointAt(0)) >>> 0, 0) % palette.length];
  const priority = new Set(['Київська Русь','Україна','Білорусь','Польща','Росія','Українська Народна Республіка','Запорозьке козацтво','Кримське ханство']);
  const byName = new Intl.Collator('uk');

  for (const row of modernCountries) $('land').append(svg('path', { class:'land', d:row[3], 'fill-rule':'evenodd' }));
  outline.setAttribute('d', ukraine);
  $('kyiv-marker').append(
    svg('circle', { cx:kyiv[0], cy:kyiv[1], r:4.5, fill:'#142f42', stroke:'#fff', 'stroke-width':1.6 }),
    svg('text', { x:kyiv[0]+9, y:kyiv[1]+5, class:'kyiv-name' }, 'Київ')
  );

  function drawLabels(rows) {
    const used = [[kyiv[0]-8, kyiv[1]-13, kyiv[0]+57, kyiv[1]+12]];
    const sorted = [...rows].sort((a,b) =>
      Number(priority.has(labelFor(b[0]))) - Number(priority.has(labelFor(a[0]))) || b[6]-a[6]);
    const seen = new Set();
    for (const [name,,, , x,y,area] of sorted) {
      const title = labelFor(name);
      if (seen.has(title) || occupied(name) || area < .85) continue;
      const size = area > 22 ? 23 : area > 5 ? 20 : 17;
      const half = title.length * size * .29 + 5;
      const b = [x-half,y-size*.7,x+half,y+size*.6];
      if (b[0]<5 || b[1]<4 || b[2]>width-5 || b[3]>height-4 ||
          used.some(a => b[0]<a[2] && b[2]>a[0] && b[1]<a[3] && b[3]>a[1])) continue;
      labels.append(svg('text', { x, y, class:'map-name', 'font-size':size, 'dominant-baseline':'middle' }, title));
      seen.add(title);
      used.push(b);
    }
  }

  let year, pending;
  function render(value) {
    year = Math.min(max, Math.max(min, Math.round(value)));
    slider.value = number.value = year;
    slider.setAttribute('aria-valuetext', `${year} рік`);
    $('year-display').textContent = year;
    $('prev-year').disabled = year === min;
    $('next-year').disabled = year === max;
    markers.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.year === 'now' ? year === max : Number(button.dataset.year) === year)));
    const isModern = year >= modern;
    $('map-title').textContent = `Східна Європа, ${year} рік`;
    $('era').textContent = isModern ? 'Сучасні кордони' : 'Історична реконструкція';
    $('map-note').textContent = isModern
      ? 'Міжнародно визнані кордони. Крим — частина України. Лінії військового контролю не показано.'
      : 'Межі за датуванням Cliopatria. Штрихування позначає окуповані території в джерелі, а не визнання суверенітету.';
    const rows = isModern ? modernCountries : history.filter(row => year >= row[1] && year <= row[2]);
    paths.replaceChildren();
    labels.replaceChildren();
    const shown = new Map();
    for (const [name,,,d,,,] of [...rows].sort((a,b) => b[6]-a[6])) {
      const title = labelFor(name);
      const fill = occupied(name) ? 'url(#occupation)' : colorFor(title);
      const path = svg('path', { d, fill, class:'polity', 'fill-rule':'evenodd' });
      path.append(svg('title', {}, title));
      paths.append(path);
      shown.set(title, occupied(name) ? '#b69386' : fill);
    }
    drawLabels(rows);
    list.replaceChildren(...[...shown].sort(([a],[b]) => byName.compare(a,b)).map(([title, fill]) => {
      const li = document.createElement('li'), swatch = document.createElement('span');
      swatch.className = 'swatch';
      swatch.style.backgroundColor = fill;
      swatch.setAttribute('aria-hidden', 'true');
      li.append(swatch,title);
      return li;
    }));
  }

  const play = $('play-timeline');
  let playback = null;
  function stop() {
    if (playback === null) return;
    cancelAnimationFrame(playback);
    playback = null;
    play.setAttribute('aria-pressed','false');
    play.textContent = '▶ Відтворити';
  }
  play.addEventListener('click', () => {
    if (playback !== null) { stop(); return; }
    select(min);
    play.setAttribute('aria-pressed','true');
    play.textContent = '❚❚ Пауза';
    let start;
    const tick = now => {
      start ??= now;
      const next = min + Math.floor(Math.min(1, (now-start)/14000)*(max-min));
      if (next !== year) render(next);
      if (next === max) { stop(); return; }
      playback = requestAnimationFrame(tick);
    };
    playback = requestAnimationFrame(tick);
  });

  function select(value) {
    stop();
    if (pending !== undefined) cancelAnimationFrame(pending);
    pending = undefined;
    render(value);
  }
  slider.addEventListener('input', () => {
    stop();
    $('year-display').textContent = number.value = slider.value;
    if (pending !== undefined) cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => { pending = undefined; render(slider.valueAsNumber); });
  });
  number.addEventListener('change', () => select(Number.isFinite(number.valueAsNumber) ? number.valueAsNumber : year));
  number.addEventListener('keydown', event => { if (event.key === 'Enter') number.blur(); });
  $('prev-year').addEventListener('click', () => select(slider.valueAsNumber-1));
  $('next-year').addEventListener('click', () => select(slider.valueAsNumber+1));
  markers.forEach(button => button.addEventListener('click', () => select(button.dataset.year === 'now' ? max : Number(button.dataset.year))));
  toggle.addEventListener('change', () => outline.setAttribute('display', toggle.checked ? 'inline' : 'none'));
  render(slider.valueAsNumber);
})();
