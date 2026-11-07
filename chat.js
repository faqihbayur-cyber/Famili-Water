/* chat.js — chat anonim pelanggan FAMILI WATER (tanpa WhatsApp)
   - Firebase SDK baru dimuat saat chat dibuka (halaman tetap ringan).
   - Semua tulisan lewat Cloud Functions (kirimPesan, kirimOrder, tandaiDibaca). Klien hanya membaca chat miliknya.
   - Style ada di style.css (bagian "Chat FAMILI WATER"). Halaman yang memasang chat.js harus memuat style.css.
   - Pasang: <script src="chat.js" defer></script> sebelum </body>.
   - Tombol pembuka: atribut data-fwchat pada elemen apa saja (contoh: tombol di hero index.html).
     Kalau ada elemen data-fwchat di halaman, tombol melayang di pojok kiri bawah disembunyikan. */
(function () {
  'use strict';
  if (window.FWChat) return;

  /* ====== KONFIGURASI ====== */
  var CFG = {
    firebase: {
      apiKey: 'AIzaSyB3UfH10F8SwiEXSZvjTakSxhKoaVo6VCs',
      authDomain: 'klien2.firebaseapp.com',
      projectId: 'klien2',
      appId: '1:935807025251:web:1dc2dbd4765e20f97df856'
    },
    siteKey: '6LfU2xQuAAAAANTKwl3Nh38L2P4qHkP3VAjET6p-', // reCAPTCHA Enterprise (App Check)
    vapid: 'BIM_grMV1aJktQboW2T216jLrMvQPddngtAZCeTE4vO_l56iB5Mis_d2IJr1UeqLIJ5AMHr72tqHqqvd7SSEiiI', // kunci publik Web Push (FCM)
    region: 'asia-southeast2',
    idCabang: 'UtSutZUJnmkKX57I8MwO',                          // ID dokumen di koleksi kantorCabang
    wa: '6285287416936',
    sdk: 'https://www.gstatic.com/firebasejs/10.14.1/'
  };

  var S = { app: null, pushSkip: false, open: false, hist: false, initP: null, uid: null, chat: null, msgs: [], sending: false, marking: false, formOpen: false, call: null };
  var $ = function (s, c) { return (c || document).querySelector(s); };
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  /* ====== DOM ====== */
  var fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'fwc-fab' + ($('[data-fwchat]') ? ' off' : '');
  fab.setAttribute('aria-label', 'Chat langsung ke admin, tanpa WhatsApp');
  fab.innerHTML = '<span aria-hidden="true">💬</span><span>Chat tanpa WhatsApp</span><b class="fwc-badge" hidden>0</b>';

  var sheet = document.createElement('div');
  sheet.className = 'fwc-sheet'; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-hidden', 'true'); sheet.setAttribute('aria-label', 'Chat langsung ke admin FAMILI WATER');
  sheet.innerHTML =
    '<div class="fwc-head"><div><b>Chat langsung ke Admin</b><small>Tanpa nomor WhatsApp. Nama &amp; lokasi tidak terkirim otomatis.</small></div><button type="button" class="fwc-x" aria-label="Tutup chat">Tutup</button></div>' +
    '<div class="fwc-list" aria-live="polite"></div>' +
    '<div class="fwc-err"></div>' +
    '<div class="fwc-push"></div>' +
    '<div class="fwc-bar"><button type="button" class="fwc-chip" data-a="order">📍 Kirim nama &amp; lokasi</button><a class="fwc-chip" target="_blank" rel="noopener" href="https://wa.me/' + CFG.wa + '?text=' + encodeURIComponent('Halo FAMILI WATER, saya ingin memesan Air Godogan.') + '">Lewat WhatsApp</a></div>' +
    '<div class="fwc-form">' +
      '<label for="fwcNama">Nama Ibu</label><input id="fwcNama" maxlength="100" autocomplete="name" placeholder="Contoh: Ibu Siti">' +
      '<label for="fwcCatatan">Catatan (boleh kosong)</label><input id="fwcCatatan" maxlength="200" placeholder="Contoh: pagar hijau, galon 2">' +
      '<p>Nanti HP minta izin lokasi, tekan Izinkan. Hanya admin &amp; kurir yang melihat.</p>' +
      '<div class="fwc-row"><button type="button" data-a="batal">Batal</button><button type="button" class="go" data-a="kirimOrder">Kirim pesanan</button></div>' +
    '</div>' +
    '<div class="fwc-send"><input id="fwcInput" maxlength="500" placeholder="Ketik pesan Ibu di sini" autocomplete="off" enterkeyhint="send"><button type="button" data-a="kirim">Kirim</button></div>';
  document.body.appendChild(fab);
  document.body.appendChild(sheet);

  var listEl = $('.fwc-list', sheet), errEl = $('.fwc-err', sheet), pushEl = $('.fwc-push', sheet), formEl = $('.fwc-form', sheet),
      inp = $('#fwcInput', sheet), btnSend = $('[data-a="kirim"]', sheet),
      btnOrder = $('[data-a="kirimOrder"]', sheet);

  function showErr(t, wa) {
    if (!t) { errEl.className = 'fwc-err'; errEl.textContent = ''; return; }
    errEl.textContent = t + ' ';
    if (wa) {
      var a = document.createElement('a');
      a.href = 'https://wa.me/' + CFG.wa; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Pakai WhatsApp';
      errEl.appendChild(a);
    }
    errEl.className = 'fwc-err on';
  }
  function pesanError(e) {
    var c = ((e && e.code) || '').replace('functions/', '');
    if (['invalid-argument', 'resource-exhausted', 'not-found', 'permission-denied'].indexOf(c) > -1 && e.message) return e.message;
    console.error('FWChat', e);
    return 'Belum bisa terhubung ke chat. Coba lagi sebentar.';
  }

  /* ====== RENDER ====== */
  function jam(m) {
    try { var d = m.createdAt && m.createdAt.toDate && m.createdAt.toDate(); if (!d) return ''; return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); } catch (e) { return ''; }
  }
  function renderMsgs() {
    var near = listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight < 80;
    listEl.textContent = '';
    var hi = document.createElement('div');
    hi.className = 'fwc-m sys';
    hi.textContent = 'Halo Bu! Silakan tanya apa saja. Mau pesan? Tekan “Kirim nama & lokasi”.';
    listEl.appendChild(hi);
    S.msgs.forEach(function (m) {
      var d = document.createElement('div');
      d.className = 'fwc-m ' + (m.from === 'admin' ? 'ad' : 'me');
      d.appendChild(document.createTextNode((m.tipe === 'order' ? 'Pesanan: ' : '') + (m.text || '')));
      var t = jam(m);
      if (t) { var s = document.createElement('small'); s.textContent = t; d.appendChild(s); }
      listEl.appendChild(d);
    });
    if (S.chat && S.chat.status === 'closed') {
      var c = document.createElement('div');
      c.className = 'fwc-m sys';
      c.textContent = 'Percakapan sudah ditutup admin. Tulis pesan baru kalau masih perlu bantuan.';
      listEl.appendChild(c);
    }
    if (near || S.msgs.length < 2) listEl.scrollTop = listEl.scrollHeight;
  }
  function renderBadge() {
    var n = (S.chat && S.chat.unreadPengunjung) || 0;
    var txt = n > 9 ? '9+' : String(n), hide = !(n > 0 && !S.open);
    document.querySelectorAll('.fwc-badge').forEach(function (b) { b.textContent = txt; b.hidden = hide; });
  }
  function onChat() {
    renderBadge();
    if (S.chat) lsSet('fw_chat_on', '1');
    if (S.open && S.chat && S.chat.unreadPengunjung > 0 && !S.marking) {
      S.marking = true;
      S.call('tandaiDibaca', {}).catch(function () {}).then(function () { S.marking = false; });
    }
  }

  /* ====== FIREBASE (lazy) ====== */
  function init() {
    if (S.initP) return S.initP;
    S.initP = (async function () {
      var B = CFG.sdk;
      var m = await Promise.all([
        import(B + 'firebase-app.js'), import(B + 'firebase-app-check.js'), import(B + 'firebase-auth.js'),
        import(B + 'firebase-firestore.js'), import(B + 'firebase-functions.js')
      ]);
      var A = m[0], AC = m[1], AU = m[2], FS = m[3], FN = m[4];
      var app = A.initializeApp(CFG.firebase, 'fwchat');
      AC.initializeAppCheck(app, { provider: new AC.ReCaptchaEnterpriseProvider(CFG.siteKey), isTokenAutoRefreshEnabled: true });
      var auth = AU.getAuth(app);
      var user = await new Promise(function (res, rej) {
        var off = AU.onAuthStateChanged(auth, function (u) { off(); res(u); }, rej);
      });
      if (!user) user = (await AU.signInAnonymously(auth)).user;
      S.uid = user.uid;
      S.app = app;

      var fn = FN.getFunctions(app, CFG.region);
      S.call = function (name, data) { return FN.httpsCallable(fn, name)(data || {}); };

      var db = FS.getFirestore(app);
      var bad = function (e) { console.error('FWChat listen', e); };
      FS.onSnapshot(FS.doc(db, 'chats', S.uid), function (s) { S.chat = s.exists() ? s.data() : null; onChat(); renderMsgs(); }, bad);
      FS.onSnapshot(FS.query(FS.collection(db, 'chats', S.uid, 'messages'), FS.orderBy('createdAt', 'asc'), FS.limitToLast(300)),
        function (s) { S.msgs = s.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; }); renderMsgs(); }, bad);
    })();
    S.initP.catch(function () { S.initP = null; });
    return S.initP;
  }

  /* ====== NOTIFIKASI PUSH ====== */
  function pushDidukung() { return ('serviceWorker' in navigator) && ('PushManager' in window) && ('Notification' in window); }
  function iosTanpaPush() { return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('Notification' in window); }

  async function daftarkanToken() {
    var reg = await navigator.serviceWorker.register('/fw-sw.js');
    await navigator.serviceWorker.ready;
    await init();
    var M = await import(CFG.sdk + 'firebase-messaging.js');
    if (!(await M.isSupported())) return false;
    var token = await M.getToken(M.getMessaging(S.app), { vapidKey: CFG.vapid, serviceWorkerRegistration: reg });
    if (!token) return false;
    await S.call('daftarPush', { token: token });
    return true;
  }

  async function aktifkanPush() {
    try {
      var izin = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      if (izin !== 'granted') return false;
      return await daftarkanToken();
    } catch (e) { console.error('FWChat push', e); showErr('Pemberitahuan belum bisa diaktifkan di HP ini. Chat tetap bisa dipakai.'); return false; }
  }

  function renderPush() {
    var h = '';
    if (pushDidukung() && Notification.permission === 'default' && !S.pushSkip) {
      h = '<p>Aktifkan pemberitahuan supaya balasan admin masuk ke HP Ibu.</p><div class="r"><button type="button" class="go" data-a="push">Aktifkan</button><button type="button" data-a="pushnanti">Nanti</button></div>';
    } else if (iosTanpaPush() && lsGet('fw_ios_hint') !== '1') {
      h = '<p>Di iPhone: buka lewat Safari, tekan Bagikan, lalu pilih “Tambahkan ke Layar Utama”.</p><div class="r"><button type="button" data-a="ioshint">Mengerti</button></div>';
    }
    pushEl.innerHTML = h;
    pushEl.className = 'fwc-push' + (h ? ' on' : '');
  }

  /* ====== AKSI ====== */
  function idOk() {
    if (!CFG.idCabang || CFG.idCabang === 'ISI_ID_CABANG') { showErr('Chat belum siap dipakai.', true); return false; }
    return true;
  }

  async function kirim() {
    var t = inp.value.trim().replace(/\s+/g, ' ');
    if (!t || S.sending || !idOk()) return;
    S.sending = true; btnSend.disabled = true; showErr('');
    try {
      await init();
      await S.call('kirimPesan', { idCabang: CFG.idCabang, text: t });
      inp.value = '';
    } catch (e) { showErr(pesanError(e), true); }
    S.sending = false; btnSend.disabled = false; inp.focus();
  }

  function refKode() {
    try {
      var o = JSON.parse(lsGet('fw_ref') || 'null');
      if (o && typeof o.kode === 'string' && o.t && Date.now() - o.t < 7 * 864e5) return o.kode;
    } catch (e) {}
    try {
      var u = (new URLSearchParams(location.search).get('ref') || '').trim().toUpperCase();
      if (/^[A-Z0-9]{3,20}$/.test(u)) return u;
    } catch (e) {}
    return '';
  }

  function bukaForm() {
    if (!idOk()) return;
    showErr('');
    $('#fwcNama', sheet).value = lsGet('fw_nama') || '';
    formEl.classList.add('on'); S.formOpen = true;
    setTimeout(function () { $('#fwcNama', sheet).focus(); }, 50);
  }
  function tutupForm() { formEl.classList.remove('on'); S.formOpen = false; btnOrder.disabled = false; }

  function ambilLokasi() {
    return new Promise(function (res, rej) {
      if (!navigator.geolocation) return rej({ code: 'nogeo' });
      navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
    });
  }

  async function kirimOrder() {
    var nama = $('#fwcNama', sheet).value.trim().replace(/\s+/g, ' ');
    var cat = $('#fwcCatatan', sheet).value.trim().replace(/\s+/g, ' ');
    if (nama.length < 2) { $('#fwcNama', sheet).focus(); return showErr('Nama minimal 2 huruf.'); }
    showErr(''); btnOrder.disabled = true;
    try {
      var p;
      try { p = await ambilLokasi(); }
      catch (e) {
        btnOrder.disabled = false;
        return showErr(e && e.code === 1 ? 'Lokasi tidak diizinkan. Tulis alamat lengkap di kolom chat saja ya.' : 'Lokasi belum ketemu. Tulis alamat lengkap di kolom chat saja ya.');
      }
      await init();
      lsSet('fw_nama', nama);
      await S.call('kirimOrder', {
        idCabang: CFG.idCabang, nama: nama, catatan: cat,
        lat: p.coords.latitude, lng: p.coords.longitude,
        kodePromo: refKode(), promo: /promo/i.test(location.pathname)
      });
      $('#fwcCatatan', sheet).value = '';
      tutupForm();
    } catch (e) { showErr(pesanError(e), true); }
    btnOrder.disabled = false;
  }

  /* Sheet mengikuti area yang terlihat, supaya kolom ketik tidak tertutup keyboard HP */
  function fitVV(keBawah) {
    var v = window.visualViewport;
    if (!v || !S.open) return;
    sheet.classList.add('vv');
    sheet.style.setProperty('--fwc-h', v.height + 'px');
    sheet.style.setProperty('--fwc-t', v.offsetTop + 'px');
    if (keBawah) listEl.scrollTop = listEl.scrollHeight;
  }

  function buka() {
    if (S.open) return;
    if (!S.hist) { try { history.pushState({ fwchat: 1 }, '', location.href); S.hist = true; } catch (e) {} }
    S.open = true;
    document.documentElement.classList.add('fwc-lock');   // halaman di belakang tidak ikut scroll
    sheet.classList.add('on'); sheet.setAttribute('aria-hidden', 'false');
    fitVV(false); renderMsgs(); renderBadge(); renderPush();
    init().then(function () {
      onChat();
      if (pushDidukung() && Notification.permission === 'granted') daftarkanToken().catch(function () {});
    }).catch(function (e) { showErr(pesanError(e), true); });
  }
  function selesai() {
    S.open = false;
    document.documentElement.classList.remove('fwc-lock');
    sheet.classList.remove('on'); sheet.setAttribute('aria-hidden', 'true');
    tutupForm(); renderBadge();
    if (document.activeElement && sheet.contains(document.activeElement)) document.activeElement.blur();
  }
  function tutup() {
    if (S.open && S.hist) { S.hist = false; history.back(); }
    selesai();
  }

  fab.addEventListener('click', buka);
  $('.fwc-x', sheet).addEventListener('click', tutup);
  sheet.addEventListener('click', function (e) {
    var b = e.target.closest('[data-a]'); if (!b) return;
    var a = b.getAttribute('data-a');
    if (a === 'push') aktifkanPush().then(renderPush); else if (a === 'pushnanti') { S.pushSkip = true; renderPush(); } else if (a === 'ioshint') { lsSet('fw_ios_hint', '1'); renderPush(); } else if (a === 'kirim') kirim(); else if (a === 'order') bukaForm(); else if (a === 'batal') tutupForm(); else if (a === 'kirimOrder') kirimOrder();
  });
  inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); kirim(); } });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && S.open) tutup(); });
  window.addEventListener('popstate', function () { if (S.open && S.hist) { S.hist = false; selesai(); } });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () { fitVV(true); });
    window.visualViewport.addEventListener('scroll', function () { fitVV(false); });
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-fwchat]');
    if (t) { e.preventDefault(); buka(); }
  });

  window.FWChat = { open: buka, close: tutup };
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', function (e) { if (e.data && e.data.aksi === 'buka-chat') buka(); });
  }
  window.addEventListener('hashchange', function () { if (location.hash === '#chat' && !S.open) buka(); });
  if (location.hash === '#chat') setTimeout(buka, 300);
  renderMsgs();

  // Pengunjung yang pernah chat: sambungkan diam-diam supaya badge balasan muncul
  if (lsGet('fw_chat_on') === '1' && CFG.idCabang !== 'ISI_ID_CABANG') {
    setTimeout(function () { init().catch(function () {}); }, 1500);
  }
})();
