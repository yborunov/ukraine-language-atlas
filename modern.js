(() => {
  const $ = id => document.getElementById(id);
  const boundaries = window.modernBoundaries;
  const data = window.modernLanguageData;
  if (!data || !boundaries) {
    $('layer-note').textContent = 'Не вдалося завантажити карту. Оновіть сторінку.';
    return;
  }
  const { groups, languages, regions } = data;
  const survey = [
    ['Захід', 85, '#276d68', '07 56 46 26 61 21 68 77'],
    ['Центр', 68, '#58a393', '05 18 59 74 53 35 71 32 30'],
    ['Південь', 39, '#9cc9b4', '12 23 48 65 51'],
    ['Схід', 29, '#c4ddc7', '14 09 63']
  ];
  const noSurvey = '#dfe3e5', communityColor = '#c59cdb', neutral = '#e5e6e0';
  const cityCodes = new Set(['30','40']);
  const prominent = new Set(['21','46','74','53','63','14','51','43','65','12']);
  const ns = 'http://www.w3.org/2000/svg';
  function el(tag, attrs = {}, text = '', isSvg = true) {
    const node = isSvg ? document.createElementNS(ns, tag) : document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    if (text) node.textContent = text;
    return node;
  }
  const shapes = new Map(), hits = new Map(), markers = new Map();
  const collator = new Intl.Collator('uk');
  const regionSelect = $('pick-region'), languageSelect = $('pick-language');
  const usedLanguages = new Set(Object.values(regions).flatMap(r => r[4] || []));
  for (const [code, row] of Object.entries(regions).sort((a,b)=>collator.compare(a[1][0],b[1][0]))) {
    regionSelect.add(el('option',{value:code},row[0],false));
  }
  languageSelect.add(el('option',{value:''},'Усі нанесені мови',false));
  for (const code of [...usedLanguages].sort((a,b)=>collator.compare(languages[a],languages[b]))) {
    languageSelect.add(el('option',{value:code},languages[code],false));
  }
  function bind(node, code) {
    node.setAttribute('role','button');
    node.setAttribute('tabindex','0');
    node.setAttribute('aria-label',regions[code][0]);
    node.setAttribute('data-region',code);
    node.addEventListener('click', () => select(code));
    node.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(code); }
    });
    hits.set(code,node);
  }
  for (const [code, [d,x,y]] of Object.entries(boundaries)) {
    const [name, short] = regions[code];
    const shape = el('path',{d, class:'modern-region','fill-rule':'evenodd'});
    shape.append(el('title',{},name));
    if (!cityCodes.has(code)) bind(shape,code);
    else shape.setAttribute('aria-hidden','true');
    $('modern-regions').append(shape);
    shapes.set(code,shape);
    if (!cityCodes.has(code)) {
      const label = el('text',{class:'modern-label'+(prominent.has(code)?'':' secondary'),x,y},short);
      $('modern-labels').append(label);
    }
  }
  for (const code of cityCodes) {
    const [,x,y] = boundaries[code];
    const marker = el('g',{'aria-hidden':'true'});
    marker.append(el('circle',{cx:x,cy:y,r:4.2,class:'modern-city'}),el('text',{x:x+(code==='30'?20:-25),y:y-10,class:'modern-label'},regions[code][1]));
    $('modern-labels').append(marker);
    markers.set(code,marker);
    const hit = el('circle',{cx:x,cy:y,r:15,class:'modern-city-hit'});
    bind(hit,code);
    $('modern-regions').append(hit);
  }
  function pattern(keys) {
    const id = keys.join('-');
    if (!$(id)) {
      const p = el('pattern',{id,width:16,height:16,patternUnits:'userSpaceOnUse',patternTransform:'rotate(32)'});
      p.append(el('rect',{width:16,height:16,fill:groups[keys[0]][1]}),el('rect',{width:8,height:16,fill:groups[keys[1]][1]}));
      $('map-patterns').append(p);
    }
    return 'url(#'+id+')';
  }

  const surveyFor = code => survey.find(row => row[3].split(' ').includes(code));
  const modeButtons = [...document.querySelectorAll('[data-mode]')];
  let selected = '21', mode = 'dialects';
  function select(code) {
    selected = code;
    regionSelect.value = code;
    const [name,,,dialects,community=[],context=''] = regions[code];
    $('region-title').textContent = name;
    $('region-dialects').textContent = dialects;
    $('region-languages').textContent = community.length
      ? community.map(key=>languages[key]).join(', ')+'.'
      : 'Для цього регіону на карті не виділено окремого осередку. Це не означає, що тут немає інших мов.';
    $('region-context').textContent = context;
    $('region-context').hidden = !context;
    const response = surveyFor(code);
    $('region-survey').textContent = response
      ? `${response[0]}: ${response[1]}% опитаних повідомили, що зазвичай спілкуються вдома українською. Це показник для всього макрорегіону, а не для окремої області чи міста.`
      : 'Крим і Севастополь не охоплено цим опитуванням.';
    for (const [key,hit] of hits) hit.setAttribute('aria-pressed',String(key===code));
  }
  function paint() {
    const target = languageSelect.value;
    $('language-control').hidden = mode !== 'languages';
    modeButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
    const legend = mode === 'dialects'
      ? [...Object.values(groups),['Кілька наріч у межах області','repeating-linear-gradient(40deg,#b9d9a6 0 4px,#d1b9df 4px 8px)']]
      : mode === 'languages' ? [[target ? languages[target] : 'Є нанесені осередки',communityColor],['Осередки не нанесено',neutral]]
      : [...survey.map(([name,value,color])=>[`${name}: ${value}%`,color]),['Поза вибіркою',noSurvey]];
    $('layer-note').textContent = {
      dialects:'Колір позначає традиційні наріччя; штрихування — наявність кількох наріч у межах області.',
      languages:'Колір показує документований зв’язок громади з регіоном. Це не межі поширення мови й не частка мовців.',
      survey:'Частка опитаних, які зазвичай спілкуються вдома українською. Колір спільний для всього макрорегіону. Загалом: 63% українською, 13% російською, 19% обома однаково. Опитування охопило лише підконтрольну Україні територію.'
    }[mode];
    $('modern-legend').replaceChildren(...legend.map(([label,color])=>{
      const item=el('span',{class:'legend-item'},'',false);
      const swatch=el('span',{class:'swatch','aria-hidden':'true'},'',false);
      swatch.style.background=color;
      item.append(swatch,label);
      return item;
    }));
    for (const [code, shape] of shapes) {
      const [, ,keys, ,community=[]] = regions[code];
      const activeCommunity = target ? community.includes(target) : community.length > 0;
      const fill = mode === 'dialects' ? (keys.length === 1 ? groups[keys[0]][1] : pattern(keys))
        : mode === 'languages' ? (activeCommunity ? communityColor : neutral)
        : (surveyFor(code)?.[2] || noSurvey);
      shape.setAttribute('fill',fill);
      markers.get(code)?.querySelector('circle').style.setProperty('fill', mode === 'dialects' ? '#193747' : fill);
    }
  }
  modeButtons.forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;paint();}));
  regionSelect.addEventListener('change',()=>select(regionSelect.value));
  languageSelect.addEventListener('change',paint);
  select(selected);
  paint();
})();
