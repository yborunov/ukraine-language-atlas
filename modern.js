(() => {
  const $ = id => document.getElementById(id);
  const boundaries = window.modernBoundaries;
  const data = window.modernLanguageData;
  const census = window.modernCensus;
  if (!data || !boundaries || !census) {
    $('layer-note').textContent = 'Не вдалося завантажити карту. Оновіть сторінку.';
    return;
  }
  const { groups, languages, regions } = data;
  const survey = [
    ['Захід', 85, '#276d68', '07 56 46 26 61 21 68 77', 2, 5, 6, 2],
    ['Центр', 68, '#58a393', '05 18 59 74 53 35 71 32 30', 11, 18, 3, 0],
    ['Південь', 39, '#9cc9b4', '12 23 48 65 51', 24, 33, 4, 0],
    ['Схід', 29, '#c4ddc7', '14 09 63', 32, 31, 8, 0]
  ];
  const censusNames = {
    uk:'Українська', ru:'Російська', be:'Білоруська', bg:'Болгарська',
    hy:'Вірменська', gg:'Гагаузька', ct:'Кримськотатарська', mo:'Молдовська',
    de:'Німецька', pl:'Польська', rm:'Ромська', ro:'Румунська',
    sk:'Словацька', hu:'Угорська', ka:'Караїмська', jw:'Єврейська (назва в переписі)',
    el:'Грецька', other:'Інша мова', unstated:'Не вказали мову'
  };
  const censusColors = ['#e4e7e7','#e7edf8','#cedcf1','#a8c3e4','#729ecf','#437bb6','#24578b'];
  const censusLegend = ['0%','< 0,01%','0,01–< 5%','5–< 20%','20–< 50%','50–< 80%','80–100%'];
  const censusSelect = $('pick-census');
  const percent = new Intl.NumberFormat('uk', {maximumFractionDigits:2});
  const integers = new Intl.NumberFormat('uk');
  const share = (count,total) => count / total * 100;
  const fmt = value => value > 0 && value < .01 ? '< 0,01%' : percent.format(value)+'%';
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
  for (const [code,label] of Object.entries(censusNames)) {
    censusSelect.add(el('option',{value:code},label,false));
  }
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
  let selected = '21', mode = 'census';
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
    showCensus(code);
    const response = surveyFor(code);
    $('region-survey').textContent = response
      ? `${response[0]}: українською — ${response[1]}%, російською — ${response[4]}%, обома однаково — ${response[5]}%, інша відповідь — ${response[6]}%, важко відповісти — ${response[7]}%. Це результати для макрорегіону, а не для окремої області чи міста.`
      : 'Крим і Севастополь не охоплено цим опитуванням.';
    for (const [key,hit] of hits) hit.setAttribute('aria-pressed',String(key===code));
  }
  function showCensus(code) {
    const {total, ...counts} = census[code];
    const other = total - counts.uk - counts.unstated;
    $('census-summary').textContent = `Українська — ${fmt(share(counts.uk,total))}; інші мови разом — ${fmt(share(other,total))}; не вказали — ${fmt(share(counts.unstated,total))}. Це відповіді про рідну мову у 2001 році, а не оцінка сучасного вжитку.`;
    const ranked = Object.entries(counts).sort((a,b) => b[1]-a[1]);
    const leading = [['uk',counts.uk], ...ranked.filter(([key,count]) => !['uk','unstated'].includes(key) && count > 0).slice(0,4)];
    $('census-bars').replaceChildren(...leading.map(([key,count])=>{
      const value = share(count,total);
      const row = el('div',{class:'census-bar-row'},'',false);
      const label = el('div',{class:'census-bar-label'},'',false);
      label.append(el('span',{},censusNames[key],false),el('strong',{},fmt(value),false));
      const track = el('div',{class:'census-track','aria-hidden':'true'},'',false);
      const bar = el('span',{class:key==='uk'?'census-uk':''},'',false);
      bar.style.width = value+'%';
      track.append(bar);
      row.append(label,track);
      return row;
    }));
    $('census-table').replaceChildren(...ranked.map(([key,count])=>{
      const row = el('tr',{},'',false);
      row.append(el('th',{scope:'row'},censusNames[key],false),
        el('td',{},fmt(share(count,total)),false),el('td',{},integers.format(count),false));
      return row;
    }));
  }

  function censusColor(value) {
    return censusColors[value===0 ? 0 : value<.01 ? 1 : value<5 ? 2 : value<20 ? 3 : value<50 ? 4 : value<80 ? 5 : 6];
  }

  function paint() {
    const target = languageSelect.value;
    const censusKey = censusSelect.value;
    $('census-control').hidden = mode !== 'census';
    $('language-control').hidden = mode !== 'languages';
    modeButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
    const legend = mode === 'census' ? censusLegend.map((label,i)=>[label,censusColors[i]])
      : mode === 'dialects'
      ? [...Object.values(groups),['Кілька наріч у межах області','repeating-linear-gradient(40deg,#b9d9a6 0 4px,#d1b9df 4px 8px)']]
      : mode === 'languages' ? [[target ? languages[target] : 'Є нанесені осередки',communityColor],['Осередки не нанесено',neutral]]
      : [...survey.map(([name,value,color])=>[`${name}: ${value}%`,color]),['Поза вибіркою',noSurvey]];
    $('layer-note').textContent = {
      census:`Частка населення, яке вказало цю мову рідною у переписі 2001 року: ${censusNames[censusKey]}. Натисніть регіон, щоб побачити розподіл за мовами.`,
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
      const censusShare = share(census[code][censusKey],census[code].total);
      const fill = mode === 'census' ? censusColor(censusShare) : mode === 'dialects' ? (keys.length === 1 ? groups[keys[0]][1] : pattern(keys))
        : mode === 'languages' ? (activeCommunity ? communityColor : neutral)
        : (surveyFor(code)?.[2] || noSurvey);
      shape.setAttribute('fill',fill);
      const title = regions[code][0] + (mode === 'census' ? ': ' + fmt(censusShare) : '');
      shape.querySelector('title').textContent = title;
      hits.get(code).setAttribute('aria-label',title);
      markers.get(code)?.querySelector('circle').style.setProperty('fill', mode === 'dialects' ? '#193747' : fill);
    }
  }
  modeButtons.forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;paint();}));
  regionSelect.addEventListener('change',()=>select(regionSelect.value));
  languageSelect.addEventListener('change',paint);
  censusSelect.addEventListener('change',paint);
  select(selected);
  paint();
})();
