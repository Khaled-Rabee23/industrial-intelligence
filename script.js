/* Frontend client for the local same-origin UNIDO CIP backend. */
const countries = [
  { name: 'السعودية', iso3: 'SAU', iso2: 'sa' },
  { name: 'مصر', iso3: 'EGY', iso2: 'eg' },
  { name: 'تركيا', iso3: 'TUR', iso2: 'tr' },
  { name: 'إندونيسيا', iso3: 'IDN', iso2: 'id' },
  { name: 'ماليزيا', iso3: 'MYS', iso2: 'my' }
];
const state = { results: new Map(), errors: new Map() };
const $ = id => document.getElementById(id);

// Flag images use ISO 3166-1 alpha-2 codes from FlagCDN.
function flagImg(iso2, countryName, className = 'flag-img') {
  const code = String(iso2 || '').toLowerCase();
  return `<img class="${className}" src="https://flagcdn.com/w40/${code}.png" srcset="https://flagcdn.com/w80/${code}.png 2x" alt="علم ${countryName}" loading="lazy" decoding="async">`;
}

function setStatus(message, type = '') {
  const el = $('apiStatus');
  if (!el) return;
  el.textContent = message;
  el.className = `api-status ${type}`.trim();
}
function fmt(value, digits = 3) {
  return Number(value).toLocaleString('en-US', { maximumFractionDigits: digits });
}
function renderOverview() {
  const el = $('cipOverview');
  if (!el) return;
  const rows = countries.map(country => ({ country, result: state.results.get(country.iso3) })).filter(x => x.result?.score);
  if (!rows.length) {
    el.innerHTML = '<p class="unavailable-note">لا توجد درجات CIP متاحة للعرض حالياً. راجع حالة الاتصال أدناه.</p>';
    return;
  }
  const max = Math.max(...rows.map(x => x.result.score.value));
  el.innerHTML = rows.map(({ country, result }) => {
    const width = max > 0 ? Math.max(2, result.score.value / max * 100) : 2;
    return `<div class="barrow"><span class="country-label">${flagImg(country.iso2, country.name)}${country.name}</span><div class="bar"><i style="width:${width}%"></i></div><b>${fmt(result.score.value, 4)}<small class="year">${result.score.year}</small></b></div>`;
  }).join('');
}
function renderRanking() {
  const body = $('rankingRows');
  if (!body) return;
  const rows = countries.map(country => ({ country, result: state.results.get(country.iso3) })).filter(x => x.result?.score)
    .sort((a, b) => a.result.rank && b.result.rank ? a.result.rank.value - b.result.rank.value : b.result.score.value - a.result.score.value);
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="4">لا توجد بيانات CIP قابلة للعرض حالياً.</td></tr>';
    return;
  }
  body.innerHTML = rows.map(({ country, result }, index) => {
    const rank = result.rank ? fmt(result.rank.value, 0) : String(index + 1);
    return `<tr><td>${rank}</td><td><span class="country">${flagImg(country.iso2, country.name, 'flag-img ranking-flag')}${country.name}</span></td><td class="score">${fmt(result.score.value, 4)}<span class="score-meta">${result.score.year}</span></td><td>UNIDO CIP</td></tr>`;
  }).join('');
  const source = $('rankingSource');
  if (source) source.textContent = 'المصدر: UNIDO Statistics Portal — CIP. سنة المشاهدة موضحة لكل دولة. الترتيب الرسمي من UNIDO متى توفر؛ وإلا ترتيب الدول الخمس حسب الدرجة.';
}
function renderCompare() {
  const el = $('compareOutput');
  if (!el) return;
  const a = countries.find(c => c.name === $('countryA')?.value) || countries[0];
  const b = countries.find(c => c.name === $('countryB')?.value) || countries[1];
  const ra = state.results.get(a.iso3), rb = state.results.get(b.iso3);
  if (!ra?.score || !rb?.score) {
    el.innerHTML = '<p class="unavailable-note">بيانات إحدى الدولتين غير متاحة للمقارنة حتى الآن.</p>';
    return;
  }
  const max = Math.max(ra.score.value, rb.score.value, 0.000001);
  const row = (country, result) => `<div class="comp-row"><span>${country.flag} ${country.name}</span><div class="bar"><i style="width:${Math.max(1, result.score.value / max * 100)}%"></i></div><b>${fmt(result.score.value, 4)}</b></div><small class="score-meta">CIP rank: ${result.rank ? fmt(result.rank.value, 0) : 'غير متاح'} · سنة ${result.score.year}</small>`;
  el.innerHTML = `<div><b>مؤشر الأداء الصناعي التنافسي (CIP)</b>${row(a, ra)}${row(b, rb)}</div>`;
}
async function loadUnidoData(force = false) {
  setStatus('جارٍ الاتصال بالخادم المحلي ثم تحميل بيانات CIP من UNIDO...', '');
  try {
    const response = await fetch(`/api/cip${force ? '?refresh=1' : ''}`, { headers: { Accept: 'application/json' } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail || payload.error || `HTTP ${response.status}`);
    state.results.clear();
    state.errors.clear();
    for (const item of payload.countries || []) {
      if (item.score) state.results.set(item.iso3, item);
      else state.errors.set(item.iso3, item.error || 'بيانات غير متاحة');
    }
    renderOverview(); renderRanking(); renderCompare();
    const successCount = state.results.size;
    if (successCount === countries.length) setStatus(`تم تحميل بيانات CIP للدول الخمس مباشرة من UNIDO (${successCount}/5).`, 'success');
    else if (successCount > 0) setStatus(`تم تحميل بيانات ${successCount} من ${countries.length} دول. بعض الطلبات لم تُرجع بيانات قابلة للعرض.`, 'error');
    else {
      const errors = [...state.errors.entries()].map(([iso, message]) => `${iso}: ${message}`).join(' | ');
      setStatus(`لم تُحمّل أي درجة CIP. ${errors || 'لا توجد تفاصيل إضافية.'}`, 'error');
    }
    console.info('UNIDO CIP response:', payload);
  } catch (error) {
    renderOverview(); renderRanking(); renderCompare();
    setStatus(`تعذر تحميل بيانات UNIDO عبر الخادم المحلي: ${error.message}. لم تُستخدم بيانات تجريبية.`, 'error');
    console.error('[CIP frontend]', error);
  }
}

$('countryA')?.addEventListener('change', renderCompare);
$('countryB')?.addEventListener('change', renderCompare);
$('sectorFilter')?.addEventListener('change', () => {
  if ($('sectorFilter').value !== 'overall') $('sectorFilter').value = 'overall';
  renderRanking();
});
document.querySelectorAll('[data-sector]').forEach(el => el.addEventListener('click', event => {
  event.preventDefault();
  if ($('sectorFilter')) $('sectorFilter').value = 'overall';
  document.querySelector('#rankings')?.scrollIntoView({ behavior: 'smooth' });
  setStatus('مؤشرات القطاعات التخصصية ليست جزءاً من مؤشر CIP؛ لن نعرض لها درجات غير موثقة.', '');
}));
$('langBtn')?.addEventListener('click', () => alert('النسخة الحالية عربية.'));
if (window.lucide) window.lucide.createIcons();
loadUnidoData();
