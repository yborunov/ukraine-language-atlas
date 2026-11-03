(() => {
  const $ = id => document.getElementById(id);
  const data = window.cityLanguages, boundaries = window.modernBoundaries;
  if (!data || !boundaries) {
    $('layer-note').textContent = 'Не вдалося завантажити карту. Оновіть сторінку.';
    return;
  }
  const make = (tag, attrs = {}, content, svg = false) => {
    const node = svg ? document.createElementNS('http://www.w3.org/2000/svg',tag) : document.createElement(tag);
    for (const [k,v] of Object.entries(attrs)) node.setAttribute(k,v);
    if (content !== undefined) node.textContent = content;
    return node;
  };
  const svg = (tag,attrs,content) => make(tag,attrs,content,true);
  for (const [d] of Object.values(boundaries)) $('city-land').append(svg('path',{d,'fill-rule':'evenodd'}));
  const cities = [...data.cities,...data.absent];
  const answers = data.responses.map(([name,color,values])=>[name,color,values.split(' ')]);
  const city = $('pick-city'), mode = $('city-mode'), markers = new Map();
  const unreported = '#e4e8e8';
  const scale = ['#f0eafa','#e0d1ef','#bd9dd6','#9366b1','#683c85'];
  const fmt = v => v === '-' ? '—' : v+'%';
  const level = v => v === '-' ? -1 : v === '<1' ? 0 : +v < 10 ? 1 : +v < 40 ? 2 : +v < 70 ? 3 : 4;
  const lead = i => Number(answers[0][2][i]) >= Number(answers[1][2][i]) ? 0 : 1;
  const citySort = new Intl.Collator('uk');
  for (const [name,i] of cities.map(([name],i)=>[name,i]).sort(([a],[b])=>citySort.compare(a,b))) {
    city.add(make('option',{value:i},name));
  }
  mode.add(make('option',{value:'lead'},'Найчастіше названа мова'));
  for (const [i,[name]] of answers.entries()) {
    if (i < 7) mode.add(make('option',{value:i},name+' · частка'));
  }
  const left = new Set(['Луцьк','Львів','Тернопіль','Хмельницький','Полтава','Кривий Ріг','Миколаїв','Одеса','Севастополь']);
  const down = new Set(['Житомир','Тернопіль','Севастополь','Чернівці','Маріуполь','Львів']);
  cities.forEach(([name,lon,lat,major],i)=>{
    const x = 32+(lon-22)*43, y = 28+(52.5-lat)*66;
    const missing = i >= data.cities.length;
    const radius = major ? 9 : 6.7;
    const g = svg('g',{
      class:'city-pin'+(major?' major':'')+(missing?' no-data':''),
      'data-city':i,role:'button',tabindex:0,
      transform:`translate(${x.toFixed(1)} ${y.toFixed(1)})`
    });
    const title = svg('title',{},name);
    const dot = svg('circle',{r:radius,class:'dot'});
    g.append(title,svg('circle',{r:16,class:'hit'}),svg('circle',{r:radius+3,class:'ring'}),dot,
      svg('text',{x:left.has(name)?-12:12,y:down.has(name)?19:-10,'text-anchor':left.has(name)?'end':'start','aria-hidden':'true'},name));
    g.addEventListener('click',()=>select(i));
    g.addEventListener('keydown',e=>{
      if (e.key==='Enter'||e.key===' ') { e.preventDefault(); select(i); }
    });
    $('city-markers').append(g);
    markers.set(i,{g,title,dot});
  });
  function select(i) {
    city.value = i;
    $('city-title').textContent = cities[i][0];
    for (const [key,{g}] of markers) g.setAttribute('aria-pressed',String(key===i));
    const available = i < data.cities.length;
    $('city-multiple').hidden = !available;
    $('city-bars').replaceChildren();
    if (!available) {
      $('city-summary').textContent = 'Цього міста не було у вибірці муніципального опитування 2024 року.';
      return;
    }
    const [name,,values] = answers[lead(i)];
    $('city-summary').textContent = `Найчастіше називали: ${name.toLowerCase()} — ${fmt(values[i])} опитаних.`;
    for (const [name,color,values] of answers) {
      const value = values[i];
      const row = make('div',{class:'census-bar-row'});
      const label = make('div',{class:'census-bar-label'});
      label.append(make('span',{},name),make('strong',{},fmt(value)));
      row.append(label);
      if (value !== '-' && value !== '<1') {
        const track = make('div',{class:'census-track','aria-hidden':'true'});
        const bar = make('span');
        bar.style.width = value+'%';
        bar.style.backgroundColor = color;
        track.append(bar);
        row.append(track);
      }
      $('city-bars').append(row);
    }
  }
  function paint() {
    const leading = mode.value === 'lead';
    const row = leading ? null : answers[Number(mode.value)];
    $('layer-note').textContent = leading
      ? 'Колір точки показує, яку мову найчастіше називали в цьому місті. Натисніть точку для перегляду всіх часток.'
      : 'Колір точки показує частку опитаних, які назвали цю мову. Можна було вибрати кілька мов.';
    const keys = leading ? answers.slice(0,2).map(([name,color])=>[name,color])
      : [...['<1%','1–9%','10–39%','40–69%','70–100%'].map((name,i)=>[name,scale[i]]),['Прочерк у джерелі',unreported]];
    keys.push(['Місто не опитували','#fff']);
    $('city-legend').replaceChildren(...keys.map(([name,color])=>{
      const item = make('span',{class:'legend-item'}), swatch = make('span',{class:'swatch','aria-hidden':'true'});
      swatch.style.backgroundColor=color;
      item.append(swatch,name);
      return item;
    }));
    for (const [i,{g,title,dot}] of markers) {
      const missing = i >= data.cities.length;
      const [name,color,values] = row || answers[missing?0:lead(i)];
      const value = values[i];
      const info = cities[i][0] + ': ' + (missing ? 'не опитували' : name.toLowerCase()+' '+fmt(value));
      title.textContent = info;
      g.setAttribute('aria-label',info);
      dot.setAttribute('fill',missing?'#fff':leading?color:scale[level(value)]||unreported);
    }
  }
  city.addEventListener('change',()=>select(Number(city.value)));
  mode.addEventListener('change',paint);
  select(data.cities.findIndex(([name])=>name==='Київ'));
  paint();
})();
