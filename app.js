// Eating the World — single-file app logic.
// Data model: DB[code] = { cuisine?, short:{food,dessert,beverage}, sel:{...} }
// Presence of a code = "has a page" (fills on the map). Edits live in localStorage (drafts);
// Publish POSTs to /api/publish, which commits data.json to the repo (owner-only via token).

const CATS = ['food', 'dessert', 'beverage'];

// --- pure helpers (also unit-tested in node) ---
function wikiCountry(name) {
  return 'https://en.wikipedia.org/wiki/' + encodeURIComponent(name.replace(/ /g, '_'));
}
function wikiCuisine(demonym, override) {
  // cuisine articles are "<Demonym>_cuisine" (e.g. French_cuisine). Override paste-field covers the
  // few demonyms the dataset spells oddly.
  if (override) return override;
  return 'https://en.wikipedia.org/wiki/' + encodeURIComponent(demonym + '_cuisine');
}
function parseList(text) {
  return text.split('\n').map(s => s.trim()).filter(Boolean);
}
function parseSelected(text) {
  // one per line: "Name | url | note" — url and note both optional, any order after the name.
  return parseList(text).map(line => {
    const [n, ...rest] = line.split('|').map(s => s.trim());
    const u = rest.find(isUrl) || '';
    const note = rest.filter(p => p && p !== u).join(' | ');
    return { n, u, note };
  });
}
function formatSelected(arr) {
  return (arr || []).map(x => [x.n, x.u, x.note].filter(Boolean).join(' | ')).join('\n');
}
function googleUrl(country, dish) {
  return 'https://www.google.com/search?q=' + encodeURIComponent(country + ' ' + dish + ' recipe');
}
function isUrl(s) {
  return /^https?:\/\//.test(s || '');
}

if (typeof module !== 'undefined') module.exports = { wikiCountry, wikiCuisine, parseList, parseSelected, formatSelected, googleUrl, isUrl };

// --- browser app (skipped under node so the helpers stay testable) ---
if (typeof document !== 'undefined') {
  const REGION = new Intl.DisplayNames(['en'], { type: 'region' }); // native code→name, no data file
  const NAME = code => { try { return REGION.of(code) || code; } catch { return code; } };

  const $ = sel => document.querySelector(sel);
  const el = (tag, props, html) => Object.assign(document.createElement(tag), props, html != null ? { innerHTML: html } : {});

  let DB = JSON.parse(localStorage.getItem('food-db') || 'null');
  let research = false;
  const save = () => localStorage.setItem('food-db', JSON.stringify(DB));
  const has = code => DB[code] && (DB[code].short || DB[code].sel || DB[code].cuisine);
  const complete = code => !!(DB[code] && DB[code].cooked); // orange/✓ = actually cooked, not just planned
  const blank = () => ({ cuisine: '', short: { food: [], dessert: [], beverage: [] }, sel: { food: [], dessert: [], beverage: [] } });

  const map = new jsVectorMap({
    selector: '#map', map: 'world', zoomOnScroll: false, zoomButtons: true, zoomMax: 12,
    regionStyle: { initial: { fill: '#e9e3d6' }, hover: { fill: '#d9cfba' } },
    onRegionClick: (e, code) => { location.hash = code; },
    onRegionTooltipShow: (e, tip, code) => tip.text(NAME(code) + (complete(code) ? ' ✓' : '')),
    onLoaded: () => paintMap(),   // jsVectorMap builds regions async — paint only once they exist
  });

  // ponytail: country universe = Worldometer's 195 (193 UN members + Vatican + Palestine), matching
  // the user's spreadsheet. The keys double as the demonym lookup, so one map is the single source of
  // truth. Add back territories (TW, HK, GL, PR…) here if you cook them as distinct cuisines.
  // Demonyms from the world-countries dataset; a few read oddly (Cape Verdian, Maldivan) — fix per
  // country via the cuisine-override field if the Wikipedia link misses.
  const DEM = { AD:'Andorran', AE:'Emirati', AF:'Afghan', AG:'Antiguan, Barbudan', AL:'Albanian', AM:'Armenian', AO:'Angolan', AR:'Argentine', AT:'Austrian', AU:'Australian', AZ:'Azerbaijani', BA:'Bosnian, Herzegovinian', BB:'Barbadian', BD:'Bangladeshi', BE:'Belgian', BF:'Burkinabe', BG:'Bulgarian', BH:'Bahraini', BI:'Burundian', BJ:'Beninese', BN:'Bruneian', BO:'Bolivian', BR:'Brazilian', BS:'Bahamian', BT:'Bhutanese', BW:'Motswana', BY:'Belarusian', BZ:'Belizean', CA:'Canadian', CD:'Congolese', CF:'Central African', CG:'Congolese', CH:'Swiss', CI:'Ivorian', CL:'Chilean', CM:'Cameroonian', CN:'Chinese', CO:'Colombian', CR:'Costa Rican', CU:'Cuban', CV:'Cape Verdian', CY:'Cypriot', CZ:'Czech', DE:'German', DJ:'Djibouti', DK:'Danish', DM:'Dominican', DO:'Dominican', DZ:'Algerian', EC:'Ecuadorean', EE:'Estonian', EG:'Egyptian', ER:'Eritrean', ES:'Spanish', ET:'Ethiopian', FI:'Finnish', FJ:'Fijian', FM:'Micronesian', FR:'French', GA:'Gabonese', GB:'British', GD:'Grenadian', GE:'Georgian', GH:'Ghanaian', GM:'Gambian', GN:'Guinean', GQ:'Equatorial Guinean', GR:'Greek', GT:'Guatemalan', GW:'Guinea-Bissauan', GY:'Guyanese', HN:'Honduran', HR:'Croatian', HT:'Haitian', HU:'Hungarian', ID:'Indonesian', IE:'Irish', IL:'Israeli', IN:'Indian', IQ:'Iraqi', IR:'Iranian', IS:'Icelander', IT:'Italian', JM:'Jamaican', JO:'Jordanian', JP:'Japanese', KE:'Kenyan', KG:'Kirghiz', KH:'Cambodian', KI:'I-Kiribati', KM:'Comoran', KN:'Kittitian or Nevisian', KP:'North Korean', KR:'South Korean', KW:'Kuwaiti', KZ:'Kazakhstani', LA:'Laotian', LB:'Lebanese', LC:'Saint Lucian', LI:'Liechtensteiner', LK:'Sri Lankan', LR:'Liberian', LS:'Mosotho', LT:'Lithuanian', LU:'Luxembourger', LV:'Latvian', LY:'Libyan', MA:'Moroccan', MC:'Monegasque', MD:'Moldovan', ME:'Montenegrin', MG:'Malagasy', MH:'Marshallese', MK:'Macedonian', ML:'Malian', MM:'Burmese', MN:'Mongolian', MR:'Mauritanian', MT:'Maltese', MU:'Mauritian', MV:'Maldivan', MW:'Malawian', MX:'Mexican', MY:'Malaysian', MZ:'Mozambican', NA:'Namibian', NE:'Nigerien', NG:'Nigerian', NI:'Nicaraguan', NL:'Dutch', NO:'Norwegian', NP:'Nepalese', NR:'Nauruan', NZ:'New Zealander', OM:'Omani', PA:'Panamanian', PE:'Peruvian', PG:'Papua New Guinean', PH:'Filipino', PK:'Pakistani', PL:'Polish', PS:'Palestinian', PT:'Portuguese', PW:'Palauan', PY:'Paraguayan', QA:'Qatari', RO:'Romanian', RS:'Serbian', RU:'Russian', RW:'Rwandan', SA:'Saudi Arabian', SB:'Solomon Islander', SC:'Seychellois', SD:'Sudanese', SE:'Swedish', SG:'Singaporean', SI:'Slovene', SK:'Slovak', SL:'Sierra Leonean', SM:'Sammarinese', SN:'Senegalese', SO:'Somali', SR:'Surinamer', SS:'South Sudanese', ST:'Sao Tomean', SV:'Salvadoran', SY:'Syrian', SZ:'Swazi', TD:'Chadian', TG:'Togolese', TH:'Thai', TJ:'Tadzhik', TL:'East Timorese', TM:'Turkmen', TN:'Tunisian', TO:'Tongan', TR:'Turkish', TT:'Trinidadian', TV:'Tuvaluan', TZ:'Tanzanian', UA:'Ukrainian', UG:'Ugandan', US:'American', UY:'Uruguayan', UZ:'Uzbekistani', VA:'Vatican', VC:'Saint Vincentian', VE:'Venezuelan', VN:'Vietnamese', VU:'Ni-Vanuatu', WS:'Samoan', YE:'Yemeni', ZA:'South African', ZM:'Zambian', ZW:'Zimbabwean' };
  const ISO = Object.keys(DEM);
  const demonym = code => DEM[code] || NAME(code);
  const COUNTRIES = ISO.map(code => ({ code, name: NAME(code) })).sort((a, b) => a.name.localeCompare(b.name));
  const CODESET = new Set(ISO);
  // [lat,lng] for the 29 microstates the map can't draw — lets search still zoom to roughly where they are.
  const COORDS = {AD:[42.5,1.5],AG:[17.05,-61.8],BB:[13.17,-59.53],BH:[26,50.55],CV:[16,-24],DM:[15.42,-61.33],FM:[6.92,158.25],GD:[12.12,-61.67],KI:[1.42,173],KM:[-12.17,44.25],KN:[17.33,-62.75],LC:[13.88,-60.97],LI:[47.27,9.53],MC:[43.73,7.4],MH:[9,168],MT:[35.83,14.58],MU:[-20.28,57.55],MV:[3.25,73],NR:[-0.53,166.92],PW:[7.5,134.5],SC:[-4.58,55.67],SG:[1.37,103.8],SM:[43.77,12.42],ST:[1,7],TO:[-20,-175],TV:[-8,178],VA:[41.9,12.45],VC:[13.25,-61.2],WS:[-13.58,-172.33]};

  // macOS trackpad pinch arrives as ctrl+wheel — zoom the map, not the browser.
  // Plain two-finger scroll has no ctrlKey, so it passes through to the page.
  $('#map').addEventListener('wheel', e => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    map._setScale(map.scale * Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });

  function paintMap() {
    for (const code in map.regions) {                    // empty until onLoaded; no-op before then
      map.regions[code].element.setStyle('fill',
        complete(code) ? '#d2691e' : has(code) ? '#f0d9c0' : '#e9e3d6');
    }
  }

  function render() {
    const code = decodeURIComponent(location.hash.slice(1));
    const panel = $('#panel');
    if (!CODESET.has(code)) { panel.innerHTML = '<p class="muted">Pick a country on the map or search above.</p>'; return; }
    if (research && !DB[code]) { DB[code] = blank(); save(); paintMap(); }
    const c = DB[code];
    const name = NAME(code);

    panel.innerHTML = '';
    panel.append(el('h2', {}, name));
    if (!c) {
      panel.append(el('p', { className: 'muted' }, 'No page yet. Switch to Research mode to start one.'));
      return;
    }
    const links = el('p', { className: 'links' });
    links.append(el('a', { href: wikiCountry(name), target: '_blank', rel: 'noopener' }, 'Wikipedia ↗'));
    links.append(el('a', { href: wikiCuisine(demonym(code), c.cuisine), target: '_blank', rel: 'noopener' }, demonym(code) + ' cuisine ↗'));
    const url = location.origin + location.pathname + '#' + code;
    const share = el('button', { style: 'margin-left:1rem' }, 'Share');
    share.onclick = async () => {
      try {
        if (navigator.share) return await navigator.share({ title: 'Eating the World — ' + name, url });
        await navigator.clipboard.writeText(url);
        share.textContent = 'Copied ✓'; setTimeout(() => share.textContent = 'Share', 1500);
      } catch { /* user dismissed share sheet */ }
    };
    links.append(share);
    panel.append(links);

    if (research) {
      const cb = el('input', { type: 'checkbox', checked: !!c.cooked });
      cb.onchange = () => { c.cooked = cb.checked; save(); paintMap(); render(); };
      const cl = el('label', { style: 'display:flex;gap:.4rem;align-items:center;margin:.3rem 0;font-weight:600' });
      cl.append(cb, ' Cooked');
      panel.append(cl);
      const ov = el('input', { value: c.cuisine || '', placeholder: 'paste real cuisine-page URL (optional)', style: 'width:100%;padding:.3rem;border:1px solid #e3ddd2;border-radius:6px;margin-bottom:.5rem' });
      ov.oninput = () => { c.cuisine = ov.value.trim(); save(); };
      panel.append(ov);
    }

    CATS.forEach(cat => panel.append(catBlock(code, cat)));

    if (research) {
      const del = el('button', {}, 'Delete page');
      del.onclick = () => { if (confirm(`Delete ${name}?`)) { delete DB[code]; save(); paintMap(); location.hash = ''; } };
      panel.append(el('div', { className: 'cat' })).append(del);
    }
  }

  function catBlock(code, cat) {
    const c = DB[code], box = el('div', { className: 'cat' });
    box.append(el('h3', {}, cat));
    if (research) {
      box.append(el('label', {}, 'Shortlist (one dish per line)'));
      const sl = el('textarea', { value: (c.short[cat] || []).join('\n') });
      const chips = el('div', { className: 'chips' });
      const fillChips = () => {
        chips.innerHTML = '';
        parseList(sl.value).forEach(n => chips.append(
          el('a', { className: 'chip', href: googleUrl(NAME(code), n), target: '_blank', rel: 'noopener' }, '🔎 ' + n)));
      };
      sl.oninput = () => { c.short[cat] = parseList(sl.value); save(); fillChips(); };
      box.append(sl);
      fillChips();
      box.append(chips);
      box.append(el('label', { style: 'display:block;margin-top:.5rem' }, 'Selected (one per line: Name | url | how you made it — url & note both optional)'));
      const se = el('textarea', { value: formatSelected(c.sel[cat]) });
      se.oninput = () => { c.sel[cat] = parseSelected(se.value); save(); paintMap(); };
      box.append(se);
    } else {
      const picks = el('div', { className: 'pick' });
      (c.sel[cat] || []).forEach(x => {
        const url = isUrl(x.u) ? x.u : '';
        const note = x.note || (x.u && !isUrl(x.u) ? x.u : ''); // tolerate old data where a note sat in u
        const item = el('div');
        item.append(url
          ? el('a', { href: url, target: '_blank', rel: 'noopener' }, x.n + ' ↗')
          : el('span', {}, x.n));
        if (note) item.append(el('div', { className: 'note' }, note));
        picks.append(item);
      });
      if (!(c.sel[cat] || []).length) picks.append(el('span', { className: 'muted' }, '—'));
      box.append(picks);
    }
    return box;
  }

  // search box doubles as the accessible country nav
  const search = $('#search'), results = $('#results');
  function showResults() {
    const q = search.value.trim().toLowerCase();
    const list = COUNTRIES.filter(c => c.name.toLowerCase().includes(q)).slice(0, 30);
    results.innerHTML = '';
    list.forEach(c => {
      const d = el('div', {}, c.name + (complete(c.code) ? ' ✓' : has(c.code) ? ' ·' : ''));
      d.onclick = () => {
        location.hash = c.code;
        if (map.regions[c.code]) map.setFocus({ region: c.code, animate: true });
        else if (COORDS[c.code]) map.setFocus({ coords: COORDS[c.code], scale: 6, animate: true }); // microstate: zoom to its spot
        results.classList.add('hide'); search.value = '';
      };
      results.append(d);
    });
    const r = search.getBoundingClientRect();
    results.style.left = r.left + 'px'; results.style.top = (r.bottom + 4) + 'px';
    results.classList.toggle('hide', !list.length);
  }
  search.oninput = showResults;
  search.onfocus = showResults;
  document.addEventListener('click', e => { if (e.target !== search && !results.contains(e.target)) results.classList.add('hide'); });

  $('#mode').onclick = () => {
    research = !research;
    $('#mode').classList.toggle('on', research);
    $('#mode').textContent = research ? 'Research mode ●' : 'Research mode';
    $('#token').classList.toggle('hide', !research);
    $('#publish').classList.toggle('hide', !research);
    $('#export').classList.toggle('hide', !research);
    $('#pull').classList.toggle('hide', !research);
    render();
  };

  // always-works escape hatch: download data.json to commit by hand (no GitHub needed)
  $('#export').onclick = () => {
    const a = el('a', { href: URL.createObjectURL(new Blob([JSON.stringify(DB, null, 2) + '\n'], { type: 'application/json' })), download: 'data.json' });
    a.click(); URL.revokeObjectURL(a.href);
  };

  // discard this device's drafts and reload the published data.json (avoids overwriting newer data)
  $('#pull').onclick = () => {
    if (confirm('Discard local drafts on this device and load the published version?')) {
      localStorage.removeItem('food-db'); location.reload();
    }
  };

  // token kept per-device so you only type it once
  $('#token').value = localStorage.getItem('edit-token') || '';
  $('#token').oninput = () => localStorage.setItem('edit-token', $('#token').value.trim());
  $('#publish').onclick = async () => {
    const btn = $('#publish'); btn.disabled = true; const was = btn.textContent; btn.textContent = 'Publishing…';
    let msg = 'Failed';
    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + $('#token').value.trim(), 'Content-Type': 'application/json' },
        body: JSON.stringify(DB),
      });
      msg = res.ok ? 'Published ✓ (live in ~1 min)' : res.status === 401 ? 'Bad token' : 'Failed';
    } catch { /* network */ }
    btn.textContent = msg;
    setTimeout(() => { btn.textContent = was; btn.disabled = false; }, 3000);
  };

  window.addEventListener('hashchange', render);

  // seed from committed data.json unless we have local edits
  (DB ? Promise.resolve() : fetch('data.json').then(r => r.json()).catch(() => ({})).then(d => { DB = d || {}; }))
    .then(() => { paintMap(); render(); });
}
