// Generate the share card and historical frames using the atlas's published boundaries.
const fs=require('node:fs'), {spawnSync}=require('node:child_process'), os=require('node:os'), path=require('node:path');
global.window={};
require('../history-data.js');
const {history,modernCountries,ukraine,kyiv,modern}=window.atlasData;
const years=[882,1000,1120,1240,1300,1385,1450,1500,1560,1580,1670,1750,1795,1850,1914,1919,1939,1945,1990,1992,2026];
const colors=['#a9c9b6','#c4b8d4','#e6c496','#a9bfdb','#d9afa3','#c4cb99','#abcacc'];
const color=n=>n==='Ukraine'?'#f5ca60':colors[Array.from(n).reduce((v,c)=>(v*31+c.codePointAt(0))>>>0,0)%colors.length];
function map(y){
 const rows=(y>=modern?modernCountries:history.filter(r=>r[1]<=y&&r[2]>=y)).slice().sort((a,b)=>b[6]-a[6]);
 return `<svg x="548" y="36" width="610" height="515" viewBox="10 -12 930 810">
 <rect x="0" y="-12" width="960" height="820" fill="#bfd9e5"/>
 <g fill="#e3e8db" fill-rule="evenodd">${modernCountries.map(r=>`<path d="${r[3]}"/>`).join('')}</g>
 <g fill-rule="evenodd" stroke="#f8f4e8" stroke-width="2">${rows.map(r=>`<path fill="${color(r[0])}" d="${r[3]}"/>`).join('')}</g>
 <path d="${ukraine}" fill="none" stroke="#1a405c" stroke-width="4" stroke-dasharray="${y>=modern?'0':'9 6'}"/>
 <circle cx="${kyiv[0]}" cy="${kyiv[1]}" r="7" fill="#18384f" stroke="white" stroke-width="3"/>
 <text x="${kyiv[0]+13}" y="${kyiv[1]+7}" fill="#15334a" stroke="#fff" stroke-width="3" paint-order="stroke" font-family="Arial" font-weight="bold" font-size="24">Київ</text>
 </svg>`;
}
function card(y){
 const x=76+392*(y-882)/(2026-882);
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
 <rect width="1200" height="630" fill="#142f42"/>
 <rect x="76" y="73" width="49" height="5" rx="2" fill="#f4cb64"/>
 <g font-family="Arial, sans-serif">
 <text x="76" y="121" font-size="20" letter-spacing="3" font-weight="bold" fill="#a9cfdf">ІНТЕРАКТИВНИЙ АТЛАС</text>
 <g fill="#fff8e7" font-family="Georgia, serif" font-weight="bold" font-size="57"><text x="72" y="215">Мовний атлас</text><text x="72" y="294">України</text></g>
 <text x="76" y="348" fill="#c6dce6" font-size="24">Мови, говори й кордони</text>
 <text x="76" y="384" fill="#c6dce6" font-size="24">від Київської Русі до сьогодні</text>
 <text x="76" y="470" fill="#f4cb64" font-size="48" font-weight="bold">${y}</text>
 <line x1="76" x2="468" y1="504" y2="504" stroke="#597384" stroke-width="3"/>
 <line x1="76" x2="${x}" y1="504" y2="504" stroke="#f4cb64" stroke-width="3"/>
 <circle cx="${x}" cy="504" r="7" fill="#f4cb64"/>
 <text x="76" y="537" fill="#a9c5d5" font-size="17">882</text><text x="468" y="537" text-anchor="end" fill="#a9c5d5" font-size="17">2026</text>
 <line x1="548" x2="1158" y1="575" y2="575" stroke="#597384"/>
 <text x="548" y="602" fill="#b6d2df" font-size="15">Cliopatria / Seshat · CC BY 4.0  |  Natural Earth</text>
 </g>${map(y)}</svg>`;
}
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'atlas-share-'));
function run(bin,args){
 const r=spawnSync(bin,args,{stdio:'inherit'});
 if(r.status!==0)throw new Error(bin+' exited '+r.status);
}
async function main(){
try{
 const sharp=require('sharp');
 const frames=[];
 for(const [i,year] of years.entries()){
  const png=path.join(tmp,i+'.png');
  await sharp(Buffer.from(card(year))).png().toFile(png);
  frames.push(png);
 }
 fs.copyFileSync(frames.at(-1),'assets/atlas-share-v1.png');
 const args=frames.flatMap((f,i)=>['-delay',i===frames.length-1?'155':i===0?'75':'34',f]);
 run('magick',[...args,'-resize','840x441','-colors','96','-loop','0','-layers','Optimize','assets/atlas-timeline-v1.gif']);
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
