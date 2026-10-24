'use strict';
(function () {
  var API = '../api/index.php?r=', csrf = null, app = document.getElementById('app'), me = null, CATALOG = [];

  /* ---------------- أدوات DOM ---------------- */
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') e.textContent = attrs[k]; else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]); else e.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function ic(n) { return h('i', { class: 'fa-solid ' + n }); }
  function readJson(r) {
    return r.text().then(function (t) {
      try { return JSON.parse(t); }
      catch (e) { return { ok: false, error: { code: 'bad_response', message: 'السيرفر رد بشكل غير متوقع (HTTP ' + r.status + '). افتح /api/health.php لتشخيص المشكلة.' } }; }
    });
  }
  function call(method, route, body, qs) {
    var o = { method: method, credentials: 'same-origin', headers: { Accept: 'application/json' } };
    function go() {
      if (method !== 'GET') { o.headers['Content-Type'] = 'application/json'; o.headers['X-CSRF-Token'] = csrf; o.body = JSON.stringify(body || {}); }
      return fetch(API + route + (qs || ''), o).then(readJson);
    }
    function withToken() {
      return fetch(API + 'csrf', { credentials: 'same-origin' }).then(readJson).then(function (j) {
        if (!j.ok || !j.data) { return j; }
        csrf = j.data.token; return go();
      });
    }
    var first = (method !== 'GET' && !csrf) ? withToken() : go();
    return first.then(function (j) { if (!j.ok && j.error && j.error.code === 'csrf' && method !== 'GET') { csrf = null; return withToken(); } return j; });
  }
  function msg(box, r, okText) { box.className = 'msg ' + (r.ok ? 'ok' : 'err'); box.textContent = r.ok ? okText : r.error.message; }
  function fld(label, el) { return h('div', {}, [h('label', { text: label }), el]); }
  function inp(type, ph, v) { var e = h('input', { type: type || 'text', placeholder: ph || '', autocomplete: 'off' }); if (v != null) e.value = v; return e; }
  function sel(opts, v) { var e = h('select', {}, opts.map(function (o) { return h('option', { value: o[0], text: o[1] }); })); if (v != null) e.value = v; return e; }
  function can(p) { return !!me && (me.role === 'owner' || (me.perms || []).indexOf(p) >= 0); }
  function qs(o) { return Object.keys(o).filter(function (k) { return o[k] !== '' && o[k] != null; }).map(function (k) { return '&' + k + '=' + encodeURIComponent(o[k]); }).join(''); }

  function table(cols, rows) {
    var t = h('table', {}, [h('thead', {}, [h('tr', {}, cols.map(function (c) { return h('th', { text: c[0] }); }))]), h('tbody', {}, rows.map(function (r) { return h('tr', {}, cols.map(function (c) { var v = c[1](r); return h('td', {}, [v instanceof Node ? v : document.createTextNode(v == null ? '' : String(v))]); })); }))]);
    return h('div', { class: 'tw' }, [t]);
  }
  function avatar(u, big) {
    var box = h('span', { class: 'av' + (big ? ' lg' : '') });
    if (u && u.avatar) box.appendChild(h('img', { src: '../' + u.avatar, alt: '' }));
    else box.textContent = String((u && u.name) || '؟').trim().charAt(0) || '؟';
    return box;
  }
  function pill(t, k) { return h('span', { class: 'pill' + (k ? ' ' + k : ''), text: t }); }
  var ROLE = { owner: ['مالك', 'k'], admin: ['أدمن', 'o'], user: ['مستخدم', ''], merchant: ['محل', 's'] };
  function rolePill(r) { var x = ROLE[r] || [r, '']; return pill(x[0], x[1]); }

  /* نافذة منبثقة: build(close) يرجع { nodes, actions:[ [نص, class, async fn(close, btn)] ] } */
  function modal(title, nodes, actions) {
    var ov = h('div', { class: 'ov', role: 'dialog', 'aria-modal': 'true' }), box = h('div', { class: 'dlg' }), err = h('p', { class: 'msg err', hidden: '' });
    function close() { ov.remove(); document.removeEventListener('keydown', esc); }
    function esc(e) { if (e.key === 'Escape') close(); }
    var acts = h('div', { class: 'acts' }, actions.map(function (a) {
      return h('button', { class: a[1] || '', text: a[0], onclick: function () {
        var b = this; err.hidden = true;
        Promise.resolve(a[2](close, function (m) { err.textContent = m; err.hidden = false; })).catch(function () { err.textContent = 'مشكلة في الاتصال بالسيرفر.'; err.hidden = false; });
        void b;
      } });
    }).concat([h('button', { class: 'sec', text: 'إلغاء', onclick: close })]));
    box.appendChild(h('h3', { text: title })); nodes.forEach(function (n) { box.appendChild(n); }); box.appendChild(err); box.appendChild(acts);
    ov.appendChild(box); ov.addEventListener('mousedown', function (e) { if (e.target === ov) close(); });
    document.addEventListener('keydown', esc); document.body.appendChild(ov);
    return close;
  }
  /* يرجّع Promise بنتيجة الطلب، ولو فشل يظهر الخطأ داخل النافذة */
  function done(r, fail, close, after) { if (r.ok) { close(); if (after) after(r); } else fail(r.error.message); }

  /* وقت وتاريخ بتوقيت القاهرة بصيغة: 12:55 صباحًا — 17/5/2026 */
  function cairo(s) {
    try {
      var d = new Date(String(s).replace(' ', 'T') + 'Z'), p = {};
      new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: 'numeric', minute: '2-digit', hour12: true, day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
      var am = String(p.dayPeriod || '').toLowerCase() === 'am';
      return { time: p.hour + ':' + p.minute + ' ' + (am ? 'صباحًا' : 'مساءً'), date: p.day + '/' + p.month + '/' + p.year };
    } catch (e) { return { time: '', date: String(s || '') }; }
  }
  function cairoTime(s) { try { return new Date(String(s).replace(' ', 'T') + 'Z').toLocaleString('sv-SE', { timeZone: 'Africa/Cairo' }); } catch (e) { return s || ''; } }

  /* ---------------- شاشات الدخول ---------------- */
  function loginView() {
    var box = h('p', { class: 'msg', text: '' }), em = inp('text', 'البريد الإلكتروني أو رقم الهاتف'), pw = inp('password');
    function go() { call('POST', 'auth/login', { identifier: em.value, password: pw.value }).then(function (r) { if (r.ok) boot(); else msg(box, r); }); }
    pw.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    app.replaceChildren(h('div', { class: 'card narrow' }, [h('h3', { text: 'تسجيل دخول الإدارة' }), h('p', { class: 'mut', text: 'نفس بيانات حسابك في الموقع. حسابات المالك والأدمن فقط.' }), fld('البريد أو الهاتف', em), fld('كلمة المرور', pw), box, h('button', { text: 'دخول', onclick: go })]));
  }
  function setupView() {
    var box = h('p', { class: 'msg' }), tk = inp('password'), em = inp('email'), pw = inp('password');
    app.replaceChildren(h('div', { class: 'card narrow' }, [h('h3', { text: 'الإعداد الأول للمالك' }), h('p', { text: 'أدخل كود الإعداد (setup_token من config.php) واختار إيميل وكلمة مرور قوية.' }), fld('كود الإعداد', tk), fld('إيميل المالك', em), fld('كلمة المرور (8+ حروف)', pw), box,
      h('button', { text: 'تفعيل', onclick: function () { call('POST', 'admin/setup', { token: tk.value, email: em.value, password: pw.value }).then(function (r) { if (r.ok) { msg(box, r, 'تم. سجّل دخولك.'); setTimeout(loginView, 900); } else msg(box, r); }); } })]));
  }
  function changePwView() {
    var box = h('p', { class: 'msg' }), cp = inp('password'), np = inp('password');
    app.replaceChildren(h('div', { class: 'card narrow' }, [h('h3', { text: 'غيّر كلمة المرور' }), h('p', { class: 'mut', text: 'لازم تغيّر كلمة المرور المؤقتة قبل ما تكمل.' }), fld('الحالية', cp), fld('الجديدة', np), box,
      h('button', { text: 'حفظ', onclick: function () { call('POST', 'auth/change-password', { current_password: cp.value, new_password: np.value }).then(function (r) { if (r.ok) boot(); else msg(box, r); }); } })]));
  }

  /* ---------------- لوحة التحكم: التابات حسب الصلاحيات ---------------- */
  function tabsFor() {
    var t = [['home', 'الرئيسية', 'fa-gauge', homeTab]];
    if (can('users.view')) t.push(['users', 'الحسابات', 'fa-users', usersTab]);
    if (me.role === 'owner') t.push(['staff', 'الفريق والصلاحيات', 'fa-user-shield', staffTab]);
    if (can('places.view')) t.push(['places', 'الأماكن', 'fa-location-dot', placesTab]);
    if (can('partners.manage')) t.push(['partners', 'التجار', 'fa-handshake', partnersTab]);
    if (can('explore.manage')) t.push(['explore', 'استكشف بورسعيد', 'fa-compass', exploreTab]);
    if (can('uploads.review')) t.push(['uploads', 'لقطات الزوار', 'fa-images', uploadsTab]);
    if (can('feedback.manage')) t.push(['feedback', 'الشكاوى والاقتراحات', 'fa-comment-dots', feedbackTab]);
    if (can('stats.view')) t.push(['stats', 'الإحصائيات', 'fa-chart-column', statsTab]);
    if (can('coupons.redeem')) t.push(['redeem', 'تسوية كوبون', 'fa-ticket', redeemTab]);
    if (me.role === 'owner') t.push(['logs', 'سجل الموقع', 'fa-video', logsTab]);
    t.push(['profile', 'حسابي', 'fa-id-card', profileTab]);
    return t;
  }
  var TABS = [], ACTIVE_TAB = 'home', PARTNER_PENDING = 0, PLACE_PREFILL = null;
  function buildNav() {
    return h('div', { class: 'tabs' }, TABS.map(function (t) {
      var kids = [ic(t[2]), t[1]];
      if (t[0] === 'partners' && PARTNER_PENDING > 0) kids.push(h('span', { class: 'dot', title: PARTNER_PENDING + ' طلب جديد بانتظار المراجعة', text: String(PARTNER_PENDING) }));
      return h('button', { class: t[0] === ACTIVE_TAB ? 'on' : '', onclick: function () { dash(t[0]); } }, kids);
    }));
  }
  function dash(active) {
    TABS = tabsFor();
    var body = h('div', {}), cur = TABS.filter(function (t) { return t[0] === active; })[0] || TABS[0];
    ACTIVE_TAB = cur[0];
    app.replaceChildren(buildNav(), body);
    cur[3](body);
  }
  function refreshPartnerDot() {
    if (!can('partners.manage')) return;
    call('GET', 'admin/partners/pending-count').then(function (r) {
      if (!r.ok) return;
      PARTNER_PENDING = r.data.count;
      var navEl = app.querySelector('.tabs'); if (navEl) navEl.replaceWith(buildNav());
    });
  }
  function permChips(list) { return h('div', { class: 'chips' }, list.map(function (p) { var c = CATALOG.filter(function (x) { return x.code === p; })[0]; return h('span', { class: 'chip', text: c ? c.label : p }); })); }

  function homeTab(box) {
    call('GET', 'admin/home').then(function (r) {
      if (!r.ok) return box.appendChild(h('p', { class: 'msg err', text: r.error.message }));
      var d = r.data;
      box.appendChild(h('section', { class: 'welcome hero' }, [avatar(me, true), h('div', { class: 't' }, [h('p', { text: 'أهلًا بيك' }), h('h2', { text: me.name }), me.role === 'owner' ? h('p', { text: 'مالك — صلاحيات كاملة وسجل الموقع تحت إشرافك.' }) : h('p', { text: 'أدمن — الأقسام الظاهرة لك حسب الصلاحيات الممنوحة.' }), me.role === 'owner' ? null : h('div', { class: 'chips' }, me.perms.length ? me.perms.map(function (p) { var c = CATALOG.filter(function (x) { return x.code === p; })[0]; return h('span', { class: 'chip', text: c ? c.label : p }); }) : [h('span', { class: 'chip', text: 'لسه ماتمنحتش صلاحيات — تواصل مع المالك' })])])]));
      function card(c, warn) {
        var inner = [h('span', { class: 'ic' }, [ic(c.icon)]), h('div', {}, [h('b', { text: String(c.value) }), h('span', { class: 'l', text: c.label })])];
        return c.tab ? h('button', { class: 'card stat' + (warn ? ' warn' : ''), onclick: function () { dash(c.tab); } }, inner) : h('div', { class: 'card stat' + (warn ? ' warn' : '') }, inner);
      }
      if (d.cards.length) box.appendChild(h('div', { class: 'grid' }, d.cards.map(function (c) { return card(c); })));
      if (d.security) {
        box.appendChild(h('h3', { text: 'مراقبة الموقع (آخر 24 ساعة)' }));
        box.appendChild(h('div', { class: 'grid' }, d.security.map(function (c, i) { c.tab = (i < 3) ? 'logs' : 'staff'; return card(c, i === 1 && c.value > 0); })));
        box.appendChild(h('div', { class: 'card' }, [h('h3', {}, [ic('fa-video'), 'آخر الأحداث']), h('div', { class: 'logs' }, d.recent.map(function (e) { return evCard(e, true); })), h('p', {}, [h('button', { class: 'sec', text: 'فتح السجل كاملًا', onclick: function () { dash('logs'); } })])]));
      }
    });
  }

  /* ---------- الحسابات ---------- */
  function usersTab(box) {
    var st = { page: 1 }, list = h('div', {}), cnt = h('b', { text: '…' }), pager = h('div', { class: 'tabs' }), q = h('input', { placeholder: 'ابحث بالاسم أو رقم الهاتف أو الإيميل' }), sf = sel([['', 'كل الحالات'], ['active', 'نشط'], ['suspended', 'معطّل']]);
    var G = function (g) { return g === 'male' ? 'ذكر' : g === 'female' ? 'أنثى' : ''; }, CAN = {};
    function reload() { load(); }
    function editUser(u) {
      var n = inp('text', '', u.name), p = inp('text', '', u.phone || ''), e = inp('email', '', u.email || ''), g = sel([['', '—'], ['male', 'ذكر'], ['female', 'أنثى']], u.gender || '');
      modal('تعديل حساب: ' + u.name, [fld('الاسم', n), fld('رقم الهاتف', p), fld('البريد الإلكتروني (تغييره يلغي التوثيق ويرسل رابط جديد)', e), fld('الجنس', g)],
        [['حفظ', '', function (close, fail) { return call('POST', 'admin/users/update', { id: u.id, name: n.value, phone: p.value, email: e.value, gender: g.value }).then(function (r) { done(r, fail, close, reload); }); }]]);
    }
    function suspend(u) {
      var why = h('textarea', { placeholder: 'اكتب سبب التعطيل (بيظهر للمستخدم ويتبعتله بالبريد)', maxlength: '200' });
      modal('تعطيل حساب: ' + u.name, [fld('سبب التعطيل (إلزامي)', why)], [['تعطيل الحساب', 'bad', function (close, fail) { return call('POST', 'admin/users/status', { id: u.id, status: 'suspended', reason: why.value }).then(function (r) { done(r, fail, close, reload); }); }]]);
    }
    function mailTo(u) {
      var s = inp('text', 'عنوان الرسالة'), m = h('textarea', { placeholder: 'نص الرسالة', maxlength: '4000' });
      modal('مراسلة: ' + u.name, [h('p', { class: 'mut', text: 'هتتبعت على ' + u.email + (u.verified ? '' : ' (البريد غير موثّق)') }), fld('العنوان', s), fld('الرسالة', m)],
        [['إرسال', '', function (close, fail) { return call('POST', 'admin/users/mail', { id: u.id, subject: s.value, message: m.value }).then(function (r) { done(r, fail, close, function () { alert('تم إرسال الرسالة.'); }); }); }]]);
    }
    function load() {
      call('GET', 'admin/users', null, qs({ page: st.page, q: q.value.trim(), status: sf.value })).then(function (r) {
        if (!r.ok) return list.replaceChildren(h('p', { class: 'msg err', text: r.error.message }));
        var d = r.data, pages = Math.max(1, Math.ceil(d.total / d.per)); CAN = d.can; cnt.textContent = String(d.total);
        d.users.forEach(function (u, i) { u._n = (d.page - 1) * d.per + i + 1; });
        pager.replaceChildren(h('button', { class: 'sec sm', text: 'السابق', onclick: function () { if (st.page > 1) { st.page--; load(); } } }), h('span', { class: 'mut', text: 'صفحة ' + d.page + ' من ' + pages }), h('button', { class: 'sec sm', text: 'التالي', onclick: function () { if (st.page < pages) { st.page++; load(); } } }));
        var cols = [['#', function (u) { return u._n; }],
          ['الاسم', function (u) { return h('div', { class: 'ucell' }, [avatar(u), h('span', { text: u.name })]); }],
          ['رقم الهاتف', function (u) { return u.phone; }],
          ['الإيميل', function (u) { return u.email ? h('span', {}, [u.email + ' ', h('i', { class: 'fa-solid ' + (u.verified ? 'fa-circle-check ok-i' : 'fa-circle-xmark no-i'), title: u.verified ? 'موثّق' : 'غير موثّق' })]) : ''; }],
          ['النوع', function (u) { return u.type; }], ['الكلية / المدرسة', function (u) { return u.institution; }], ['الجنس', function (u) { return G(u.gender); }], ['النقاط', function (u) { return u.points; }],
          ['تاريخ التسجيل', function (u) { return cairo(u.created_at).date; }],
          ['الحالة', function (u) { return u.status === 'active' ? pill('نشط', 't') : h('span', {}, [pill('معطّل', 'c'), h('div', { class: 'mut', text: u.disabled_reason || '' })]); }]];
        if (CAN.edit || CAN.suspend || CAN.delete || CAN.mail) cols.push(['', function (u) {
          var b = [];
          if (CAN.edit) b.push(h('button', { class: 'sec sm', text: 'تعديل', onclick: function () { editUser(u); } }));
          if (CAN.mail && u.email) b.push(h('button', { class: 'sec sm', text: 'مراسلة', onclick: function () { mailTo(u); } }));
          if (CAN.suspend) b.push(u.status === 'active' ? h('button', { class: 'sec sm', text: 'تعطيل', onclick: function () { suspend(u); } }) : h('button', { class: 'sec sm', text: 'تفعيل', onclick: function () { call('POST', 'admin/users/status', { id: u.id, status: 'active' }).then(function (x) { if (x.ok) load(); else alert(x.error.message); }); } }));
          if (CAN.delete) b.push(h('button', { class: 'bad sm', text: 'حذف', onclick: function () {
            if (!confirm('هتحذف حساب "' + u.name + '" (' + (u.phone || u.email || '') + ')؟\nبياناته الشخصية هتتمسح ومينفعش الرجوع في الحذف.')) return;
            call('POST', 'admin/users/delete', { id: u.id }).then(function (x) { if (x.ok) load(); else alert(x.error.message); });
          } }));
          return h('div', { class: 'acts' }, b);
        }]);
        list.replaceChildren(table(cols, d.users));
      });
    }
    function exportXlsx(btn) {
      var rows = [], n = 0;
      function next(page) {
        return call('GET', 'admin/users', null, qs({ limit: 200, page: page, q: q.value.trim(), status: sf.value })).then(function (r) {
          if (!r.ok) throw new Error(r.error.message);
          r.data.users.forEach(function (u) { n++; rows.push([n, u.name, u.phone, u.email, u.verified ? 'موثّق' : (u.email ? 'غير موثّق' : ''), u.type, u.institution, u.gov, G(u.gender), Number(u.points) || 0, cairoTime(u.created_at), u.status === 'active' ? 'نشط' : 'معطّل', u.disabled_reason || '']); });
          if (page * 200 < r.data.total) return next(page + 1);
        });
      }
      btn.disabled = true;
      next(1).then(function () { download(buildXlsx('المسجلين', ['#', 'الاسم', 'رقم الهاتف', 'الإيميل', 'توثيق البريد', 'النوع', 'الكلية / المدرسة', 'المحافظة', 'الجنس', 'النقاط', 'تاريخ التسجيل (توقيت القاهرة)', 'الحالة', 'سبب التعطيل'], rows, [6, 28, 16, 30, 14, 16, 42, 16, 10, 10, 24, 10, 30]), 'port-said-hub-users.xlsx'); }).catch(function (e) { alert(e.message); }).then(function () { btn.disabled = false; });
    }
    box.appendChild(h('div', { class: 'grid' }, [h('div', { class: 'card stat' }, [h('span', { class: 'ic' }, [ic('fa-users')]), h('div', {}, [cnt, h('span', { class: 'l', text: 'إجمالي المسجلين' })])])]));
    box.appendChild(h('div', { class: 'card' }, [h('div', { class: 'tools' }, [q, sf, h('button', { text: 'بحث', onclick: function () { st.page = 1; load(); } }), h('button', { class: 'sec', text: 'تصدير Excel (.xlsx)', onclick: function () { exportXlsx(this); } })]), list, pager]));
    load();
  }
  function download(blob, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }

  /* ---------- الفريق والصلاحيات (المالك فقط) ---------- */
  function permPicker(selected) {
    var checks = {}, groups = {}, order = [], node = h('div', {});
    CATALOG.forEach(function (c) { if (!groups[c.group]) { groups[c.group] = { label: c.group_label, items: [] }; order.push(c.group); } groups[c.group].items.push(c); });
    order.forEach(function (g) {
      var fs = h('fieldset', { class: 'perm-g' }, [h('legend', { text: groups[g].label })]);
      groups[g].items.forEach(function (c) {
        var cb = h('input', { type: 'checkbox' }); cb.checked = selected.indexOf(c.code) >= 0; checks[c.code] = cb;
        fs.appendChild(h('label', { class: 'perm' }, [cb, h('span', {}, [c.label, h('small', { text: c.hint })])]));
      });
      node.appendChild(fs);
    });
    return { node: node, get: function () { return Object.keys(checks).filter(function (k) { return checks[k].checked; }); } };
  }
  function staffTab(box) {
    var list = h('div', {}), info = h('p', { class: 'mut' });
    function reload() { box.replaceChildren(); staffTab(box); }
    function roleBlock(withPerms) {
      var role = sel([['admin', 'أدمن (بصلاحيات محددة)'], ['owner', 'مالك (كل الصلاحيات)']]), pk = permPicker([]), wrap = h('div', {}, [h('label', { text: 'الصلاحيات' }), pk.node]);
      role.addEventListener('change', function () { wrap.hidden = role.value === 'owner'; });
      return { role: role, pk: pk, node: [fld('الرتبة', role), wrap] };
    }
    var cn = inp('text', 'الاسم الكامل'), ce = inp('email', 'البريد الإلكتروني'), cph = inp('text', 'رقم الهاتف (اختياري)'), cpw = inp('password', 'كلمة مرور مؤقتة (8+ حروف)'), cb = roleBlock(), co = h('p', { class: 'msg' });
    var ai = inp('text', 'بريد أو هاتف المستخدم المسجّل'), ab = roleBlock(), ao = h('p', { class: 'msg' });
    call('GET', 'admin/staff').then(function (r) {
      if (!r.ok) return list.replaceChildren(h('p', { class: 'msg err', text: r.error.message }));
      var d = r.data; CATALOG = d.catalog;
      info.textContent = 'حسابات المالك: ' + d.owners + ' من ' + d.max_owners + ' كحد أقصى.';
      function editPerms(s) {
        var pk = permPicker(s.perms);
        modal('صلاحيات: ' + s.name, [pk.node], [['حفظ الصلاحيات', '', function (close, fail) { return call('POST', 'admin/staff/perms', { id: s.id, perms: pk.get() }).then(function (x) { done(x, fail, close, reload); }); }]]);
      }
      function suspend(s) {
        var why = h('textarea', { placeholder: 'سبب التعطيل', maxlength: '200' });
        modal('تعطيل حساب الأدمن: ' + s.name, [fld('سبب التعطيل (إلزامي)', why)], [['تعطيل', 'bad', function (close, fail) { return call('POST', 'admin/staff/status', { id: s.id, status: 'suspended', reason: why.value }).then(function (x) { done(x, fail, close, reload); }); }]]);
      }
      list.replaceChildren(table([
        ['الاسم', function (s) { return h('div', { class: 'ucell' }, [avatar(s), h('span', { text: s.name })]); }],
        ['الرتبة', function (s) { return rolePill(s.role); }],
        ['الإيميل', function (s) { return s.email ? h('span', {}, [s.email + ' ', h('i', { class: 'fa-solid ' + (s.verified ? 'fa-circle-check ok-i' : 'fa-circle-xmark no-i') })]) : ''; }],
        ['الصلاحيات', function (s) { return s.role === 'owner' ? 'كل الصلاحيات' : (s.perms.length + ' من ' + CATALOG.length); }],
        ['آخر دخول', function (s) { return s.last_login_at ? cairoTime(s.last_login_at) : '—'; }],
        ['الحالة', function (s) { return s.status === 'active' ? pill('نشط', 't') : h('span', {}, [pill('معطّل', 'c'), h('div', { class: 'mut', text: s.disabled_reason || '' })]); }],
        ['', function (s) {
          if (s.role === 'owner') return h('span', { class: 'mut', text: s.id === me.id ? 'حسابك' : 'محمي' });
          return h('div', { class: 'acts' }, [
            h('button', { class: 'sec sm', text: 'الصلاحيات', onclick: function () { editPerms(s); } }),
            s.status === 'active' ? h('button', { class: 'sec sm', text: 'تعطيل', onclick: function () { suspend(s); } }) : h('button', { class: 'sec sm', text: 'تفعيل', onclick: function () { call('POST', 'admin/staff/status', { id: s.id, status: 'active' }).then(function (x) { if (x.ok) reload(); else alert(x.error.message); }); } }),
            h('button', { class: 'bad sm', text: 'إزالة', onclick: function () { if (confirm('تشيل "' + s.name + '" من الأدمن؟ هيرجع مستخدم عادي.')) call('POST', 'admin/staff/remove', { id: s.id }).then(function (x) { if (x.ok) reload(); else alert(x.error.message); }); } })
          ]);
        }]
      ], d.staff));
    });
    box.appendChild(h('div', { class: 'card' }, [h('h3', {}, [ic('fa-user-shield'), 'فريق الإدارة']), info, list]));
    box.appendChild(h('div', { class: 'two' }, [
      h('div', { class: 'card' }, [h('h3', {}, [ic('fa-user-plus'), 'إنشاء حساب إداري جديد']), h('p', { class: 'mut', text: 'هيوصله بريد توثيق، وهيُطلب منه تغيير كلمة المرور في أول دخول. وتقدر يدخل الموقع كمستخدم عادي بنفس الحساب.' }), fld('الاسم', cn), fld('البريد الإلكتروني', ce), fld('الهاتف', cph), fld('كلمة المرور المؤقتة', cpw)].concat(cb.node, [co,
        h('button', { text: 'إنشاء الحساب', onclick: function () { call('POST', 'admin/staff/create', { name: cn.value, email: ce.value, phone: cph.value, password: cpw.value, role: cb.role.value, perms: cb.pk.get() }).then(function (r) { msg(co, r, 'تم إنشاء الحساب.'); if (r.ok) reload(); }); } })])),
      h('div', { class: 'card' }, [h('h3', {}, [ic('fa-user-check'), 'تعيين مستخدم موجود']), h('p', { class: 'mut', text: 'حوّل حساب مستخدم مسجّل لأدمن أو مالك. حسابه بيفضل شغّال كمستخدم عادي كمان.' }), fld('بريد أو هاتف المستخدم', ai)].concat(ab.node, [ao,
        h('button', { text: 'تعيين', onclick: function () { call('POST', 'admin/staff/appoint', { identifier: ai.value, role: ab.role.value, perms: ab.pk.get() }).then(function (r) { msg(ao, r, 'تم التعيين.'); if (r.ok) reload(); }); } })]))
    ]));
  }

  /* ---------- الأماكن ---------- */
  var CATS = [['fun', 'معالم وترفيه'], ['food', 'مطاعم'], ['cafe', 'كافيهات'], ['sweets', 'حلويات'], ['shop', 'تسوق'], ['sport', 'رياضة'], ['housing', 'سكن']], PST = { active: 'ظاهر', draft: 'مسودة', hidden: 'مخفي' };
  function placesTab(box) {
    var list = h('div', {}), out = h('p', { class: 'msg' }), CAN = {}, editing = null, formCard = h('div', { class: 'card' }), pendingLinkAppId = null;
    var f = { n: inp(), a: inp(), ds: inp(), la: inp(), lo: inp(), r: inp('number'), p: inp('number'), d: inp('number'), c: inp('number'), m: inp('number'), cat: sel(CATS), st: sel(Object.keys(PST).map(function (k) { return [k, PST[k]]; })) };
    function fillForm(p) {
      editing = p ? p.id : null;
      f.n.value = p ? p.name : ''; f.a.value = p ? p.area : ''; f.ds.value = p && p.description ? p.description : ''; f.la.value = p ? p.lat : ''; f.lo.value = p ? p.lon : ''; f.r.value = p ? p.radius : '150'; f.p.value = p ? p.points : ''; f.d.value = p ? p.discount : ''; f.c.value = p ? p.cost : ''; f.m.value = p ? p.commission : '';
      f.cat.value = p ? p.category : 'fun'; f.st.value = p ? p.status : 'active'; title.textContent = p ? 'تعديل: ' + p.name : 'إضافة مكان'; save.textContent = p ? 'حفظ التعديل' : 'حفظ'; cancel.hidden = !p; formCard.hidden = p ? !CAN.edit : !CAN.add;
      if (p) formCard.scrollIntoView({ behavior: 'smooth' });
    }
    var title = h('h3', { text: 'إضافة مكان' }), cancel = h('button', { class: 'sec', text: 'إلغاء التعديل', hidden: '', onclick: function () { fillForm(null); } });
    var save = h('button', { text: 'حفظ', onclick: function () {
      call('POST', 'admin/places', { id: editing || undefined, name: f.n.value, area: f.a.value, lat: f.la.value, lon: f.lo.value, points: f.p.value, discount: f.d.value, cost: f.c.value, commission: f.m.value, category: f.cat.value, status: f.st.value, description: f.ds.value, radius: f.r.value })
        .then(function (r) {
          if (r.ok && pendingLinkAppId) {
            var appId = pendingLinkAppId; pendingLinkAppId = null;
            return call('POST', 'admin/partners/link', { id: appId, place_id: r.data.id }).then(function (lr) {
              msg(out, lr.ok ? r : lr, 'تم إنشاء المكان وربطه بحساب التاجر بنجاح ✓'); if (r.ok) { fillForm(null); load(); refreshPartnerDot(); }
            });
          }
          msg(out, r, editing ? 'تم الحفظ' : 'تمت الإضافة'); if (r.ok) { fillForm(null); load(); }
        });
    } });
    f.la.addEventListener('input', function () { var m = f.la.value.match(/(-?\d+(?:\.\d+)?)\s*[,،\s]\s*(-?\d+(?:\.\d+)?)/); if (m) { f.la.value = m[1]; f.lo.value = m[2]; } });
    formCard.appendChild(title);
    formCard.appendChild(h('div', { class: 'row' }, [fld('الاسم', f.n), fld('المنطقة', f.a), fld('وصف / تفاصيل (اختياري)', f.ds), fld('خط العرض (الصق هنا "lat, lon" من جوجل ماب وهيتقسموا لوحدهم)', f.la), fld('خط الطول (lon)', f.lo), fld('نطاق تسجيل الزيارة بالمتر (30–500)', f.r), fld('نقاط الزيارة', f.p), fld('الخصم %', f.d), fld('تكلفة الكوبون', f.c), fld('العمولة (ج)', f.m), fld('التصنيف', f.cat), fld('الحالة', f.st)]));
    formCard.appendChild(out); formCard.appendChild(h('div', { class: 'acts' }, [save, cancel]));
    function load() {
      call('GET', 'admin/places').then(function (r) {
        if (!r.ok) return list.replaceChildren(h('p', { class: 'msg err', text: r.error.message }));
        CAN = r.data.can; formCard.hidden = !CAN.add && !editing;
        var cols = [['الاسم', function (p) { return p.name; }], ['المنطقة', function (p) { return p.area; }], ['التصنيف', function (p) { return (CATS.filter(function (c) { return c[0] === p.category; })[0] || [0, p.category])[1]; }], ['نقاط', function (p) { return p.points; }], ['خصم %', function (p) { return p.discount; }], ['تكلفة', function (p) { return p.cost; }], ['عمولة', function (p) { return p.commission; }], ['الحالة', function (p) { return pill(PST[p.status] || p.status, p.status === 'active' ? 't' : 's'); }]];
        if (CAN.edit || CAN.remove) cols.push(['', function (p) {
          var b = [];
          if (CAN.edit) b.push(h('button', { class: 'sec sm', text: 'تعديل', onclick: function () { fillForm(p); } }));
          if (CAN.remove) b.push(h('button', { class: 'bad sm', text: 'إزالة', onclick: function () { if (confirm('تشيل "' + p.name + '" من الموقع؟')) call('POST', 'admin/places/delete', { id: p.id }).then(function (x) { if (x.ok) load(); else alert(x.error.message); }); } }));
          return h('div', { class: 'acts' }, b);
        }]);
        list.replaceChildren(table(cols, r.data.places));
      });
    }
    box.appendChild(formCard); box.appendChild(h('div', { class: 'card' }, [list]));
    if (PLACE_PREFILL) {
      var pf = PLACE_PREFILL; PLACE_PREFILL = null; pendingLinkAppId = pf.app_id;
      f.n.value = pf.name; f.a.value = pf.area; f.ds.value = pf.description || ''; f.d.value = pf.discount; f.m.value = pf.commission;
      f.cat.value = pf.category; f.st.value = 'draft'; f.p.value = 20; f.c.value = 0;
      title.textContent = 'إضافة مكان لطلب «' + pf.name + '»'; save.textContent = 'حفظ وربط بحساب التاجر';
      out.className = 'msg'; out.textContent = 'باقي بس تحدد موقع المكان على الخريطة (خط العرض/الطول) وتراجع باقي البيانات، بعدين احفظ.';
      formCard.scrollIntoView({ behavior: 'smooth' });
    }
    load();
  }

  /* ---------- طلبات التجار ("سجل متجرك") ---------- */
  function partnersTab(box) {
    var list = h('div', {}), PSTAT = { pending: ['قيد المراجعة', 's'], approved: ['متوافَق عليه', 't'], rejected: ['مرفوض', 'c'] };
    function reload() { load(); refreshPartnerDot(); }

    /** مودال مراجعة كامل: كل بيانات الطلب + إمكانية تعديل الخصم/العمولة قبل الموافقة. */
    function openReview(a) {
      var disc = inp('number'), comm = inp('number'); disc.value = a.discount; comm.value = a.commission;
      var note = h('textarea', { placeholder: 'ملاحظة للتاجر (إلزامية في حالة الرفض)', maxlength: '500' });
      var body = [
        h('div', { class: 'grid' }, [
          h('div', { class: 'card stat' }, [h('span', { class: 'ic' }, [ic('fa-user-tie')]), h('div', {}, [h('b', { text: a.owner_name }), h('span', { class: 'l', text: a.owner_email + ' · ' + a.phone })])]),
          h('div', { class: 'card stat' }, [h('span', { class: 'ic' }, [ic('fa-location-dot')]), h('div', {}, [h('b', { text: a.area }), h('span', { class: 'l', text: 'المنطقة' })])]),
          h('div', { class: 'card stat' }, [h('span', { class: 'ic' }, [ic('fa-tag')]), h('div', {}, [h('b', { text: (CATS.filter(function (c) { return c[0] === a.category; })[0] || [0, a.category || '—'])[1] }), h('span', { class: 'l', text: 'نوع النشاط' })])]),
          h('div', { class: 'card stat' }, [h('span', { class: 'ic' }, [ic('fa-calendar')]), h('div', {}, [h('b', { text: a.created_at }), h('span', { class: 'l', text: 'تاريخ التقديم' })])])
        ]),
        a.notes ? h('p', { class: 'mut', text: 'أكواد / ملاحظات التاجر: ' + a.notes }) : null,
        h('div', { class: 'row' }, [fld('نسبة الخصم النهائية للعميل %', disc), fld('العمولة النهائية لفريق Alpha (ج/عميل)', comm)]),
        h('p', { class: 'mut', text: 'تقدر تعدّل الأرقام دي قبل الموافقة لو هتتفاوض مع التاجر على نسبة مختلفة.' }),
        fld('ملاحظة / سبب الرفض', note)
      ].filter(Boolean);
      modal('مراجعة طلب: ' + a.business_name, body, [
        ['رفض الطلب', 'bad', function (close, fail) {
          if (!note.value.trim()) { fail('اكتب سبب الرفض الأول.'); return; }
          return call('POST', 'admin/partners/review', { id: a.id, status: 'rejected', note: note.value }).then(function (r) { done(r, fail, close, reload); });
        }],
        ['الموافقة على الطلب', '', function (close, fail) {
          var d = parseInt(disc.value, 10), c = parseFloat(comm.value);
          if (isNaN(d) || d < 0 || d > 100) { fail('نسبة الخصم لازم تكون رقم من 0 إلى 100.'); return; }
          if (isNaN(c) || c < 0) { fail('اكتب قيمة عمولة صحيحة.'); return; }
          return call('POST', 'admin/partners/review', { id: a.id, status: 'approved', note: note.value, discount: d, commission: c }).then(function (r) { done(r, fail, close, reload); });
        }]
      ]);
    }
    function linkPlace(a) {
      call('GET', 'admin/places').then(function (r) {
        if (!r.ok) { alert(r.error.message); return; }
        var opts = r.data.places.map(function (p) { return [p.id, p.name + ' — ' + p.area]; });
        if (!opts.length) { alert('مفيش أماكن مضافة لسه. استخدم زرار "إنشاء مكان جديد وربطه" بدل كده.'); return; }
        var s = sel(opts);
        modal('ربط «' + a.business_name + '» بمكان موجود', [h('p', { class: 'mut', text: 'هيتنسخ الخصم (' + a.discount + '%) والعمولة (' + a.commission + ' ج) على المكان، وهيتضاف حساب التاجر كموظف عليه.' }), fld('اختر المكان', s)],
          [['ربط', '', function (close, fail) { return call('POST', 'admin/partners/link', { id: a.id, place_id: s.value }).then(function (x) { done(x, fail, close, reload); }); }]]);
      });
    }
    function createPlace(a) {
      PLACE_PREFILL = { name: a.business_name, area: a.area, category: a.category || 'food', discount: a.discount, commission: a.commission, description: a.notes || '', app_id: a.id };
      dash('places');
    }
    function load() {
      call('GET', 'admin/partners').then(function (r) {
        if (!r.ok) return list.replaceChildren(h('p', { class: 'msg err', text: r.error.message }));
        var items = r.data.applications;
        if (!items.length) return list.replaceChildren(h('p', { class: 'msg', text: 'لسه محدش سجّل متجره من زر "سجل متجرك".' }));
        var nw = items.filter(function (x) { return x.status === 'pending'; }).length;
        list.replaceChildren(h('p', { class: 'msg' + (nw ? ' err' : ''), text: 'قيد المراجعة: ' + nw + ' من ' + items.length }), table([
          ['المتجر', function (a) { return a.business_name; }],
          ['صاحب الحساب', function (a) { return a.owner_name + (a.owner_email ? ' · ' + a.owner_email : ''); }],
          ['المنطقة', function (a) { return a.area; }], ['الهاتف', function (a) { return a.phone; }],
          ['الخصم %', function (a) { return a.discount; }], ['العمولة', function (a) { return a.commission; }],
          ['الحالة', function (a) { var x = PSTAT[a.status] || [a.status, '']; return pill(x[0], x[1]); }],
          ['المكان المرتبط', function (a) { return a.place_name || (a.status === 'approved' ? pill('غير مربوط', 's') : ''); }],
          ['', function (a) {
            var b = [h('button', { class: 'sm', text: a.status === 'pending' ? 'مراجعة الطلب' : 'مراجعة/تعديل', onclick: function () { openReview(a); } })];
            if (a.status === 'approved' && !a.place_name) {
              b.push(h('button', { class: 'sec sm', text: 'ربط بمكان موجود', onclick: function () { linkPlace(a); } }));
              b.push(h('button', { class: 'sec sm', text: 'إنشاء مكان جديد وربطه', onclick: function () { createPlace(a); } }));
            } else if (a.status === 'approved') {
              b.push(h('button', { class: 'sec sm', text: 'تغيير الربط', onclick: function () { linkPlace(a); } }));
            }
            return h('div', { class: 'acts' }, b);
          }]
        ], items));
      });
    }
    box.appendChild(h('div', { class: 'card' }, [h('h3', {}, [ic('fa-handshake'), 'طلبات التجار']), h('p', { class: 'mut', text: 'طلبات الانضمام اللي وصلت من زر "سجل متجرك" في الموقع. كل تاجر له حساب خاص بيه، منفصل عن حسابات الزوار، وبيبان هنا للمراجعة.' }), list]));
    load();
  }

  /* ---------- مراجعة صور الزوار ---------- */
  function feedbackTab(box) {
    var list = h('div', {}), K = { complaint: 'شكوى', suggestion: 'اقتراح' };
    function setSt(id, st) { call('POST', 'admin/feedback/status', { id: id, status: st }).then(function (x) { if (x.ok) load(); else alert(x.error.message); }); }
    function load() {
      call('GET', 'admin/feedback').then(function (r) {
        if (!r.ok) return list.replaceChildren(h('p', { class: 'msg err', text: r.error.message }));
        var items = r.data.items, nw = items.filter(function (x) { return x.status === 'new'; }).length;
        if (!items.length) return list.replaceChildren(h('p', { class: 'msg', text: 'مفيش شكاوى أو اقتراحات لسه.' }));
        list.replaceChildren(h('p', { class: 'msg', text: 'جديدة: ' + nw + ' من ' + items.length }), table([
          ['النوع', function (x) { return pill(K[x.kind] || x.kind, x.kind === 'complaint' ? 's' : 't'); }],
          ['الرسالة', function (x) { return h('div', { class: 'fbmsg', text: x.message }); }],
          ['المستخدم', function (x) { return x.user_name + (x.user_phone ? ' · ' + x.user_phone : '') + (x.user_email ? ' · ' + x.user_email : ''); }],
          ['الحالة', function (x) { return x.status === 'new' ? pill('جديد', 's') : x.status === 'read' ? pill('اتقرأ', '') : pill('اتعالج', 't'); }],
          ['التاريخ', function (x) { return cairoTime(x.created_at); }],
          ['', function (x) {
            var b = [];
            if (x.status !== 'read') b.push(h('button', { class: 'sm', text: 'اتقرأ', onclick: function () { setSt(x.id, 'read'); } }));
            if (x.status !== 'done') b.push(h('button', { class: 'sm', text: 'اتعالج', onclick: function () { setSt(x.id, 'done'); } }));
            if (x.status !== 'new') b.push(h('button', { class: 'sm', text: 'رجّعها جديدة', onclick: function () { setSt(x.id, 'new'); } }));
            return h('div', { class: 'acts' }, b);
          }]
        ], items));
      });
    }
    box.appendChild(h('div', { class: 'card' }, [h('h3', {}, [ic('fa-comment-dots'), 'الشكاوى والاقتراحات']), h('p', { class: 'mut', text: 'اللي الزوار بيبعتوه من زر \"شكاوى واقتراحات\" في الموقع. استخدمه عشان تطوّر الموقع أكتر.' }), list]));
    load();
  }
  function uploadsTab(box) {
    var list = h('div', {});
    function act(path, id, ask) { if (ask && !confirm(ask)) return; call('POST', path, { id: id }).then(function (x) { if (x.ok) load(); else alert(x.error.message); }); }
    function load() {
      call('GET', 'admin/uploads').then(function (r) {
        if (!r.ok) return list.replaceChildren(h('p', { class: 'msg err', text: r.error.message }));
        var items = r.data.items, pend = items.filter(function (x) { return x.status === 'pending'; }).length;
        if (!items.length) return list.replaceChildren(h('p', { class: 'msg', text: 'مفيش صور مرفوعة من الزوار لسه.' }));
        list.replaceChildren(h('p', { class: 'msg', text: 'بانتظار المراجعة: ' + pend }), table([
          ['الصورة', function (x) { var src = x.th || ('../api/index.php?r=explore/img&f=' + encodeURIComponent(x.file)); return h('a', { href: src, target: '_blank', rel: 'noopener noreferrer' }, [h('img', { src: src, alt: '', loading: 'lazy', class: 'thumb' })]); }],
          ['التعليق', function (x) { return x.caption || '—'; }],
          ['الرافع', function (x) { return x.user_name + (x.user_phone ? ' · ' + x.user_phone : ''); }],
          ['الحالة', function (x) { return x.status === 'pending' ? pill('بانتظار المراجعة', 's') : pill('ظاهرة', 't'); }],
          ['التاريخ', function (x) { return cairoTime(x.created_at); }],
          ['', function (x) {
            var b = [];
            if (x.status === 'pending') b.push(h('button', { class: 'sm', text: 'قبول', onclick: function () { act('admin/uploads/approve', x.id); } }));
            b.push(h('button', { class: 'bad sm', text: 'حذف', onclick: function () { act('admin/uploads/delete', x.id, 'تحذف الصورة دي نهائيًا؟'); } }));
            return h('div', { class: 'acts' }, b);
          }]
        ], items));
      });
    }
    box.appendChild(h('div', { class: 'card' }, [h('h3', {}, [ic('fa-images'), 'لقطات الزوار']), h('p', { class: 'mut', text: 'الصور اللي الزوار بيرفعوها في "استكشف بورسعيد". مبتظهرش للناس غير بعد "قبول". "حذف" بيمسح الصورة من الاستضافة كمان.' }), list]));
    load();
  }
  function exploreTab(box) {
    var list = h('div', {}), out = h('p', { class: 'msg' }), et = inp(), ed = inp(), ef = inp('text', 'lighthouse.jpg'), es = inp('number', '0');
    function load() {
      call('GET', 'admin/explore').then(function (r) {
        if (!r.ok) return list.replaceChildren(h('p', { class: 'msg err', text: r.error.message }));
        if (!r.data.items.length) return list.replaceChildren(h('p', { class: 'msg', text: 'مفيش صور أو فيديوهات لسه.' }));
        list.replaceChildren(table([['النوع', function (x) { return x.kind === 'video' ? 'فيديو' : 'صورة'; }], ['العنوان', function (x) { return x.title; }], ['الملف', function (x) { return x.file; }], ['الترتيب', function (x) { return x.sort; }],
          ['', function (x) { return h('button', { class: 'bad sm', text: 'حذف', onclick: function () {
            if (!confirm('تحذف "' + x.title + '" من استكشف بورسعيد؟ (الملف نفسه هيفضل على الاستضافة)')) return;
            call('POST', 'admin/explore/delete', { id: x.id }).then(function (y) { if (y.ok) load(); else alert(y.error.message); });
          } }); }]], r.data.items));
      });
    }
    box.appendChild(h('div', { class: 'card' }, [h('h3', {}, [ic('fa-compass'), 'إضافة صورة أو فيديو في "استكشف بورسعيد"']), h('p', { class: 'mut', text: 'ارفع الملف الأول في فولدر assets/explore على الاستضافة (File Manager أو FTP)، وبعدين اكتب اسمه هنا بالظبط. الصور: jpg / png / webp / gif، والفيديو: mp4 / webm. الاسم بحروف إنجليزي وأرقام من غير مسافات.' }), fld('العنوان', et), fld('وصف قصير (اختياري)', ed), fld('اسم الملف', ef), fld('الترتيب (الأصغر الأول)', es), out,
      h('button', { text: 'حفظ', onclick: function () {
        call('POST', 'admin/explore', { title: et.value, description: ed.value, file: ef.value.trim(), sort: parseInt(es.value || '0', 10) || 0 }).then(function (r) { msg(out, r, 'تمت الإضافة'); if (r.ok) { [et, ed, ef, es].forEach(function (i) { i.value = ''; }); load(); } });
      } })]));
    box.appendChild(h('div', { class: 'card' }, [list])); load();
  }

  /* ---------- الإحصائيات ---------- */
  var SECTION_NAMES = { explore: 'استكشف بورسعيد', fun: 'معالم وترفيه', food: 'مطاعم', cafe: 'كافيهات', sweets: 'حلويات', shop: 'تسوق', sport: 'رياضة', housing: 'السكن', bus: 'مواصلات' };
  var PERIODS = [[1, 'النهارده'], [7, '7 أيام'], [30, '30 يوم'], [0, 'الكل']];
  function usageCard(box) {
    var wrap = h('div', { class: 'card' }), body = h('div', {}), st = { days: 30 };
    function bars(rows, nameOf) {
      var max = rows.reduce(function (m, r) { return Math.max(m, r.n); }, 0), total = rows.reduce(function (m, r) { return m + r.n; }, 0);
      if (!total) return h('p', { class: 'msg', text: 'مفيش بيانات لسه في الفترة دي.' });
      return h('div', { class: 'bars' }, rows.map(function (r, i) { return h('div', { class: 'barrow' }, [h('span', { class: 'bn', text: (i + 1) + '. ' + nameOf(r) }), h('progress', { max: String(max), value: String(r.n) }), h('b', { text: r.n + ' (' + Math.round(r.n * 100 / total) + '%)' })]); }));
    }
    function load() {
      call('GET', 'admin/usage', null, '&days=' + st.days).then(function (r) {
        if (!r.ok) return body.replaceChildren(h('p', { class: 'msg err', text: r.error.message }));
        var have = {}; r.data.sections.forEach(function (x) { have[x.code] = Number(x.n); });
        var secs = Object.keys(SECTION_NAMES).map(function (k) { return { code: k, n: have[k] || 0 }; });
        r.data.sections.forEach(function (x) { if (!SECTION_NAMES[x.code]) secs.push({ code: x.code, n: Number(x.n) }); });
        secs.sort(function (a, b) { return b.n - a.n; });
        var places = r.data.places.map(function (x) { return { name: x.name, cat: x.cat, n: Number(x.n) }; });
        body.replaceChildren(h('h4', { text: 'الأقسام' }), bars(secs, function (x) { return SECTION_NAMES[x.code] || x.code; }), h('h4', { text: 'أكتر الأماكن فتحًا (أعلى 10)' }), bars(places, function (x) { return x.name + (SECTION_NAMES[x.cat] ? ' · ' + SECTION_NAMES[x.cat] : ''); }));
      });
    }
    wrap.appendChild(h('h3', {}, [ic('fa-fire'), 'أكتر حاجة المستخدمين بيدخلوا عليها']));
    var pr = h('div', { class: 'tabs' }, PERIODS.map(function (p) { return h('button', { class: p[0] === st.days ? 'on' : '', text: p[1], onclick: function () { st.days = p[0]; Array.prototype.forEach.call(pr.children, function (x) { x.className = ''; }); this.className = 'on'; load(); } }); }));
    wrap.appendChild(pr); wrap.appendChild(body); box.appendChild(wrap); load();
  }
  function statsTab(box) {
    call('GET', 'admin/stats').then(function (r) {
      if (!r.ok) return box.appendChild(h('p', { class: 'msg err', text: r.error.message }));
      var s = r.data, items = [['المستخدمين', s.users, 'fa-users'], ['جدد آخر 7 أيام', s.new_7d, 'fa-user-plus'], ['الأماكن', s.places, 'fa-location-dot'], ['الزيارات', s.visits, 'fa-shoe-prints'], ['نقاط ممنوحة', s.points_given, 'fa-star'], ['كوبونات نشطة', s.coupons_active, 'fa-ticket'], ['كوبونات مسوّاة', s.coupons_redeemed, 'fa-circle-check'], ['إجمالي العمولات (ج)', s.commission_total, 'fa-coins'], ['عمولات معلّقة (ج)', s.commission_pending, 'fa-hourglass-half']];
      box.appendChild(h('div', { class: 'grid' }, items.map(function (i) { return h('div', { class: 'card stat' }, [h('span', { class: 'ic' }, [ic(i[2])]), h('div', {}, [h('b', { text: String(i[1]) }), h('span', { class: 'l', text: i[0] })])]); })));
      usageCard(box);
      box.appendChild(h('div', { class: 'card' }, [h('h3', { text: 'المستخدمين حسب النوع' }), table([['النوع', function (x) { return x.name; }], ['العدد', function (x) { return x.n; }]], s.by_type)]));
    });
  }
  function redeemTab(box) {
    var out = h('p', { class: 'msg' }), cd = inp();
    box.appendChild(h('div', { class: 'card' }, [h('h3', {}, [ic('fa-ticket'), 'تسوية كوبون (QR)']), h('p', { class: 'mut', text: 'الصق الكود اللي في الـQR (يبدأ بـ PSC.) مرة واحدة فقط لكل كوبون.' }), fld('كود الكوبون', cd), out,
      h('button', { text: 'تسوية', onclick: function () { call('POST', 'coupons/redeem', { payload: cd.value.trim() }).then(function (r) { msg(out, r, r.ok ? 'تمت التسوية: ' + r.data.place + ' · خصم ' + r.data.discount + '% · ' + r.data.customer : ''); }); } })]));
  }
  /* ---------- تصدير Excel حقيقي (.xlsx): كل قيمة في خانة/عمود لوحده، والأرقام نصوص فلا يضيع الصفر ---------- */
  var CRC_T = (function () { var t = [], c, n, k; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
  function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = CRC_T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function u16(v) { return [v & 255, (v >>> 8) & 255]; }
  function u32(v) { return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]; }
  function zipStore(files) {
    var enc = new TextEncoder(), parts = [], cd = [], off = 0, cdSize = 0;
    files.forEach(function (f) {
      var nm = enc.encode(f[0]), data = enc.encode(f[1]), crc = crc32(data);
      var lh = new Uint8Array([].concat([0x50, 0x4b, 3, 4], u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(nm.length), u16(0)));
      var ch = new Uint8Array([].concat([0x50, 0x4b, 1, 2], u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(nm.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(off)));
      parts.push(lh, nm, data); cd.push(ch, nm); cdSize += ch.length + nm.length; off += lh.length + nm.length + data.length;
    });
    var end = new Uint8Array([].concat([0x50, 0x4b, 5, 6], u16(0), u16(0), u16(files.length), u16(files.length), u32(cdSize), u32(off), u16(0)));
    return new Blob(parts.concat(cd, [end]), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  function xesc(s) { return String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function colName(i) { return String.fromCharCode(65 + i); }
  function buildXlsx(sheet, headers, rows, widths) {
    var X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n', NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main', R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    var lastRef = colName(headers.length - 1) + (rows.length + 1);
    var sd = '<row r="1" ht="24" customHeight="1">' + headers.map(function (t, c) { return '<c r="' + colName(c) + '1" s="1" t="inlineStr"><is><t>' + xesc(t) + '</t></is></c>'; }).join('') + '</row>';
    rows.forEach(function (r, i) {
      var n = i + 2;
      sd += '<row r="' + n + '">' + r.map(function (v, c) {
        var ref = colName(c) + n;
        if (typeof v === 'number') return '<c r="' + ref + '"><v>' + v + '</v></c>';
        if (v == null || v === '') return '';
        return '<c r="' + ref + '" s="2" t="inlineStr"><is><t xml:space="preserve">' + xesc(v) + '</t></is></c>';
      }).join('') + '</row>';
    });
    var cols = widths.map(function (w, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>'; }).join('');
    var sheetXml = X + '<worksheet xmlns="' + NS + '"><sheetViews><sheetView workbookViewId="0" rightToLeft="1"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols>' + cols + '</cols><sheetData>' + sd + '</sheetData><autoFilter ref="A1:' + lastRef + '"/></worksheet>';
    var styles = X + '<styleSheet xmlns="' + NS + '"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0F4FB8"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
    var wb = X + '<workbook xmlns="' + NS + '" xmlns:r="' + R + '"><sheets><sheet name="' + xesc(sheet) + '" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">\'' + xesc(sheet) + '\'!$A$1:$' + colName(headers.length - 1) + '$' + (rows.length + 1) + '</definedName></definedNames></workbook>';
    return zipStore([
      ['[Content_Types].xml', X + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
      ['_rels/.rels', X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="' + R + '/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ['xl/workbook.xml', wb],
      ['xl/_rels/workbook.xml.rels', X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="' + R + '/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="' + R + '/styles" Target="styles.xml"/></Relationships>'],
      ['xl/styles.xml', styles],
      ['xl/worksheets/sheet1.xml', sheetXml]
    ]);
  }

  /* ---------- سجل الموقع (المالك فقط): كاميرا مراقبة غير قابلة للحذف ---------- */
  var SEV = { info: 't', notice: 'o', warning: 's', critical: 'c' };
  function evCard(e, mini) {
    var t = cairo(e.created_at), tech = [];
    if (e.ip) tech.push('IP: ' + e.ip);
    if (e.user_agent) tech.push(e.user_agent);
    if (e.meta && Object.keys(e.meta).length) tech.push(JSON.stringify(e.meta));
    var who = e.actor_name + (e.actor_role ? ' (' + (ROLE[e.actor_role] ? ROLE[e.actor_role][0] : e.actor_role) + ')' : '');
    function row(k, v) { return [h('dt', { text: k }), h('dd', { text: v })]; }
    var dl = h('dl', {}, [].concat(row('المستخدم :', who), row('الـ TAG :', e.tag_label), row('الـ ID :', String(e.id)), row('الوقت :', t.time), row('التاريخ :', t.date), row('الشرح :', e.description)));
    return h('article', { class: 'ev s-' + e.severity + (mini ? ' mini' : '') }, [h('div', { class: 'top' }, [pill(e.severity_label, SEV[e.severity]), pill(e.tag_label)]), dl, (!mini && tech.length) ? h('div', { class: 'tech', text: tech.join('  ·  ') }) : null]);
  }
  function logsTab(box) {
    var st = { page: 1 }, list = h('div', { class: 'logs' }), cnt = h('b', { text: '…' }), pager = h('div', { class: 'tabs' }), vmsg = h('p', { class: 'msg', hidden: '' });
    var q = inp('text', 'بحث في الشرح أو اسم المستخدم'), tag = sel([['', 'كل الـ TAGs']]), sev = sel([['', 'كل مستويات الخطورة'], ['info', 'معلومة'], ['notice', 'ملاحظة'], ['warning', 'تحذير'], ['critical', 'حرج']]), ip = inp('text', 'عنوان IP'), from = inp('date'), to = inp('date');
    var tagsLoaded = false;
    function filters() { return { q: q.value.trim(), tag: tag.value, severity: sev.value, ip: ip.value.trim(), from: from.value, to: to.value }; }
    function load() {
      call('GET', 'admin/logs', null, qs(Object.assign({ page: st.page }, filters()))).then(function (r) {
        if (!r.ok) return list.replaceChildren(h('p', { class: 'msg err', text: r.error.message }));
        var d = r.data, pages = Math.max(1, Math.ceil(d.total / d.per));
        cnt.textContent = String(d.total);
        if (!tagsLoaded) { tagsLoaded = true; d.tags.sort(function (a, b) { return b.n - a.n; }).forEach(function (t) { tag.appendChild(h('option', { value: t.code, text: t.label + ' (' + t.n + ')' })); }); }
        pager.replaceChildren(h('button', { class: 'sec sm', text: 'السابق', onclick: function () { if (st.page > 1) { st.page--; load(); } } }), h('span', { class: 'mut', text: 'صفحة ' + d.page + ' من ' + pages }), h('button', { class: 'sec sm', text: 'التالي', onclick: function () { if (st.page < pages) { st.page++; load(); } } }));
        list.replaceChildren.apply(list, d.rows.length ? d.rows.map(function (e) { return evCard(e); }) : [h('p', { class: 'msg', text: 'مفيش أحداث بالفلاتر دي.' })]);
      });
    }
    function exportXlsx(btn) {
      var rows = [];
      function next(page) {
        return call('GET', 'admin/logs', null, qs(Object.assign({ page: page, limit: 100 }, filters()))).then(function (r) {
          if (!r.ok) throw new Error(r.error.message);
          r.data.rows.forEach(function (e) { var t = cairo(e.created_at); rows.push([e.id, e.actor_name, e.actor_role ? (ROLE[e.actor_role] ? ROLE[e.actor_role][0] : e.actor_role) : '', e.tag_label, e.severity_label, t.time, t.date, e.description, e.ip || '']); });
          if (page * 100 < r.data.total && page < 50) return next(page + 1);
        });
      }
      btn.disabled = true;
      next(1).then(function () { download(buildXlsx('سجل الموقع', ['ID', 'المستخدم', 'الدور', 'TAG', 'الخطورة', 'الوقت', 'التاريخ', 'الشرح', 'IP'], rows, [8, 26, 12, 20, 12, 12, 14, 80, 18]), 'port-said-hub-activity-log.xlsx'); }).catch(function (e) { alert(e.message); }).then(function () { btn.disabled = false; });
    }
    box.appendChild(h('div', { class: 'grid' }, [h('div', { class: 'card stat' }, [h('span', { class: 'ic' }, [ic('fa-video')]), h('div', {}, [cnt, h('span', { class: 'l', text: 'إجمالي الأحداث المطابقة' })])])]));
    box.appendChild(h('div', { class: 'card' }, [
      h('h3', {}, [ic('fa-video'), 'سجل الموقع الشامل']),
      h('p', { class: 'mut', text: 'بيسجّل كل حركة للمستخدمين والإدارة مع TAG ومستوى خطورة. للمالك فقط، ومفيش أي طريقة لحذفه أو تعديله من الموقع.' }),
      h('div', { class: 'tools' }, [q, tag, sev]), h('div', { class: 'tools' }, [fld('من تاريخ', from), fld('إلى تاريخ', to), ip,
        h('button', { text: 'تصفية', onclick: function () { st.page = 1; load(); } }),
        h('button', { class: 'sec', text: 'مسح الفلاتر', onclick: function () { q.value = ''; tag.value = ''; sev.value = ''; ip.value = ''; from.value = ''; to.value = ''; st.page = 1; load(); } }),
        h('button', { class: 'sec', text: 'فحص سلامة السجل', onclick: function () {
          var b = this; b.disabled = true; vmsg.hidden = false; vmsg.className = 'msg'; vmsg.textContent = 'جارٍ الفحص...';
          call('GET', 'admin/logs/verify').then(function (r) {
            b.disabled = false;
            if (!r.ok) { msg(vmsg, r); return; }
            vmsg.className = 'msg ' + (r.data.ok ? 'ok' : 'err');
            vmsg.textContent = r.data.ok ? 'السجل سليم ✔ — تم فحص ' + r.data.checked + ' حدث ولم يُكتشف أي تلاعب.' : 'تحذير: تم اكتشاف تلاعب عند الحدث رقم ' + r.data.broken_id + ' — ' + r.data.reason;
          });
        } }),
        h('button', { class: 'sec', text: 'تصدير Excel', onclick: function () { exportXlsx(this); } })]),
      vmsg
    ]));
    box.appendChild(list); box.appendChild(pager);
    q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { st.page = 1; load(); } });
    load();
  }

  /* ---------- حسابي: الصورة الشخصية + توثيق البريد + كلمة المرور ---------- */
  function fileToJpegB64(file, cb) {
    var fr = new FileReader();
    fr.onload = function () {
      var im = new Image();
      im.onload = function () {
        var s = Math.min(1, 800 / Math.max(im.width, im.height)), c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(im.width * s)); c.height = Math.max(1, Math.round(im.height * s));
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        cb(null, c.toDataURL('image/jpeg', 0.88).split(',')[1]);
      };
      im.onerror = function () { cb('الملف مش صورة صالحة.'); };
      im.src = fr.result;
    };
    fr.onerror = function () { cb('تعذّرت قراءة الملف.'); };
    fr.readAsDataURL(file);
  }
  function profileTab(box) {
    var out = h('p', { class: 'msg' }), pc = h('div', {});
    function render() {
      var file = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp' }), mo = h('p', { class: 'msg' });
      var vstat = !me.email ? h('p', { class: 'mut', text: 'مفيش بريد إلكتروني على حسابك.' }) : h('p', {}, [me.email + ' ', me.email_verified ? pill('موثّق', 't') : pill('غير موثّق', 's')]);
      var rs = (me.email && !me.email_verified) ? h('button', { class: 'sec', text: 'إرسال رابط التوثيق', onclick: function () { call('POST', 'auth/resend-verification', {}).then(function (r) { msg(mo, r, 'تم الإرسال، راجع بريدك.'); }); } }) : null;
      var cp = inp('password'), np = inp('password'), po = h('p', { class: 'msg' });
      pc.replaceChildren(h('div', { class: 'two' }, [
        h('div', { class: 'card' }, [h('h3', {}, [ic('fa-camera'), 'الصورة الشخصية']), h('div', { class: 'ucell' }, [avatar(me, true), h('div', {}, [h('b', { text: me.name }), h('div', {}, [rolePill(me.role)])])]), fld('اختار صورة (JPG / PNG / WebP حتى 2MB)', file), out,
          h('div', { class: 'acts' }, [h('button', { text: 'رفع / تغيير الصورة', onclick: function () {
            if (!file.files[0]) { out.className = 'msg err'; out.textContent = 'اختار صورة الأول.'; return; }
            fileToJpegB64(file.files[0], function (err, b64) {
              if (err) { out.className = 'msg err'; out.textContent = err; return; }
              call('POST', 'profile/avatar', { image: b64 }).then(function (r) { msg(out, r, 'تم تحديث الصورة.'); if (r.ok) { me.avatar = r.data.avatar; refreshWho(); render(); } });
            });
          } }), me.avatar ? h('button', { class: 'bad', text: 'حذف الصورة', onclick: function () { call('POST', 'profile/avatar-delete', {}).then(function (r) { if (r.ok) { me.avatar = null; refreshWho(); render(); } else msg(out, r); }); } }) : null])]),
        h('div', { class: 'card' }, [h('h3', {}, [ic('fa-envelope-circle-check'), 'البريد الإلكتروني']), vstat, mo, rs, h('h4', { text: 'صلاحياتك' }), me.role === 'owner' ? h('p', { text: 'مالك: كل الصلاحيات.' }) : permChips(me.perms)]),
        h('div', { class: 'card' }, [h('h3', {}, [ic('fa-lock'), 'تغيير كلمة المرور']), fld('الحالية', cp), fld('الجديدة', np), po, h('button', { text: 'حفظ', onclick: function () { call('POST', 'auth/change-password', { current_password: cp.value, new_password: np.value }).then(function (r) { msg(po, r, 'تم تغيير كلمة المرور.'); if (r.ok) { cp.value = ''; np.value = ''; } }); } })])
      ]));
    }
    box.appendChild(pc); render();
  }

  function refreshWho() {
    var w = document.getElementById('who');
    w.replaceChildren(avatar(me), h('span', { class: 'n', text: me.name }));
    w.hidden = false;
  }
  function boot() {
    document.getElementById('logout').hidden = true; document.getElementById('who').hidden = true;
    call('GET', 'me').then(function (r) {
      if (!r.ok) {
        if (r.error.code === 'must_change_password') return changePwView();
        return call('GET', 'admin/setup-status').then(function (s) { if (s.ok && s.data.pending) setupView(); else loginView(); });
      }
      me = r.data.user;
      document.getElementById('logout').hidden = false;
      if (me.must_change_password) return changePwView();
      if (!me.staff) { app.replaceChildren(h('div', { class: 'card narrow' }, [h('h3', { text: 'الحساب ده مش إداري' }), h('p', { class: 'mut', text: 'لوحة التحكم لحسابات المالك والأدمن فقط. تقدر تستخدم الموقع كمستخدم عادي.' }), h('a', { href: '../' }, [h('button', { text: 'الذهاب للموقع' })])])); return; }
      return call('GET', 'admin/me').then(function (a) {
        if (!a.ok) { app.replaceChildren(h('p', { class: 'msg err', text: a.error.message })); return; }
        me = a.data.user; CATALOG = a.data.catalog; refreshWho(); dash('home'); refreshPartnerDot();
      });
    }).catch(function () { app.replaceChildren(h('p', { class: 'msg err', text: 'مشكلة في الاتصال بالسيرفر.' })); });
  }
  document.getElementById('logout').addEventListener('click', function () { call('POST', 'auth/logout').then(function () { csrf = null; boot(); }); });
  boot();
})();
