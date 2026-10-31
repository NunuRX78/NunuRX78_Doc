/* Quest Journal — giao diện, hiệu ứng, âm thanh và lưu trữ. Luật game nằm trong logic.js. */
(function () {
  'use strict';
  const C = window.QJ_CONFIG;
  const L = window.QJ;
  const SAVE_KEY = 'quest-journal-save';
  const $ = (id) => document.getElementById(id);

  const Cap = window.Capacitor;
  const isNative = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  const plugin = (name) => (isNative && Cap.Plugins && Cap.Plugins[name]) || null;

  let state = L.newState(C);

  /* ---------- Lưu trữ ---------- */
  const Store = {
    async load() {
      try {
        const prefs = plugin('Preferences');
        const raw = prefs ? (await prefs.get({ key: SAVE_KEY })).value : localStorage.getItem(SAVE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { console.warn('Không đọc được dữ liệu lưu', e); return null; }
    },
    save(s) {
      const raw = JSON.stringify(s);
      try {
        const prefs = plugin('Preferences');
        if (prefs) prefs.set({ key: SAVE_KEY, value: raw });
        else localStorage.setItem(SAVE_KEY, raw);
      } catch (e) { console.warn('Không lưu được', e); }
    }
  };
  const save = () => Store.save(state);

  /* ---------- Âm thanh (tổng hợp bằng WebAudio, không cần file) ---------- */
  let audio = null;
  function tone(freq, start, dur, type = 'square', vol = 0.08) {
    if (!audio) return;
    const t = audio.currentTime + start;
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(audio.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  const Sfx = {
    unlock() {
      if (audio) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audio = new AC();
    },
    tap() { tone(660, 0, 0.05, 'square', 0.03); },
    complete() { [784, 988, 1319].forEach((f, i) => tone(f, i * 0.07, 0.18)); tone(1568, 0.22, 0.35, 'triangle', 0.07); },
    coin() { tone(1319, 0, 0.06); tone(1760, 0.06, 0.2); },
    levelUp() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.22, 'square', 0.07)); },
    error() { tone(196, 0, 0.15, 'sawtooth', 0.05); tone(147, 0.12, 0.2, 'sawtooth', 0.05); },
    buy() { [988, 1319, 1976].forEach((f, i) => tone(f, i * 0.06, 0.12, 'triangle', 0.08)); }
  };
  function haptic(kind) {
    const h = plugin('Haptics');
    try {
      if (h) {
        if (kind === 'heavy') h.notification({ type: 'SUCCESS' });
        else h.impact({ style: kind === 'medium' ? 'MEDIUM' : 'LIGHT' });
      } else if (navigator.vibrate) {
        navigator.vibrate(kind === 'heavy' ? [30, 40, 60] : kind === 'medium' ? 25 : 10);
      }
    } catch (e) { /* bỏ qua */ }
  }

  /* ---------- Avatar pixel ---------- */
  const SPRITE = [
    '......kkkk......',
    '.....khhhhk.....',
    '....khhhhhhk....',
    '....kssssssk....',
    '....ksessesk....',
    '....kssssssk....',
    '...ccckkkkccc...',
    '..cckaaaaaakcc..',
    '..ccaaayyaaacc..',
    '..cckaaaaaakcc..',
    '..cc.kaaaak.cc..',
    '..cc.kakkak.cc..',
    '...c.kakkak.c...',
    '.....kbkkbk.....',
    '....kbbkkbbk....',
    '....kkkkkkkk....'
  ];
  const PALETTE = { k: '#120d1b', h: '#c0c6d6', s: '#f1c39b', e: '#120d1b', a: '#8a93a8', y: '#f2c14e', b: '#5a3b2a' };
  function avatarHTML() {
    const cape = (L.shopItem(C, state.equipped.cape) || {}).color || '#d94a4a';
    const pet = (L.shopItem(C, state.equipped.pet) || {}).icon || '';
    let rects = '';
    SPRITE.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        if (ch === '.') return;
        const fill = ch === 'c' ? cape : PALETTE[ch];
        rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}"/>`;
      });
    });
    return `<div class="avatar"><svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">${rects}</svg>${pet ? `<span class="pet">${pet}</span>` : ''}</div>`;
  }

  /* ---------- Tiện ích ---------- */
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function fmtHours(h) {
    if (h < 1) return `${Math.round(h * 60)} phút`;
    const whole = Math.floor(h);
    const mins = Math.round((h - whole) * 60);
    return mins ? `${whole}g ${mins}p` : `${whole} giờ`;
  }
  let toastTimer = null;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }
  function bump(id) {
    const e = $(id);
    e.classList.remove('bump');
    void e.offsetWidth;
    e.classList.add('bump');
  }

  /* ---------- Render ---------- */
  function renderHud() {
    const need = L.xpToNext(state.level, C);
    $('hudLevel').textContent = `LV ${state.level}`;
    $('hudTitle').textContent = (L.shopItem(C, state.equipped.title) || {}).name || '';
    $('xpFill').style.width = `${Math.min(100, (state.xp / need) * 100)}%`;
    $('xpText').textContent = `${state.xp} / ${need} XP`;
    $('hudGold').textContent = `🪙 ${state.gold}`;
    $('hudStreak').textContent = `🔥 ${state.streak}`;
    $('hudAvatar').innerHTML = avatarHTML();
  }

  function renderActive() {
    const slot = $('activeSlot');
    slot.innerHTML = '';
    const q = state.activeId && L.findQuest(state, state.activeId);
    if (!q) {
      const empty = el('div', 'card empty-active');
      const hasOpen = state.quests.some(x => !x.done && !x.isGroup);
      empty.innerHTML = hasOpen
        ? 'Chưa chọn quest nào.<br><b>Chạm vào một quest bên dưới</b> để bắt đầu làm.'
        : 'Nhật ký trống.<br>Bấm <b>＋</b> để ghi quest đầu tiên.';
      slot.appendChild(empty);
      return;
    }
    const card = el('div', 'card active-card');
    card.id = 'activeCard';
    card.appendChild(el('div', 'q-title', q.title));
    const r = L.reward(q.hours, nextStreak(), C);
    const parent = q.parentId && L.findQuest(state, q.parentId);
    card.appendChild(el('div', 'q-meta', `${fmtHours(q.hours)} · thưởng +${r.xp} XP · +${r.gold} 🪙${parent ? ` · thuộc "${parent.title}"` : ''}`));
    const actions = el('div', 'actions');
    const done = el('button', 'btn success', '✔ Hoàn thành');
    done.addEventListener('click', onComplete);
    const drop = el('button', 'btn ghost', 'Bỏ ra');
    drop.addEventListener('click', () => { Sfx.tap(); L.clearActive(state); save(); render(); });
    actions.append(done, drop);
    card.appendChild(actions);
    slot.appendChild(card);
  }

  /** Streak sẽ là bao nhiêu nếu hoàn thành một quest ngay bây giờ (để xem trước phần thưởng). */
  function nextStreak() {
    const today = L.dateKey(new Date());
    if (state.lastDoneDate === today) return state.streak;
    if (state.lastDoneDate && L.daysBetween(state.lastDoneDate, today) === 1) return state.streak + 1;
    return 1;
  }

  function questItem(q, { selectable = true } = {}) {
    const li = el('li', 'quest');
    if (q.done) li.classList.add('done');
    if (q.id === state.activeId) li.classList.add('is-active');
    const body = el('div', 'q-body');
    body.appendChild(el('div', 'q-title', q.title));
    if (q.done && q.doneAt) {
      body.appendChild(el('div', 'q-meta', new Date(q.doneAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })));
    } else if (q.id === state.activeId) {
      body.appendChild(el('div', 'q-meta', '⚔ đang làm'));
    }
    li.appendChild(body);
    li.appendChild(el('span', 'q-hours', fmtHours(q.hours)));
    const del = el('button', 'icon-btn', '✕');
    del.setAttribute('aria-label', 'Xóa quest');
    del.addEventListener('click', (ev) => { ev.stopPropagation(); confirmDelete(q); });
    li.appendChild(del);
    if (selectable && !q.done && q.id !== state.activeId) {
      li.classList.add('selectable');
      li.addEventListener('click', () => pickActive(q));
    }
    return li;
  }

  function renderLists() {
    const list = $('questList');
    const doneList = $('doneList');
    list.innerHTML = '';
    doneList.innerHTML = '';
    const top = state.quests.filter(q => !q.parentId);
    const open = top.filter(q => !q.done);
    const done = state.quests.filter(q => q.done && !q.isGroup).sort((a, b) => b.doneAt - a.doneAt);

    open.forEach(q => {
      if (!q.isGroup) { if (q.id !== state.activeId) list.appendChild(questItem(q)); return; }
      const kids = L.childrenOf(state, q.id);
      const doneKids = kids.filter(k => k.done).length;
      const li = el('li', 'quest group');
      const head = el('div', 'group-head');
      head.appendChild(el('span', 'q-title', `🗺 ${q.title}`));
      head.appendChild(el('span', 'q-hours', `${doneKids}/${kids.length}`));
      const del = el('button', 'icon-btn', '✕');
      del.setAttribute('aria-label', 'Xóa quest lớn');
      del.addEventListener('click', () => confirmDelete(q));
      head.appendChild(del);
      li.appendChild(head);
      const bar = el('div', 'group-progress');
      const fill = el('div');
      fill.style.width = `${kids.length ? (doneKids / kids.length) * 100 : 0}%`;
      bar.appendChild(fill);
      li.appendChild(bar);
      const sub = el('ul', 'sub-list');
      kids.filter(k => !k.done).forEach(k => {
        if (k.id === state.activeId) sub.appendChild(el('li', 'q-meta sub-active', `⚔ "${k.title}" đang làm`));
        else sub.appendChild(questItem(k));
      });
      li.appendChild(sub);
      list.appendChild(li);
    });

    if (!list.children.length) list.appendChild(el('li', 'empty-list', open.length ? 'Đang dồn sức cho quest ở trên. Xong nó rồi chọn tiếp!' : 'Không còn quest nào. Nghỉ ngơi hoặc ghi thêm quest mới!'));
    done.slice(0, 50).forEach(q => doneList.appendChild(questItem(q, { selectable: false })));
    const openCount = state.quests.filter(q => !q.done && !q.isGroup).length;
    $('openCount').textContent = openCount ? `(${openCount})` : '';
    $('doneCount').textContent = `(${done.length})`;
    $('doneBox').hidden = done.length === 0;
    $('fab').classList.toggle('pulse', state.quests.length === 0);
  }

  function renderShop() {
    const wrap = $('shopList');
    wrap.innerHTML = '';
    const groups = [['title', '🏷 Danh hiệu'], ['cape', '🧥 Áo choàng'], ['pet', '🐾 Thú cưng']];
    groups.forEach(([type, label]) => {
      const g = el('div', 'shop-group');
      g.appendChild(el('h3', '', label));
      C.shop.filter(i => i.type === type).forEach(item => {
        const owned = state.owned.includes(item.id);
        const equipped = state.equipped[type] === item.id;
        const row = el('div', 'shop-item' + (equipped ? ' equipped' : ''));
        const prev = el('div', 'preview');
        if (type === 'cape') { const sw = el('div', 'swatch'); sw.style.background = item.color; prev.appendChild(sw); }
        else prev.textContent = type === 'pet' ? (item.icon || '—') : '🏷';
        row.appendChild(prev);
        const info = el('div', 'info');
        info.appendChild(el('div', '', item.name));
        if (!owned) {
          info.appendChild(el('div', 'price', item.price ? `🪙 ${item.price}` : 'Miễn phí'));
          if (item.minLevel && state.level < item.minLevel) info.appendChild(el('div', 'lock', `🔒 Cần cấp ${item.minLevel}`));
        }
        row.appendChild(info);
        let btn;
        if (equipped) { btn = el('button', 'btn small', 'Đang dùng'); btn.disabled = true; }
        else if (owned) { btn = el('button', 'btn small ghost', 'Dùng'); btn.addEventListener('click', () => { L.equip(state, item.id, C); Sfx.tap(); save(); render(); }); }
        else {
          btn = el('button', 'btn small primary', 'Mua');
          btn.disabled = state.gold < item.price || (item.minLevel && state.level < item.minLevel);
          btn.addEventListener('click', () => onBuy(item));
        }
        row.appendChild(btn);
        g.appendChild(row);
      });
      wrap.appendChild(g);
    });
  }

  function renderHero() {
    $('heroBig').innerHTML = avatarHTML();
    $('heroTitle').textContent = (L.shopItem(C, state.equipped.title) || {}).name || '';
    $('heroLevel').textContent = `Cấp ${state.level} · ${state.totalXp} XP tổng`;
    const hours = state.quests.filter(q => q.done && !q.isGroup).reduce((a, q) => a + q.hours, 0);
    const stats = [
      [state.completedCount, 'quest đã xong'],
      [fmtHours(hours || 0).replace(' giờ', 'g'), 'giờ tập trung'],
      [`🔥 ${state.streak}`, 'streak hiện tại'],
      [`🏆 ${state.bestStreak}`, 'streak dài nhất'],
      [`🪙 ${state.gold}`, 'vàng đang có'],
      [state.owned.length - Object.keys(C.defaults).length, 'món đã mua']
    ];
    const grid = $('statsGrid');
    grid.innerHTML = '';
    stats.forEach(([v, label]) => {
      const box = el('div', 'stat-box');
      box.appendChild(el('b', '', String(v)));
      box.appendChild(el('span', '', label));
      grid.appendChild(box);
    });
  }

  function render() {
    renderHud();
    renderActive();
    renderLists();
    renderShop();
    renderHero();
  }

  /* ---------- Hành động ---------- */
  function pickActive(q) {
    Sfx.unlock();
    const res = L.setActive(state, q.id);
    if (!res.ok) { toast(res.error); return; }
    Sfx.tap();
    haptic('light');
    save();
    render();
    if (res.previous) toast('Quest cũ đã quay lại nhật ký. Mỗi lần chỉ làm một việc!');
    $('screens').scrollTo({ top: 0, behavior: 'smooth' });
  }

  function onComplete() {
    Sfx.unlock();
    const card = $('activeCard');
    const rect = card.getBoundingClientRect();
    const res = L.completeActive(state, C, new Date());
    if (!res.ok) { toast(res.error); return; }
    save();
    Sfx.complete();
    haptic('heavy');
    card.classList.add('completing');
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    burst(cx, cy);
    floatText(`+${res.xp} XP`, cx - 40, cy - 20, 'xp');
    setTimeout(() => { floatText(`+${res.gold} 🪙`, cx + 50, cy, 'gold'); Sfx.coin(); }, 180);

    setTimeout(() => {
      render();
      bump('hudGold');
      if (res.streakIncreased) bump('hudStreak');
      const queue = [];
      if (res.groupCompleted) queue.push(() => showModal({
        icon: '🗺', title: 'Quest lớn hoàn tất!',
        lines: [`"${res.groupCompleted.title}"`, { html: `<span class="xp">+${res.groupCompleted.xp} XP</span> · <span class="gold">+${res.groupCompleted.gold} 🪙</span> thưởng thêm` }]
      }));
      if (res.levelsGained > 0) queue.push(() => { Sfx.levelUp(); haptic('heavy'); flash(); return showModal({
        icon: '⭐', title: `LÊN CẤP ${res.level}!`,
        lines: ['Bạn mạnh hơn rồi đấy.', unlockedHint(res.level)]
      }); });
      if (!queue.length) {
        const msg = res.streakIncreased && res.streak > 1 ? `🔥 Streak ${res.streak} ngày! Tiếp tục nào.` : pickCheer();
        toast(msg);
      }
      queue.reduce((p, fn) => p.then(fn), Promise.resolve());
    }, 550);
  }

  function unlockedHint(level) {
    const items = C.shop.filter(i => i.minLevel === level);
    return items.length ? `Mở khóa trong cửa hàng: ${items.map(i => i.name).join(', ')}` : 'Ghé cửa hàng xem có gì mới nhé.';
  }

  const CHEERS = ['Quest hoàn thành! ⚔', 'Gạch thêm một việc. Tuyệt!', 'Cú thắng nhỏ, đà lớn!', 'Một bước gần hơn tới đích!', 'Làm tốt lắm, hiệp sĩ!'];
  function pickCheer() { return CHEERS[Math.floor(Math.random() * CHEERS.length)]; }

  function onBuy(item) {
    Sfx.unlock();
    const res = L.buy(state, item.id, C);
    if (!res.ok) { Sfx.error(); toast(res.error); return; }
    save();
    Sfx.buy();
    haptic('medium');
    render();
    bump('hudGold');
    toast(`Đã mua "${item.name}" và trang bị ngay!`);
  }

  function confirmDelete(q) {
    Sfx.unlock();
    const kids = q.isGroup ? L.childrenOf(state, q.id).length : 0;
    showModal({
      icon: '🗑', title: 'Xóa quest?',
      lines: [`"${q.title}"`, kids ? `Cả ${kids} quest con cũng sẽ bị xóa.` : 'Không hoàn tác được.'],
      buttons: [
        { label: 'Xóa', cls: 'primary', value: true },
        { label: 'Giữ lại', cls: 'ghost', value: false }
      ]
    }).then(ok => {
      if (!ok) return;
      L.deleteQuest(state, q.id);
      save();
      render();
      toast('Đã xóa quest.');
    });
  }

  /* ---------- Hiệu ứng ---------- */
  function burst(x, y) {
    const fx = $('fx');
    const colors = ['#f2c14e', '#ffdd7a', '#5fd36a', '#ff9f43', '#ffffff'];
    for (let i = 0; i < 26; i++) {
      const p = el('div', 'particle');
      const ang = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 120;
      p.style.left = `${x}px`;
      p.style.top = `${y}px`;
      p.style.background = colors[i % colors.length];
      p.style.setProperty('--dx', `${Math.cos(ang) * dist}px`);
      p.style.setProperty('--dy', `${Math.sin(ang) * dist - 40}px`);
      p.style.setProperty('--rot', `${Math.random() * 360}deg`);
      fx.appendChild(p);
      setTimeout(() => p.remove(), 950);
    }
  }
  function floatText(text, x, y, cls) {
    const t = el('div', `float-text ${cls}`, text);
    t.style.left = `${x}px`;
    t.style.top = `${y}px`;
    $('fx').appendChild(t);
    setTimeout(() => t.remove(), 1450);
  }
  function flash() {
    const f = el('div', 'flash');
    $('fx').appendChild(f);
    setTimeout(() => f.remove(), 400);
  }

  /* ---------- Modal ---------- */
  let modalResolve = null;
  function showModal({ icon, title, lines = [], buttons = [{ label: 'Tuyệt!', cls: 'primary', value: true }] }) {
    return new Promise(resolve => {
      const m = $('modal');
      m.innerHTML = '';
      if (icon) m.appendChild(el('div', 'big-icon', icon));
      m.appendChild(el('h2', '', title));
      lines.forEach(line => {
        const p = el('p', 'reward-line');
        if (line && line.html) p.innerHTML = line.html; else p.textContent = line;
        m.appendChild(p);
      });
      buttons.forEach(b => {
        const btn = el('button', `btn ${b.cls || ''}`, b.label);
        btn.addEventListener('click', () => closeModal(b.value));
        m.appendChild(btn);
      });
      modalResolve = resolve;
      $('modalBackdrop').hidden = false;
    });
  }
  function closeModal(value) {
    $('modalBackdrop').hidden = true;
    const r = modalResolve;
    modalResolve = null;
    if (r) r(value);
  }

  /* ---------- Sheet thêm quest ---------- */
  let chosenHours = null;
  let splitMode = false;

  function buildChips() {
    const wrap = $('durationChips');
    wrap.innerHTML = '';
    C.durations.forEach(h => {
      const c = el('button', 'chip', fmtHours(h));
      c.type = 'button';
      c.dataset.hours = h;
      c.addEventListener('click', () => chooseDuration(h));
      wrap.appendChild(c);
    });
    const big = el('button', 'chip big', `> ${C.maxQuestHours} giờ`);
    big.type = 'button';
    big.dataset.hours = 'big';
    big.addEventListener('click', () => chooseDuration('big'));
    wrap.appendChild(big);
    $('maxH1').textContent = C.maxQuestHours;
  }

  function chooseDuration(h) {
    Sfx.tap();
    splitMode = h === 'big';
    chosenHours = splitMode ? null : h;
    [...$('durationChips').children].forEach(c => c.classList.toggle('on', c.dataset.hours === String(h)));
    $('splitBox').hidden = !splitMode;
    if (splitMode && !$('subRows').children.length) { addSubRow(); addSubRow(); }
    $('formError').textContent = '';
  }

  function addSubRow() {
    const row = el('div', 'sub-row');
    const input = el('input');
    input.maxLength = 120;
    input.placeholder = `Quest con ${$('subRows').children.length + 1}`;
    const sel = document.createElement('select');
    C.durations.forEach(h => {
      const o = document.createElement('option');
      o.value = h;
      o.textContent = fmtHours(h);
      if (h === 2) o.selected = true;
      sel.appendChild(o);
    });
    const del = el('button', 'icon-btn', '✕');
    del.type = 'button';
    del.setAttribute('aria-label', 'Bỏ quest con');
    del.addEventListener('click', () => row.remove());
    row.append(input, sel, del);
    $('subRows').appendChild(row);
    return input;
  }

  function openSheet() {
    Sfx.unlock();
    Sfx.tap();
    $('questForm').reset();
    $('subRows').innerHTML = '';
    $('splitBox').hidden = true;
    $('formError').textContent = '';
    chosenHours = null;
    splitMode = false;
    [...$('durationChips').children].forEach(c => c.classList.remove('on'));
    $('sheetBackdrop').hidden = false;
    setTimeout(() => $('qTitle').focus(), 250);
  }
  function closeSheet() { $('sheetBackdrop').hidden = true; document.activeElement && document.activeElement.blur(); }

  function submitQuest(ev) {
    ev.preventDefault();
    const title = $('qTitle').value;
    let res;
    if (splitMode) {
      const subs = [...$('subRows').children].map(r => ({ title: r.querySelector('input').value, hours: Number(r.querySelector('select').value) }));
      res = L.addSplitQuest(state, title, subs, C);
    } else {
      res = L.addQuest(state, title, chosenHours, C);
    }
    if (!res.ok) { Sfx.error(); haptic('medium'); $('formError').textContent = res.error; return; }
    save();
    closeSheet();
    Sfx.coin();
    haptic('light');
    render();
    toast(splitMode ? `Đã chia thành ${res.children.length} quest con. Chọn một cái để bắt đầu!` : 'Quest mới đã vào nhật ký!');
  }

  /* ---------- Điều hướng ---------- */
  let currentScreen = 'quests';
  function showScreen(name) {
    currentScreen = name;
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === `screen-${name}`));
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.screen === name));
    document.body.classList.toggle('on-quests', name === 'quests');
    $('screens').scrollTop = 0;
  }

  function handleBack() {
    if (!$('modalBackdrop').hidden) { closeModal(false); return true; }
    if (!$('sheetBackdrop').hidden) { closeSheet(); return true; }
    if (currentScreen !== 'quests') { showScreen('quests'); return true; }
    return false;
  }

  function checkStreak() {
    if (L.refreshStreak(state, new Date())) {
      save();
      render();
      toast('💔 Streak đã về 0. Hoàn thành một quest hôm nay để bắt đầu lại!');
    } else {
      render();
    }
  }

  /* ---------- Khởi động ---------- */
  async function init() {
    state = L.migrate(await Store.load(), C);
    buildChips();
    $('fab').addEventListener('click', openSheet);
    $('cancelSheet').addEventListener('click', closeSheet);
    $('sheetBackdrop').addEventListener('click', (e) => { if (e.target.id === 'sheetBackdrop') closeSheet(); });
    $('addSub').addEventListener('click', () => { Sfx.tap(); addSubRow().focus(); });
    $('questForm').addEventListener('submit', submitQuest);
    document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => { Sfx.unlock(); Sfx.tap(); showScreen(t.dataset.screen); }));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') handleBack(); });

    const app = plugin('App');
    if (app) {
      app.addListener('backButton', () => { if (!handleBack()) app.exitApp(); });
      app.addListener('resume', checkStreak);
    } else {
      document.addEventListener('visibilitychange', () => { if (!document.hidden) checkStreak(); });
    }

    showScreen('quests');
    checkStreak();

    if (window.QJUpdater) {
      $('appVersion').textContent = window.QJUpdater.version.web;
      $('checkUpdate').addEventListener('click', () => { Sfx.unlock(); Sfx.tap(); window.QJUpdater.check(true); });
      window.QJUpdater.init({ toast });
    }
  }

  init();
})();
