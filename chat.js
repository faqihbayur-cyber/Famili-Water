/* chat.js — chat anonim pelanggan FAMILI WATER (tanpa WhatsApp)
   - Firebase SDK baru dimuat saat chat dibuka (halaman tetap ringan).
   - Semua tulisan lewat Cloud Functions (kirimPesan, kirimOrder, tandaiDibaca). Klien hanya membaca chat miliknya.
   - Pasang: <script src="chat.js" defer></script> sebelum </body>. Tombol tambahan: atribut data-fwchat pada elemen apa saja. */
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
    region: 'asia-southeast2',
    idCabang: 'UtSutZUJnmkKX57I8MwO',                          // ID dokumen di koleksi kantorCabang
    wa: '6285287416936',
    sdk: 'https://www.gstatic.com/firebasejs/10.14.1/'
  };

  var S = { open: false, initP: null, uid: null, chat: null, msgs: [], sending: false, marking: false, formOpen: false, call: null };
  var $ = function (s, c) { return (c || document).querySelector(s); };
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  /* ====== STYLE ====== */
  var css = '' +
    '.fwc-fab{position:fixed;left:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:9990;display:flex;align-items:center;gap:8px;border:0;border-radius:99px;background:var(--brand,#0a4bc2);color:#fff;font:700 15px/1 "Plus Jakarta Sans",system-ui,sans-serif;padding:14px 18px;box-shadow:0 8px 22px rgba(10,75,194,.35);cursor:pointer}' +
    '.fwc-fab b{background:#ff5a36;border-radius:99px;min-width:20px;padding:3px 6px;font-size:12px;text-align:center}' +
    '.fwc-fab b[hidden]{display:none}' +
    '.fwc-sheet{position:fixed;left:0;right:0;bottom:0;z-index:9999;margin:0 auto;width:100%;max-width:440px;height:80vh;height:80dvh;max-height:640px;background:#fff;color:#1a2430;border-radius:20px 20px 0 0;box-shadow:0 -8px 40px rgba(0,0,0,.25);display:none;flex-direction:column;font:500 15px/1.45 "Plus Jakarta Sans",system-ui,sans-serif}' +
    '.fwc-sheet.on{display:flex}' +
    '.fwc-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;padding:14px 16px;background:var(--brand,#0a4bc2);color:#fff;border-radius:20px 20px 0 0}' +
    '.fwc-head b{display:block;font-size:16px}.fwc-head small{display:block;font-size:12px;opacity:.9;margin-top:2px}' +
    '.fwc-x{border:0;background:rgba(255,255,255,.2);color:#fff;border-radius:50%;width:32px;height:32px;font-size:18px;cursor:pointer;flex:none}' +
    '.fwc-list{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px;background:#f4f7fb}' +
    '.fwc-m{max-width:82%;padding:9px 12px;border-radius:14px;word-wrap:break-word;white-space:pre-wrap}' +
    '.fwc-m small{display:block;font-size:11px;opacity:.65;margin-top:3px}' +
    '.fwc-m.me{align-self:flex-end;background:var(--brand,#0a4bc2);color:#fff;border-bottom-right-radius:4px}' +
    '.fwc-m.ad{align-self:flex-start;background:#fff;border:1px solid #e1e6ec;border-bottom-left-radius:4px}' +
    '.fwc-m.sys{align-self:center;background:#e8f0ff;color:#0a3a96;font-size:13px;text-align:center;max-width:92%}' +
    '.fwc-bar{padding:8px 12px 0;display:flex;gap:8px;flex-wrap:wrap}' +
    '.fwc-chip{border:1px solid #c9d6ee;background:#fff;color:#0a3a96;border-radius:99px;font:700 13px/1 inherit;padding:9px 12px;cursor:pointer}' +
    '.fwc-send{display:flex;gap:8px;padding:10px 12px calc(10px + env(safe-area-inset-bottom,0px))}' +
    '.fwc-send input{flex:1;min-width:0;border:1px solid #c9d6ee;border-radius:12px;padding:11px 12px;font:inherit;font-size:16px}' +
    '.fwc-send button{border:0;background:var(--brand,#0a4bc2);color:#fff;border-radius:12px;padding:0 16px;font:700 15px/1 inherit;cursor:pointer}' +
    '.fwc-send button:disabled{opacity:.5}' +
    '.fwc-form{display:none;padding:12px 14px;border-top:1px solid #e1e6ec;background:#fff}' +
    '.fwc-form.on{display:block}' +
    '.fwc-form label{display:block;font-size:12px;font-weight:700;color:#6b7785;margin:8px 0 4px}' +
    '.fwc-form input{width:100%;border:1px solid #c9d6ee;border-radius:10px;padding:10px;font:inherit;font-size:16px}' +
    '.fwc-form p{font-size:12px;color:#6b7785;margin:8px 0 0}' +
    '.fwc-row{display:flex;gap:8px;margin-top:10px}.fwc-row button{flex:1;border-radius:10px;padding:11px;font:700 14px/1 inherit;cursor:pointer;border:1px solid #c9d6ee;background:#fff;color:#1a2430}' +
    '.fwc-row .go{background:var(--brand,#0a4bc2);border-color:var(--brand,#0a4bc2);color:#fff}' +
    '.fwc-row button:disabled{opacity:.55}' +
    '.fwc-err{display:none;margin:8px 12px 0;padding:9px 12px;border-radius:10px;background:#fdeceb;color:#a12a22;font-size:13px}' +
    '.fwc-err.on{display:block}.fwc-err a{color:inherit;font-weight:700}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* ====== DOM ====== */
  var fab = document.createElement('button');
  fab.type = 'button'; fab.className = 'fwc-fab'; fab.setAttribute('aria-label', 'Buka chat');
  fab.innerHTML = '<span>💬 Chat</span><b hidden>0</b>';
  var sheet = document.createElement('div');
  sheet.className = 'fwc-sheet'; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-label', 'Chat FAMILI WATER');
  sheet.innerHTML =
    '<div class="fwc-head"><div><b>Chat FAMILI WATER</b><small>Anonim. Nama dan lokasi baru terkirim kalau Ibu menekan tombolnya.</small></div><button type="button" class="fwc-x" aria-label="Tutup">×</button></div>' +
    '<div class="fwc-list" aria-live="polite"></div>' +
    '<div class="fwc-err"></div>' +
    '<div class="fwc-bar"><button type="button" class="fwc-chip" data-a="order">📍 Kirim nama &amp; lokasi</button><a class="fwc-chip" style="text-decoration:none" target="_blank" rel="noopener" href="https://wa.me/' + CFG.wa + '?text=' + encodeURIComponent('Halo FAMILI WATER, saya ingin memesan Air Godogan.') + '">Lewat WhatsApp</a></div>' +
    '<div class="fwc-form">' +
      '<label for="fwcNama">Nama</label><input id="fwcNama" maxlength="100" autocomplete="name" placeholder="Contoh: Ibu Siti">' +
      '<label for="fwcCatatan">Catatan (boleh kosong)</label><input id="fwcCatatan" maxlength="200" placeholder="Contoh: pagar hijau, galon 2">' +
      '<p>Lokasi rumah hanya dikirim ke admin FAMILI WATER supaya kurir tahu alamatnya. Browser akan meminta izin lokasi.</p>' +
      '<div class="fwc-row"><button type="button" data-a="batal">Batal</button><button type="button" class="go" data-a="kirimOrder">Izinkan lokasi &amp; kirim</button></div>' +
    '</div>' +
    '<div class="fwc-send"><input id="fwcInput" maxlength="500" placeholder="Tulis pertanyaan…" autocomplete="off" enterkeyhint="send"><button type="button" data-a="kirim">Kirim</button></div>';
  document.body.appendChild(fab);
  document.body.appendChild(sheet);

  var listEl = $('.fwc-list', sheet), errEl = $('.fwc-err', sheet), formEl = $('.fwc-form', sheet),
      inp = $('#fwcInput', sheet), badge = $('b', fab), btnSend = $('[data-a="kirim"]', sheet),
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
    hi.textContent = 'Halo! Silakan tanya-tanya soal air godogan. Kalau mau pesan, tekan “Kirim nama & lokasi”.';
    listEl.appendChild(hi);
    S.msgs.forEach(function (m) {
      var d = document.createElement('div');
      d.className = 'fwc-m ' + (m.from === 'admin' ? 'ad' : 'me');
      d.appendChild(document.createTextNode((m.tipe === 'order' ? '📍 ' : '') + (m.text || '')));
      var t = jam(m);
      if (t) { var s = document.createElement('small'); s.textContent = t; d.appendChild(s); }
      listEl.appendChild(d);
    });
    if (S.chat && S.chat.status === 'closed') {
      var c = document.createElement('div');
      c.className = 'fwc-m sys';
      c.textContent = 'Percakapan ini sudah ditutup admin. Kirim pesan baru kalau masih perlu bantuan.';
      listEl.appendChild(c);
    }
    if (near || S.msgs.length < 2) listEl.scrollTop = listEl.scrollHeight;
  }
  function renderBadge() {
    var n = (S.chat && S.chat.unreadPengunjung) || 0;
    badge.textContent = n > 9 ? '9+' : String(n);
    badge.hidden = !(n > 0 && !S.open);
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

  function buka() {
    S.open = true; sheet.classList.add('on'); fab.style.display = 'none'; renderMsgs(); renderBadge();
    init().then(function () { onChat(); }).catch(function (e) { showErr(pesanError(e), true); });
  }
  function tutup() { S.open = false; sheet.classList.remove('on'); fab.style.display = ''; tutupForm(); renderBadge(); }

  fab.addEventListener('click', buka);
  $('.fwc-x', sheet).addEventListener('click', tutup);
  sheet.addEventListener('click', function (e) {
    var b = e.target.closest('[data-a]'); if (!b) return;
    var a = b.getAttribute('data-a');
    if (a === 'kirim') kirim(); else if (a === 'order') bukaForm(); else if (a === 'batal') tutupForm(); else if (a === 'kirimOrder') kirimOrder();
  });
  inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); kirim(); } });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && S.open) tutup(); });
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-fwchat]');
    if (t) { e.preventDefault(); buka(); }
  });

  window.FWChat = { open: buka, close: tutup };
  renderMsgs();

  // Pengunjung yang pernah chat: sambungkan diam-diam supaya badge balasan muncul
  if (lsGet('fw_chat_on') === '1' && CFG.idCabang !== 'ISI_ID_CABANG') {
    setTimeout(function () { init().catch(function () {}); }, 1500);
  }
})();
