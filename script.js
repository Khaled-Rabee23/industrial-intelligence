const data={
 overall:[["السعودية","🇸🇦",91],["تركيا","🇹🇷",88],["ماليزيا","🇲🇾",84],["إندونيسيا","🇮🇩",81],["مصر","🇪🇬",78]],
 food:[["تركيا","🇹🇷",93],["مصر","🇪🇬",86],["إندونيسيا","🇮🇩",82],["ماليزيا","🇲🇾",79],["السعودية","🇸🇦",76]],
 textile:[["تركيا","🇹🇷",94],["إندونيسيا","🇮🇩",85],["مصر","🇪🇬",80],["ماليزيا","🇲🇾",75],["السعودية","🇸🇦",66]],
 water:[["السعودية","🇸🇦",96],["الإمارات","🇦🇪",92],["الكويت","🇰🇼",87],["قطر","🇶🇦",82],["البحرين","🇧🇭",77]]
};
function renderRanking(){const key=document.getElementById('sectorFilter').value;document.getElementById('rankingRows').innerHTML=data[key].map((r,i)=>`<tr><td>${i+1}</td><td><span class="country"><span class="flag">${r[1]}</span>${r[0]}</span></td><td class="score">${r[2].toFixed(1)}</td><td style="color:#176b52">↑ تحسن</td></tr>`).join('')}
document.getElementById('sectorFilter').addEventListener('change',renderRanking);renderRanking();
const countryData={"السعودية":[91,76,66,96],"مصر":[78,86,80,61],"تركيا":[88,84,94,58],"إندونيسيا":[81,82,85,52],"ماليزيا":[84,79,75,49]};
function renderCompare(){let a=document.getElementById('countryA').value,b=document.getElementById('countryB').value;let labels=['الصناعة العامة','الغذاء','الملابس','تحلية المياه'];let av=countryData[a],bv=countryData[b];document.getElementById('compareOutput').innerHTML=labels.map((l,i)=>`<div style="margin:14px 0"><b style="font-size:13px">${l}</b><div class="comp-row"><span>${a}</span><div class="bar"><i style="width:${av[i]}%"></i></div><b>${av[i]}</b></div><div class="comp-row"><span>${b}</span><div class="bar"><i style="width:${bv[i]}%"></i></div><b>${bv[i]}</b></div></div>`).join('')}
document.getElementById('countryA').addEventListener('change',renderCompare);document.getElementById('countryB').addEventListener('change',renderCompare);renderCompare();
document.querySelectorAll('[data-sector]').forEach(el=>el.addEventListener('click',()=>{document.getElementById('sectorFilter').value=el.dataset.sector;renderRanking()}));
document.getElementById('langBtn').addEventListener('click',()=>alert('النسخة الحالية عربية. يمكن إضافة ترجمة إنجليزية كاملة في المرحلة التالية.'));
