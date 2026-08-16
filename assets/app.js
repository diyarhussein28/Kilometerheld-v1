/* ==========================================================================
   Kilometerheld — Fahrtenbuch-App
   Vanilla JS, 100 % client-side. No backend, no dependencies, no tracking.
   Data lives in localStorage. Monthly PDF is generated in the browser.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------------- Storage & state ---------------- */
  const DB_KEY = 'kilometerheld_v1';

  const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  const WEEKDAYS = ['So','Mo','Di','Mi','Do','Fr','Sa'];
  const FREE_TRIP_LIMIT = 15;

  function defaultDB() {
    return {
      plan: 'free',                    // 'free' | 'pro'
      settings: { name: '', company: '', email: '', street: '', city: '', annualCost: 7200 },
      vehicles: [],
      trips: [],                       // { id, vehicleId, date, from, to, purpose, type, kmStart, kmEnd, km, createdAt }
      seeded: false
    };
  }

  function loadDB() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && typeof d === 'object' && Array.isArray(d.trips)) return Object.assign(defaultDB(), d);
      }
    } catch (e) { /* corrupted -> fresh */ }
    const db = defaultDB();
    seedDemo(db);
    saveDB(db);
    return db;
  }

  function saveDB(db) {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) { toast('⚠ Speichern fehlgeschlagen – Browser-Speicher voll?', 'err'); }
  }

  /* ---------------- Demo data (first visit only) ---------------- */
  const DEMO_PLACES = ['Kunde: Müller GmbH', 'Kunde: Schmidt & Söhne', 'Druckerei Weber', 'Hauptbahnhof', 'Flughafen MUC', 'Zuhause', 'Supermarkt', 'Kita Sonnenschein', 'Werkstatt AutoFix', 'Baumarkt'];
  const DEMO_PURPOSE = ['Kundenbesuch', 'Arbeitsweg', 'Dienstreise', 'Einkauf', 'Privatfahrt', 'Werkstatt'];
  const DEMO_KM = [24, 9, 11, 16, 8, 31, 6, 14, 22, 9, 18, 7, 26, 12, 10, 29, 15, 13, 17, 8];

  function seedDemo(db) {
    const now = new Date();
    const vehId = 'veh-demo';
    db.vehicles = [{ id: vehId, name: 'Audi A4 Avant', plate: 'M-KH 2026', km: 15420 }];
    db.settings = { name: 'Max Mustermann', company: 'MM Consulting GmbH', email: '', street: 'Musterstraße 12', city: '80331 München', annualCost: 7200 };
    db.trips = [];
    let odo = 15420, i = 0;
    for (let d = 1; d <= now.getDate(); d++) {
      if (d % 7 === 0 || d % 4 === 3) continue;            // skip Sundays & every 4th day
      const purpose = DEMO_PURPOSE[i % DEMO_PURPOSE.length];
      const type = (purpose === 'Einkauf' || purpose === 'Privatfahrt' || purpose === 'Werkstatt') ? 'priv' : 'biz';
      const km = DEMO_KM[i % DEMO_KM.length];
      const date = new Date(now.getFullYear(), now.getMonth(), d);
      const from = (purpose === 'Arbeitsweg' && i % 2 === 1) ? 'Zuhause' : 'Büro';
      let to = DEMO_PLACES[i % DEMO_PLACES.length];
      if (to === from) to = DEMO_PLACES[(i + 1) % DEMO_PLACES.length];
      db.trips.push({
        id: 'trip-demo-' + d, vehicleId: vehId,
        date: isoDate(date),
        from, to, purpose,
        type, kmStart: odo, kmEnd: odo + km, km,
        createdAt: date.toISOString()
      });
      odo += km; i++;
    }
    db.vehicles[0].km = odo;
    db.seeded = true;
  }

  let db = loadDB();

  const state = {
    view: 'dashboard',
    month: todayISO().slice(0, 7),     // 'YYYY-MM'
    filter: 'all',
    search: '',
    selectedPlan: 'monthly',
    pendingConfirm: null
  };

  /* ---------------- Helpers ---------------- */
  function todayISO() {
    const n = new Date();
    return isoDate(n);
  }
  function isoDate(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function fmtDate(iso) {
    if (!iso) return '–';
    const p = iso.split('-');
    return p[2] + '.' + p[1] + '.' + p[0];
  }
  function monthLabel(ym) {
    const [y, m] = ym.split('-').map(Number);
    return MONTHS[m - 1] + ' ' + y;
  }
  function shiftMonth(ym, delta) {
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function truncate(s, n) {
    s = String(s || '');
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }
  function $(id) { return document.getElementById(id); }

  function tripsOfMonth(ym) {
    return db.trips
      .filter(t => t.date && t.date.slice(0, 7) === ym)
      .sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));
  }
  function vehicleById(id) { return db.vehicles.find(v => v.id === id); }

  function monthStats(trips) {
    const s = { total: 0, biz: 0, priv: 0, count: trips.length };
    trips.forEach(t => { s.total += t.km || 0; if (t.type === 'biz') s.biz += t.km || 0; else s.priv += t.km || 0; });
    s.share = s.total > 0 ? Math.round((s.biz / s.total) * 100) : 0;
    return s;
  }

  function toast(msg, type) {
    const w = $('toastWrap');
    const el = document.createElement('div');
    el.className = 'toast' + (type === 'err' ? '' : '');
    el.textContent = msg;
    w.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 320); }, 3400);
  }

  /* ---------------- Modal helpers ---------------- */
  function openModal(id) { $(id).style.display = 'flex'; }
  function closeModal(id) { $(id).style.display = 'none'; }
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeModal(b.dataset.close)));
  document.querySelectorAll('.modal-backdrop').forEach(m => m.addEventListener('mousedown', e => { if (e.target === m) m.style.display = 'none'; }));

  function askConfirm(title, text, fn) {
    $('confirmTitle').textContent = title;
    $('confirmText').textContent = text;
    state.pendingConfirm = fn;
    openModal('confirmModal');
  }

  /* ---------------- Router ---------------- */
  function setView(v) {
    state.view = v;
    document.querySelectorAll('.app-sidebar nav a').forEach(a => a.classList.toggle('active', a.dataset.view === v));
    ['dashboard', 'trips', 'vehicles', 'settings'].forEach(name => {
      $('view-' + name).style.display = name === v ? '' : 'none';
    });
    render();
  }

  /* ---------------- Render ---------------- */
  function render() { renderTop(); renderDashboard(); renderTrips(); renderVehicles(); renderSettings(); }

  function renderTop() {
    $('monthLabel').textContent = monthLabel(state.month);
    const isPro = db.plan === 'pro';
    $('topPlanBadge').textContent = isPro ? '★ Pro-Tarif' : 'Start-Tarif';
    $('topPlanBadge').className = 'badge ' + (isPro ? 'badge-pro' : 'badge-gray');
    $('sidePlanName').textContent = isPro ? 'Pro' : 'Start';
    $('sidePlanBadge').textContent = isPro ? '★ Pro' : 'Start';
    $('sidePlanBadge').className = 'badge ' + (isPro ? 'badge-pro' : 'badge-green');
  }

  function renderDashboard() {
    const trips = tripsOfMonth(state.month);
    const s = monthStats(trips);
    $('dashboardSub').textContent = s.count + ' Fahrten · ' + db.vehicles.length + ' Fahrzeug(e)';
    $('kpiTotal').innerHTML = s.total.toLocaleString('de-DE') + ' <small>km</small>';
    $('kpiTotalHint').textContent = s.count + ' Fahrten';
    $('kpiBiz').innerHTML = s.biz.toLocaleString('de-DE') + ' <small>km</small>';
    $('kpiBizHint').textContent = s.total ? Math.round(s.biz / s.total * 100) + ' % der Gesamt-km' : 'Noch keine Fahrten';
    $('kpiPriv').innerHTML = s.priv.toLocaleString('de-DE') + ' <small>km</small>';
    $('kpiPrivHint').textContent = s.total ? Math.round(s.priv / s.total * 100) + ' % der Gesamt-km' : 'Noch keine Fahrten';
    $('kpiShare').innerHTML = s.total ? s.share + ' <small>%</small>' : '–';

    // savings estimate
    const annual = Number(db.settings.annualCost) || 0;
    if (s.total && annual) {
      $('savingsYear').innerHTML = Math.round(annual * s.share / 100).toLocaleString('de-DE') + ' <small>€/Jahr</small>';
      $('savingsMonth').innerHTML = Math.round(annual * s.share / 100 / 12).toLocaleString('de-DE') + ' <small>€/Monat</small>';
    } else {
      $('savingsYear').textContent = '–';
      $('savingsMonth').textContent = '–';
    }

    // usage meter (free plan only)
    const usageBox = $('usageBox');
    if (db.plan === 'free') {
      usageBox.style.display = '';
      $('usageLabel').textContent = s.count + ' / ' + FREE_TRIP_LIMIT;
      $('usageBar').style.width = Math.min(100, s.count / FREE_TRIP_LIMIT * 100) + '%';
    } else {
      usageBox.style.display = 'none';
    }

    // reminder banner (current month only)
    const banner = $('reminderBanner');
    const isCurrent = state.month === todayISO().slice(0, 7);
    const lastTrip = trips[0]; // sorted desc
    if (isCurrent) {
      const lastDate = db.trips.length ? db.trips.reduce((m, t) => (t.date > m ? t.date : m), '') : null;
      if (!lastDate) {
        banner.style.display = 'flex';
        $('reminderTitle').textContent = 'Willkommen bei Kilometerheld!';
        $('reminderText').textContent = 'Lege dein Fahrzeug an und erfasse deine erste Fahrt – in unter einer Minute erledigt.';
      } else {
        const days = Math.floor((Date.now() - new Date(lastDate + 'T12:00:00').getTime()) / 86400000);
        if (days > 3) {
          banner.style.display = 'flex';
          $('reminderTitle').textContent = 'Dein letzter Eintrag ist ' + days + ' Tage her.';
          $('reminderText').textContent = 'Das Finanzamt liebt lückenlose Bücher. Trag deine Fahrten zeitnah nach – es dauert nur 10 Sekunden.';
        } else banner.style.display = 'none';
      }
    } else banner.style.display = 'none';

    // chart: last 14 days of selected month (clamped to today for current month)
    const chart = $('chart');
    chart.innerHTML = '';
    const [y, m] = state.month.split('-').map(Number);
    const today = new Date();
    const dim = new Date(y, m, 0).getDate();
    const endDay = (y === today.getFullYear() && m === today.getMonth() + 1) ? today.getDate() : dim;
    const days = [];
    for (let d = Math.max(1, endDay - 13); d <= endDay; d++) days.push(d);
    const byDay = {};
    trips.forEach(t => { const dd = Number(t.date.slice(8, 10)); if (!byDay[dd]) byDay[dd] = { biz: 0, priv: 0 }; if (t.type === 'biz') byDay[dd].biz += t.km || 0; else byDay[dd].priv += t.km || 0; });
    let max = 1;
    days.forEach(d => { const v = byDay[d]; if (v) max = Math.max(max, v.biz + v.priv); });
    days.forEach((d, i) => {
      const v = byDay[d] || { biz: 0, priv: 0 };
      const col = document.createElement('div');
      col.className = 'chart-col';
      col.title = d + '. ' + MONTHS[m - 1] + ': ' + v.biz + ' km geschäftlich, ' + v.priv + ' km privat';
      const bars = document.createElement('div');
      bars.className = 'chart-bars';
      const h = (v.biz + v.priv) / max * 100;
      if (h > 0) {
        bars.innerHTML =
          '<div class="chart-seg-biz" style="height:' + (v.biz / max * 100) + '%"></div>' +
          '<div class="chart-seg-priv" style="height:' + (v.priv / max * 100) + '%"></div>';
      }
      const lbl = document.createElement('span');
      lbl.className = 'lbl';
      lbl.textContent = (i % 3 === 0) ? String(d) : '';
      col.appendChild(bars); col.appendChild(lbl);
      chart.appendChild(col);
    });

    // recent trips
    $('recentTrips').innerHTML = tripListHTML(trips.slice(0, 5)) || emptyState('🛣️', 'Noch keine Fahrten', 'Erfasse deine erste Fahrt – es dauert 10 Sekunden.');
  }

  function renderTrips() {
    let trips = tripsOfMonth(state.month);
    if (state.filter === 'biz') trips = trips.filter(t => t.type === 'biz');
    if (state.filter === 'priv') trips = trips.filter(t => t.type === 'priv');
    const q = state.search.trim().toLowerCase();
    if (q) trips = trips.filter(t => (t.to + ' ' + t.from + ' ' + t.purpose).toLowerCase().includes(q));
    $('tripsSub').textContent = trips.length + ' Fahrten im ' + monthLabel(state.month);
    $('tripList').innerHTML = tripListHTML(trips) || emptyState('🔍', 'Keine Fahrten gefunden', 'Passe den Filter an oder erfasse eine neue Fahrt.');
  }

  function tripListHTML(trips) {
    return trips.map(t => {
      const v = vehicleById(t.vehicleId);
      const d = new Date(t.date + 'T12:00:00');
      const isBiz = t.type === 'biz';
      return '<div class="trip-item">' +
        '<div class="trip-date"><div class="d">' + WEEKDAYS[d.getDay()] + '</div><div class="n">' + String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '</div></div>' +
        '<div class="trip-body">' +
          '<div class="trip-route">' + esc(t.from) + '<span class="arrow">→</span>' + esc(t.to) + '</div>' +
          '<div class="trip-meta">' + esc(t.purpose) + (v ? ' · ' + esc(v.name) : '') + '</div>' +
        '</div>' +
        '<span class="badge ' + (isBiz ? 'badge-green' : 'badge-gray') + '">' + (isBiz ? '💼 Geschäftlich' : '🏠 Privat') + '</span>' +
        '<div class="trip-km">' + t.km.toLocaleString('de-DE') + ' km<small>' + t.kmStart.toLocaleString('de-DE') + ' → ' + t.kmEnd.toLocaleString('de-DE') + '</small></div>' +
        '<div class="trip-actions">' +
          '<button class="icon-btn" data-edit="' + t.id + '" title="Bearbeiten">✏️</button>' +
          '<button class="icon-btn" data-del="' + t.id + '" title="Löschen">🗑️</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function emptyState(icon, title, sub) {
    return '<div class="empty-state"><div class="big">' + icon + '</div><h3>' + esc(title) + '</h3><p>' + esc(sub) + '</p></div>';
  }

  function renderVehicles() {
    const grid = $('vehicleGrid');
    grid.innerHTML = db.vehicles.map(v => {
      const monthTrips = tripsOfMonth(state.month).filter(t => t.vehicleId === v.id);
      const s = monthStats(monthTrips);
      return '<div class="card vehicle-card">' +
        '<div class="veh-ico">🚗</div>' +
        '<h3>' + esc(v.name) + '</h3>' +
        (v.plate ? '<span class="plate">' + esc(v.plate) + '</span>' : '') +
        '<div class="veh-stats">Dieser Monat: ' + s.total.toLocaleString('de-DE') + ' km (' + s.count + ' Fahrten)<br>Letzter km-Stand: ' + Number(v.km).toLocaleString('de-DE') + ' km</div>' +
        '<div class="modal-actions"><button class="btn btn-outline btn-sm" data-editveh="' + v.id + '">Bearbeiten</button><button class="btn btn-ghost btn-sm" data-delveh="' + v.id + '">Löschen</button></div>' +
      '</div>';
    }).join('') +
    '<button class="add-card" id="vehicleAddCard">＋<span>Fahrzeug hinzufügen</span></button>';
  }

  function renderSettings() {
    const st = db.settings;
    $('setName').value = st.name || '';
    $('setCompany').value = st.company || '';
    $('setEmail').value = st.email || '';
    $('setStreet').value = st.street || '';
    $('setCity').value = st.city || '';
    $('setCosts').value = st.annualCost || '';
    const isPro = db.plan === 'pro';
    $('planStatusText').innerHTML = isPro
      ? 'Du bist im <b>Pro-Tarif</b>. Vielen Dank für deine Unterstützung! 🎉'
      : 'Du bist im kostenlosen <b>Start-Tarif</b> (1 Fahrzeug, ' + FREE_TRIP_LIMIT + ' Fahrten/Monat, CSV-Export).';
    $('upgradeBtn').style.display = isPro ? 'none' : '';
    $('downgradeBtn').style.display = isPro ? '' : 'none';
  }

  /* ---------------- Trip CRUD ---------------- */
  function openTripModal(tripId) {
    if (!db.vehicles.length) { toast('Bitte zuerst ein Fahrzeug anlegen.', 'err'); setView('vehicles'); return; }
    $('tripModalTitle').textContent = tripId ? 'Fahrt bearbeiten' : 'Fahrt erfassen';
    $('tripId').value = tripId || '';
    const t = tripId ? db.trips.find(x => x.id === tripId) : null;

    // vehicle select
    const sel = $('tripVehicle');
    sel.innerHTML = db.vehicles.map(v => '<option value="' + v.id + '"' + (t ? (t.vehicleId === v.id ? ' selected' : '') : (v.id === db.vehicles[0].id ? ' selected' : '')) + '>' + esc(v.name) + '</option>').join('');
    sel.parentElement.style.display = db.vehicles.length > 1 ? '' : 'none';

    $('tripDate').value = t ? t.date : todayISO();
    document.querySelector('input[name="tripType"][value="' + (t ? t.type : 'biz') + '"]').checked = true;
    $('tripFrom').value = t ? t.from : (lastPlace() || '');
    $('tripTo').value = t ? t.to : '';
    $('tripPurpose').value = t ? t.purpose : '';
    $('tripKmStart').value = t ? t.kmStart : suggestStartKm(sel.value);
    $('tripKmEnd').value = t ? t.kmEnd : '';
    updateKmPreview();

    // datalist suggestions
    $('placeSuggestions').innerHTML = [...new Set(db.trips.map(x => x.from).concat(db.trips.map(x => x.to)))].map(x => '<option value="' + esc(x) + '">').join('');

    openModal('tripModal');
    setTimeout(() => $('tripFrom').focus(), 60);
  }

  function lastPlace() {
    const t = db.trips[db.trips.length - 1];
    return t ? t.to : '';
  }
  function suggestStartKm(vehicleId) {
    const vehTrips = db.trips.filter(t => t.vehicleId === vehicleId).sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));
    if (vehTrips.length) return vehTrips[0].kmEnd;
    const v = vehicleById(vehicleId);
    return v ? v.km : 0;
  }
  function updateKmPreview() {
    const a = Number($('tripKmStart').value), b = Number($('tripKmEnd').value);
    $('kmPreview').innerHTML = (a > -1 && b > -1 && b >= a)
      ? 'Gefahrene km: <b>' + (b - a).toLocaleString('de-DE') + ' km</b>'
      : (a > -1 && b > -1 ? '⚠ Endstand muss ≥ Startstand sein' : 'Gefahrene km: –');
  }

  $('tripForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const id = $('tripId').value;
    const month = $('tripDate').value.slice(0, 7);
    const existing = id ? db.trips.find(x => x.id === id) : null;
    const monthCount = db.trips.filter(t => t.date.slice(0, 7) === month && t.id !== id).length;

    // free plan limit
    if (db.plan === 'free' && !existing && monthCount >= FREE_TRIP_LIMIT) {
      closeModal('tripModal');
      openUpgrade('limit');
      return;
    }

    const kmStart = Number($('tripKmStart').value);
    const kmEnd = Number($('tripKmEnd').value);
    if (kmEnd < kmStart) { toast('⚠ Endstand muss größer oder gleich Startstand sein.', 'err'); return; }

    const trip = {
      id: id || ('t' + Date.now() + Math.floor(Math.random() * 999)),
      vehicleId: $('tripVehicle').value,
      date: $('tripDate').value,
      from: $('tripFrom').value.trim(),
      to: $('tripTo').value.trim(),
      purpose: $('tripPurpose').value.trim(),
      type: document.querySelector('input[name="tripType"]:checked').value,
      kmStart, kmEnd,
      km: kmEnd - kmStart,
      createdAt: id && existing ? existing.createdAt : new Date().toISOString()
    };
    if (id) {
      const idx = db.trips.findIndex(x => x.id === id);
      if (idx > -1) db.trips[idx] = trip;
      toast('✅ Fahrt aktualisiert');
    } else {
      db.trips.push(trip);
      toast('✅ Fahrt gespeichert – ' + trip.km.toLocaleString('de-DE') + ' km');
    }
    // keep vehicle odometer in sync
    const v = vehicleById(trip.vehicleId);
    if (v && kmEnd > v.km) { v.km = kmEnd; }
    saveDB(db); render();
    closeModal('tripModal');
  });

  ['tripKmStart', 'tripKmEnd'].forEach(id => $(id).addEventListener('input', updateKmPreview));
  $('tripVehicle').addEventListener('change', function () {
    if (!$('tripId').value) $('tripKmStart').value = suggestStartKm(this.value);
    updateKmPreview();
  });

  /* ---------------- Vehicle CRUD ---------------- */
  function openVehicleModal(id) {
    const v = id ? db.vehicles.find(x => x.id === id) : null;
    $('vehicleModalTitle').textContent = v ? 'Fahrzeug bearbeiten' : 'Fahrzeug anlegen';
    $('vehicleId').value = v ? v.id : '';
    $('vehName').value = v ? v.name : '';
    $('vehPlate').value = v ? v.plate : '';
    $('vehKm').value = v ? v.km : '';
    openModal('vehicleModal');
  }

  $('vehicleForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const id = $('vehicleId').value;
    if (!id && db.plan === 'free' && db.vehicles.length >= 1) {
      closeModal('vehicleModal');
      openUpgrade('vehicle');
      return;
    }
    const v = {
      id: id || ('v' + Date.now() + Math.floor(Math.random() * 999)),
      name: $('vehName').value.trim(),
      plate: $('vehPlate').value.trim(),
      km: Number($('vehKm').value) || 0
    };
    if (id) {
      const idx = db.vehicles.findIndex(x => x.id === id);
      if (idx > -1) db.vehicles[idx] = v;
      toast('✅ Fahrzeug aktualisiert');
    } else {
      db.vehicles.push(v);
      toast('✅ Fahrzeug angelegt');
    }
    saveDB(db); render();
    closeModal('vehicleModal');
  });

  /* ---------------- Exports ---------------- */
  function utf8Bytes(str) {
    const out = [];
    for (const ch of str) {
      const cp = ch.codePointAt(0);
      if (cp < 0x80) out.push(cp);
      else if (cp < 0x800) out.push(0xC0 | (cp >> 6), 0x80 | (cp & 0x3F));
      else if (cp < 0x10000) out.push(0xE0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3F), 0x80 | (cp & 0x3F));
      else out.push(0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3F), 0x80 | ((cp >> 6) & 0x3F), 0x80 | (cp & 0x3F));
    }
    return new Uint8Array(out);
  }

  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
  function isAndroid() { return /Android/i.test(navigator.userAgent); }

  function legacyDownload(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    // iOS < 13 ignores the `download` attribute on blob URLs -> open in a new tab,
    // where the user can save, print or forward the file themselves.
    if (isIOS()) { a.target = '_blank'; a.rel = 'noopener'; }
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) { /* jsdom has no revokeObjectURL */ } }, 4000);
  }

  function downloadBlob(content, filename, type) {
    // PDF content is pre-encoded latin-1 (every char < 256). CSV/JSON strings are
    // UTF-16 in JS — encode those as UTF-8 bytes.
    let needsUtf8 = false;
    for (let i = 0; i < content.length; i++) {
      if (content.charCodeAt(i) > 255) { needsUtf8 = true; break; }
    }
    const bytes = needsUtf8 ? utf8Bytes(content) : (function () {
      const b = new Uint8Array(content.length);
      for (let i = 0; i < content.length; i++) b[i] = content.charCodeAt(i);
      return b;
    })();
    const blob = new Blob([bytes], { type });
    const url = URL.createObjectURL(blob);

    // iPhone/Android: open the native share sheet (Save to Files, Mail, WhatsApp,
    // Print, "send to Steuerberater" …). Desktop keeps the plain download.
    const file = (typeof File !== 'undefined') ? new File([blob], filename, { type }) : null;
    if (file && (isIOS() || isAndroid()) && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'Kilometerheld', text: filename })
        .catch(err => { if (!err || err.name !== 'AbortError') legacyDownload(url, filename); });
      setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) { /* jsdom */ } }, 60000);
      return;
    }
    legacyDownload(url, filename);
  }

  function exportCSV(scope) {
    const trips = scope === 'month' ? tripsOfMonth(state.month) : db.trips.slice().sort((a, b) => a.date.localeCompare(b.date));
    if (!trips.length) { toast('Keine Fahrten zum Exportieren.'); return; }
    const rows = [['Datum', 'Fahrzeug', 'Startort', 'Zielort', 'Zweck', 'Art', 'km-Stand Start', 'km-Stand Ende', 'km']];
    trips.forEach(t => {
      const v = vehicleById(t.vehicleId);
      rows.push([fmtDate(t.date), v ? v.name : '', t.from, t.to, t.purpose, t.type === 'biz' ? 'Geschäftlich' : 'Privat', t.kmStart, t.kmEnd, t.km]);
    });
    const csv = '\uFEFF' + rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(';')).join('\r\n');
    downloadBlob(csv, 'kilometerheld_fahrten_' + state.month + '.csv', 'text/csv;charset=utf-8');
    toast('⬇ CSV exportiert (' + trips.length + ' Fahrten)');
  }

  function exportJSON() {
    const payload = JSON.stringify({ app: 'Kilometerheld', version: 1, exportedAt: new Date().toISOString(), data: db }, null, 2);
    downloadBlob(payload, 'kilometerheld_backup_' + todayISO() + '.json', 'application/json');
    toast('💾 Backup exportiert');
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const p = JSON.parse(reader.result);
        const d = p.data || p;
        if (!d || !Array.isArray(d.trips) || !Array.isArray(d.vehicles)) throw new Error('invalid');
        db = Object.assign(defaultDB(), d);
        saveDB(db); render();
        toast('✅ Backup importiert – ' + db.trips.length + ' Fahrten geladen');
      } catch (e) { toast('⚠ Ungültige Backup-Datei.', 'err'); }
    };
    reader.readAsText(file);
  }

  /* ---------------- PDF generation (raw PDF, no dependencies) ---------------- */
  const PDF_PAGE_W = 595.28, PDF_PAGE_H = 841.89;
  const COL = { date: 40, from: 92, to: 180, purpose: 282, type: 366, k1: 418, k2: 460, km: 505, kmRight: 555 };

  const LATIN1 = {
    '€':0x80,'‚':0x82,'„':0x84,'…':0x85,'†':0x86,'‡':0x87,'ˆ':0x88,'‰':0x89,'Š':0x8A,'‹':0x8B,'Œ':0x8C,'Ž':0x8E,'‘':0x91,'’':0x92,'“':0x93,'”':0x94,'•':0x95,'–':0x96,'—':0x97,'˜':0x98,'™':0x99,'š':0x9A,'›':0x9B,'œ':0x9C,'ž':0x9E,'Ÿ':0x9F,'¡':0xA1,'¢':0xA2,'£':0xA3,'¤':0xA4,'¥':0xA5,'¦':0xA6,'§':0xA7,'¨':0xA8,'©':0xA9,'ª':0xAA,'«':0xAB,'¬':0xAC,'®':0xAE,'¯':0xAF,'°':0xB0,'±':0xB1,'²':0xB2,'³':0xB3,'´':0xB4,'µ':0xB5,'¶':0xB6,'·':0xB7,'¸':0xB8,'¹':0xB9,'º':0xBA,'»':0xBB,'¼':0xBC,'½':0xBD,'¾':0x79,'¿':0xBF,
    'À':0xC0,'Á':0xC1,'Â':0xC2,'Ã':0xC3,'Ä':0xC4,'Å':0xC5,'Æ':0xC6,'Ç':0xC7,'È':0xC8,'É':0xC9,'Ê':0xCA,'Ë':0xCB,'Ì':0xCC,'Í':0xCD,'Î':0x98,'Ï':0xCF,'Ð':0xD0,'Ñ':0xD1,'Ò':0xD2,'Ó':0xD3,'Ô':0xD4,'Õ':0xD5,'Ö':0xD6,'×':0xD7,'Ø':0xD8,'Ù':0xD9,'Ú':0xDA,'Û':0xDB,'Ü':0xDC,'Ý':0xDD,'Þ':0xDE,'ß':0xDF,
    'à':0xE0,'á':0xE1,'â':0xE2,'ã':0xE3,'ä':0xE4,'å':0xE5,'æ':0xE6,'ç':0xE7,'è':0xE8,'é':0xE9,'ê':0xEA,'ë':0xEB,'ì':0xEC,'í':0xED,'î':0xEE,'ï':0xEF,'ð':0xF0,'ñ':0xF1,'ò':0xF2,'ó':0xF3,'ô':0xF4,'õ':0xF5,'ö':0xF6,'÷':0xF7,'ø':0xF8,'ù':0xF9,'ú':0xFA,'û':0xFB,'ü':0xFC,'ý':0xFD,'þ':0xFE,'ÿ':0xFF
  };
  function pdfStr(s) {
    let out = '';
    for (const ch of String(s)) {
      const c = ch.codePointAt(0);
      let b = c < 128 ? c : (LATIN1[ch] !== undefined ? LATIN1[ch] : 63);
      if (b === 0x28 || b === 0x29 || b === 0x5C) out += String.fromCharCode(0x5C, b);
      else out += String.fromCharCode(b);
    }
    return out;
  }

  function buildPdf(pages) {
    const n = pages.length;
    const objs = [];
    objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objs[2] = '<< /Type /Pages /Kids [' + pages.map((_, i) => (5 + 2 * i) + ' 0 R').join(' ') + '] /Count ' + n + ' >>';
    objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
    objs[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
    pages.forEach((content, i) => {
      objs[5 + 2 * i] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PDF_PAGE_W + ' ' + PDF_PAGE_H + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ' + (6 + 2 * i) + ' 0 R >>';
      objs[6 + 2 * i] = '<< /Length ' + content.length + ' >>\nstream\n' + content + 'endstream';
    });
    let file = '%PDF-1.4\n';
    const offsets = new Array(objs.length);
    for (let id = 1; id < objs.length; id++) {
      offsets[id] = file.length;
      file += id + ' 0 obj\n' + objs[id] + '\nendobj\n';
    }
    const xref = file.length;
    file += 'xref\n0 ' + objs.length + '\n0000000000 65535 f \n';
    for (let id = 1; id < objs.length; id++) file += String(offsets[id]).padStart(10, '0') + ' 00000 n \n';
    file += 'trailer\n<< /Size ' + objs.length + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF';
    return file;
  }

  function exportMonthPDF() {
    const trips = tripsOfMonth(state.month);
    if (!trips.length) { toast('Keine Fahrten in diesem Monat.'); return; }

    // group by vehicle, in vehicle order
    const groups = db.vehicles.map(v => ({ v, trips: trips.filter(t => t.vehicleId === v.id) })).filter(g => g.trips.length);
    if (!groups.length) groups.push({ v: db.vehicles[0] || { name: '–' }, trips });

    const st = db.settings;
    const total = monthStats(trips);
    const pages = [];
    let cur = { text: '', y: 0, isFirst: true, rowsUsed: 0 };

    const write = (str) => { cur.text += str; };
    const t = (x, y, str, size, font, color) => {
      write('BT /' + (font || 'F1') + ' ' + size + ' Tf ' + (color || '0.08 0.14 0.11') + ' rg 1 0 0 1 ' + x.toFixed(1) + ' ' + y.toFixed(1) + ' Tm (' + pdfStr(str) + ') Tj ET\n');
    };
    const rt = (xRight, y, str, size, font, color) => {
      t(xRight - str.length * size * 0.5, y, str, size, font, color);
    };
    const line = (x1, y1, x2, y2, w, color) => {
      write((w || 0.6) + ' w ' + (color || '0.82 0.87 0.84') + ' RG ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' m ' + x2.toFixed(1) + ' ' + y2.toFixed(1) + ' l S\n');
    };
    const centered = (y, str, size, font) => t((PDF_PAGE_W - str.length * size * 0.52) / 2, y, str, size, font);

    function newPage() {
      if (cur.text || pages.length === 0) { pages.push(cur.text); }
      cur = { text: '', y: 740, isFirst: pages.length === 0, rowsUsed: 0 };
    }
    function startPage() {
      if (pages.length === 0 && !cur.text) { /* first page */ cur.isFirst = true; return; }
      if (!cur.text) return;
      newPage();
    }
    function ensureRoom(needed) {
      if (cur.y - needed < 60) newPage();
    }

    // first page header
    startPage();
    centered(795, 'FAHRTENBUCH', 16, 'F2');
    centered(776, 'Monat ' + monthLabel(state.month), 9.5);
    const driverLine = [st.name, [st.street, st.city].filter(Boolean).join(', ')].filter(Boolean).join('  ·  ');
    t(40, 748, 'Fahrer: ' + (driverLine || '–'), 9, 'F1');
    t(40, 732, 'Erstellt am: ' + fmtDate(todayISO()) + '  ·  mit Kilometerheld', 8);
    line(40, 722, PDF_PAGE_W - 40, 722, 1, '0.05 0.4 0.3');
    t(40, 706, 'Gesamt: ' + total.total.toLocaleString('de-DE') + ' km', 10, 'F2');
    t(170, 706, 'Geschäftlich: ' + total.biz.toLocaleString('de-DE') + ' km (' + total.share + ' %)', 10, 'F1', '0.07 0.45 0.32');
    t(410, 706, 'Privat: ' + total.priv.toLocaleString('de-DE') + ' km', 10, 'F1');
    line(40, 694, PDF_PAGE_W - 40, 694, 0.6);
    cur.y = 674;

    const tableHeader = function () {
      t(COL.date, cur.y, 'Datum', 7.5, 'F2');
      t(COL.from, cur.y, 'Startort', 7.5, 'F2');
      t(COL.to, cur.y, 'Zielort', 7.5, 'F2');
      t(COL.purpose, cur.y, 'Zweck', 7.5, 'F2');
      t(COL.type, cur.y, 'Art', 7.5, 'F2');
      t(COL.k1, cur.y, 'km-Stand', 7.5, 'F2');
      t(COL.k2, cur.y, 'km-Stand', 7.5, 'F2');
      rt(442, cur.y, 'Start', 6.5, 'F1', '0.4 0.46 0.43');
      rt(484, cur.y, 'Ende', 6.5, 'F1', '0.4 0.46 0.43');
      rt(COL.kmRight, cur.y, 'km', 7.5, 'F2');
      cur.y -= 6;
      line(40, cur.y, PDF_PAGE_W - 40, cur.y, 1, '0.05 0.4 0.3');
      cur.y -= 10;
    };
    tableHeader();

    const rowH = 15;
    groups.forEach(g => {
      const gs = monthStats(g.trips);
      ensureRoom(rowH * 3 + 8);
      t(40, cur.y, 'Fahrzeug: ' + g.v.name + (g.v.plate ? ' (' + g.v.plate + ')' : ''), 9, 'F2');
      t(300, cur.y, 'Gesamt: ' + gs.total.toLocaleString('de-DE') + ' km  ·  Geschäftlich: ' + gs.biz.toLocaleString('de-DE') + ' km  ·  Privat: ' + gs.priv.toLocaleString('de-DE') + ' km  ·  Anteil: ' + gs.share + ' %', 8, 'F1', '0.07 0.45 0.32');
      cur.y -= 16;
      line(40, cur.y + 8, PDF_PAGE_W - 40, cur.y + 8, 0.5);
      g.trips.forEach(tr => {
        if (cur.y - rowH < 56) {
          newPage();
          t(40, 792, 'Fahrtenbuch – ' + monthLabel(state.month) + '  ·  ' + (st.name || ''), 9, 'F2');
          line(40, 784, PDF_PAGE_W - 40, 784, 0.6);
          cur.y = 764;
          tableHeader();
        }
        t(COL.date, cur.y, fmtDate(tr.date), 8);
        t(COL.from, cur.y, truncate(tr.from, 20), 8);
        t(COL.to, cur.y, truncate(tr.to, 20), 8);
        t(COL.purpose, cur.y, truncate(tr.purpose, 20), 8);
        t(COL.type, cur.y, tr.type === 'biz' ? 'Geschäftlich' : 'Privat', 8);
        rt(442, cur.y, tr.kmStart.toLocaleString('de-DE'), 8);
        rt(484, cur.y, tr.kmEnd.toLocaleString('de-DE'), 8);
        rt(COL.kmRight, cur.y, tr.km.toLocaleString('de-DE'), 8, 'F2');
        line(40, cur.y - 3.5, PDF_PAGE_W - 40, cur.y - 3.5, 0.4, '0.92 0.95 0.93');
        cur.y -= rowH;
      });
    });

    // footer on every page
    pages.push(cur.text);
    for (let i = 0; i < pages.length; i++) {
      pages[i] +=
        '0.6 w 0.05 0.4 0.3 RG 40 48 m ' + (PDF_PAGE_W - 40) + ' 48 l S\n' +
        'BT /F1 7 Tf 0.35 0.42 0.38 rg 1 0 0 1 40 36 Tm (' + pdfStr('Elektronisch geführtes Fahrtenbuch gemäß § 6 Abs. 1 Nr. 4 S. 3 EStG · Erstellt mit Kilometerheld (kilometerheld.de) · Daten unveränderlich dokumentiert') + ') Tj ET\n' +
        'BT /F1 8 Tf 0.35 0.42 0.38 rg 1 0 0 1 ' + (PDF_PAGE_W - 90) + ' 36 Tm (' + pdfStr('Seite ' + (i + 1) + ' von ' + pages.length) + ') Tj ET\n';
    }
    downloadBlob(buildPdf(pages), 'Fahrtenbuch_' + state.month + '.pdf', 'application/pdf');
    toast('📄 Monats-PDF erstellt – bereit für deinen Steuerberater');
  }

  /* ---------------- Plan gating & upgrade ---------------- */
  function openUpgrade(reason) {
    const subs = {
      limit: 'Du hast das Start-Limit von ' + FREE_TRIP_LIMIT + ' Fahrten in diesem Monat erreicht. Mit Pro fährst du unbegrenzt weiter.',
      pdf: 'Monats-PDFs mit allen Pflichtangaben fürs Finanzamt sind eine Pro-Funktion. Im Start-Tarif steht dir der CSV-Export zur Verfügung.',
      vehicle: 'Ein zweites Fahrzeug ist in Pro enthalten – praktisch für Selbstständige mit Privat- und Firmenwagen.'
    };
    $('upgradeTitle').textContent = reason === 'pdf' ? '📄 Monats-PDF ist Pro' : (reason === 'vehicle' ? '🚗 Zweites Fahrzeug ist Pro' : '⬆ Start-Limit erreicht');
    $('upgradeSub').textContent = subs[reason] || subs.limit;
    openModal('upgradeModal');
  }

  document.querySelectorAll('.upgrade-plan').forEach(el => el.addEventListener('click', function () {
    document.querySelectorAll('.upgrade-plan').forEach(x => x.classList.remove('selected'));
    this.classList.add('selected');
    state.selectedPlan = this.dataset.plan;
  }));

  $('confirmUpgrade').addEventListener('click', function () {
    // PRODUCTION: redirect to secure checkout (Stripe Payment Link / Paddle checkout).
    // Paddle acts as "Merchant of Record" and handles EU VAT automatically.
    // After payment the customer returns with a license key that unlocks Pro here.
    db.plan = 'pro';
    saveDB(db); render();
    closeModal('upgradeModal');
    toast(state.selectedPlan === 'yearly' ? '🎉 Willkommen bei Pro (Jahresabo)! Alle Funktionen freigeschaltet.' : '🎉 Willkommen bei Pro! Alle Funktionen freigeschaltet.');
  });

  $('downgradeBtn').addEventListener('click', function () {
    askConfirm('Abo kündigen?', 'Du wechselst zurück zum kostenlosen Start-Tarif. Deine Daten bleiben vollständig erhalten – du kannst jederzeit wieder upgraden.', function () {
      db.plan = 'free';
      saveDB(db); render();
      toast('Abo gekündigt – du bist wieder im Start-Tarif.');
    });
  });

  /* ---------------- Settings & data ---------------- */
  $('saveSettings').addEventListener('click', function () {
    db.settings.name = $('setName').value.trim();
    db.settings.company = $('setCompany').value.trim();
    db.settings.email = $('setEmail').value.trim();
    db.settings.street = $('setStreet').value.trim();
    db.settings.city = $('setCity').value.trim();
    saveDB(db);
    toast('✅ Profil gespeichert');
  });
  $('saveCosts').addEventListener('click', function () {
    db.settings.annualCost = Number($('setCosts').value) || 0;
    saveDB(db); render();
    toast('✅ Fahrzeugkosten gespeichert');
  });
  $('exportJsonBtn').addEventListener('click', exportJSON);
  $('importJsonBtn').addEventListener('click', () => $('importJsonInput').click());
  $('importJsonInput').addEventListener('change', function () { if (this.files[0]) importJSON(this.files[0]); this.value = ''; });
  $('exportCsvAllBtn').addEventListener('click', () => exportCSV('all'));
  $('resetBtn').addEventListener('click', function () {
    askConfirm('Alle Daten löschen?', 'Fahrzeuge, Fahrten und Einstellungen werden unwiderruflich aus diesem Browser entfernt. Exportiere zuerst ein Backup!', function () {
      localStorage.removeItem(DB_KEY);
      db = defaultDB();
      saveDB(db); render();
      toast('🗑 Alle Daten gelöscht');
    });
  });

  /* ---------------- Global events ---------------- */
  document.querySelectorAll('.app-sidebar nav a').forEach(a => a.addEventListener('click', e => { e.preventDefault(); setView(a.dataset.view); }));
  $('quickAddBtn').addEventListener('click', () => openTripModal());
  $('tripsAddBtn').addEventListener('click', () => openTripModal());
  $('prevMonth').addEventListener('click', () => { state.month = shiftMonth(state.month, -1); render(); });
  $('nextMonth').addEventListener('click', () => { state.month = shiftMonth(state.month, 1); render(); });
  $('todayBtn').addEventListener('click', () => { state.month = todayISO().slice(0, 7); render(); });

  $('dashPdfBtn').addEventListener('click', () => db.plan === 'pro' ? exportMonthPDF() : openUpgrade('pdf'));
  $('dashCsvBtn').addEventListener('click', () => exportCSV('month'));
  $('tripsPdfBtn').addEventListener('click', () => db.plan === 'pro' ? exportMonthPDF() : openUpgrade('pdf'));
  $('tripsCsvBtn').addEventListener('click', () => exportCSV('month'));

  document.querySelectorAll('.filter-pill').forEach(p => p.addEventListener('click', function () {
    document.querySelectorAll('.filter-pill').forEach(x => x.classList.remove('active'));
    this.classList.add('active');
    state.filter = this.dataset.filter;
    renderTrips();
  }));
  $('tripSearch').addEventListener('input', function () { state.search = this.value; renderTrips(); });

  // trip list actions (event delegation)
  document.addEventListener('click', function (e) {
    const edit = e.target.closest('[data-edit]');
    const del = e.target.closest('[data-del]');
    const editVeh = e.target.closest('[data-editveh]');
    const delVeh = e.target.closest('[data-delveh]');
    if (edit) openTripModal(edit.dataset.edit);
    if (del) {
      const tr = db.trips.find(x => x.id === del.dataset.del);
      askConfirm('Fahrt löschen?', tr ? ('Fahrt von ' + tr.from + ' nach ' + tr.to + ' (' + tr.km + ' km) wird gelöscht.') : '', function () {
        db.trips = db.trips.filter(x => x.id !== del.dataset.del);
        saveDB(db); render();
        toast('🗑 Fahrt gelöscht');
      });
    }
    if (editVeh) openVehicleModal(editVeh.dataset.editveh);
    if (delVeh) askConfirm('Fahrzeug löschen?', 'Das Fahrzeug wird entfernt. Bereits erfasste Fahrten bleiben erhalten.', function () {
      db.vehicles = db.vehicles.filter(x => x.id !== delVeh.dataset.delveh);
      saveDB(db); render();
      toast('🗑 Fahrzeug gelöscht');
    });
  });

  $('vehicleAddBtn').addEventListener('click', () => openVehicleModal());
  document.addEventListener('click', function (e) {
    if (e.target.closest('#vehicleAddCard')) openVehicleModal();
  });

  $('upgradeBtn').addEventListener('click', () => openUpgrade('generic'));
  $('confirmOk').addEventListener('click', function () {
    const fn = state.pendingConfirm;
    closeModal('confirmModal');
    if (fn) fn();
    state.pendingConfirm = null;
  });

  // keyboard: ESC closes modals
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelectorAll('.modal-backdrop').forEach(m => m.style.display = 'none');
  });

  /* ---------------- Init ---------------- */
  if (db.seeded) {
    setTimeout(() => toast('👋 Willkommen! Beispieldaten geladen – unter „Einstellungen" löschbar.'), 700);
  }
  render();
})();
