/* Quest Journal — luật game thuần (không đụng DOM), để test được bằng `node --test`. */
(function (root) {
  const STATE_VERSION = 1;

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /** Khóa ngày theo giờ địa phương: "YYYY-MM-DD". */
  function dateKey(date) {
    const d = date instanceof Date ? date : new Date(date);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }

  /** Số ngày lịch giữa hai khóa ngày (b - a). */
  function daysBetween(a, b) {
    const [ay, am, ad] = a.split('-').map(Number);
    const [by, bm, bd] = b.split('-').map(Number);
    return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
  }

  function newState(config) {
    return {
      version: STATE_VERSION,
      quests: [],
      activeId: null,
      level: 1,
      xp: 0,            // XP trong cấp hiện tại
      totalXp: 0,
      gold: 0,
      streak: 0,
      bestStreak: 0,
      lastDoneDate: null,
      completedCount: 0,
      owned: Object.values(config.defaults),
      equipped: { ...config.defaults }
    };
  }

  /** Nạp lại state đã lưu, bù các trường còn thiếu. */
  function migrate(saved, config) {
    const base = newState(config);
    if (!saved || typeof saved !== 'object') return base;
    const s = { ...base, ...saved, equipped: { ...base.equipped, ...(saved.equipped || {}) } };
    s.owned = Array.from(new Set([...(base.owned), ...(saved.owned || [])]));
    s.quests = Array.isArray(saved.quests) ? saved.quests : [];
    s.version = STATE_VERSION;
    return s;
  }

  function xpToNext(level, config) {
    return Math.round(config.level.base * Math.pow(level, config.level.exponent));
  }

  function streakMultiplier(streak, config) {
    return 1 + Math.min(streak * config.streakBonusPerDay, config.streakBonusCap);
  }

  /** Phần thưởng cho một quest `hours` giờ khi đang có `streak` ngày. */
  function reward(hours, streak, config) {
    return {
      xp: Math.round(hours * config.xpPerHour * streakMultiplier(streak, config)),
      gold: Math.max(config.minGold, Math.round(hours * config.goldPerHour))
    };
  }

  function addXp(state, amount, config) {
    state.xp += amount;
    state.totalXp += amount;
    let levelsGained = 0;
    while (state.xp >= xpToNext(state.level, config)) {
      state.xp -= xpToNext(state.level, config);
      state.level += 1;
      levelsGained += 1;
    }
    return levelsGained;
  }

  function validHours(hours, config) {
    return typeof hours === 'number' && isFinite(hours) && hours > 0 && hours <= config.maxQuestHours;
  }

  function cleanTitle(title) {
    return String(title || '').trim().slice(0, 120);
  }

  /** Thêm quest đơn. Trả về { ok, quest } hoặc { ok:false, error }. */
  function addQuest(state, title, hours, config, now = new Date()) {
    const t = cleanTitle(title);
    if (!t) return { ok: false, error: 'Quest cần có tên.' };
    if (!(typeof hours === 'number' && hours > 0)) return { ok: false, error: 'Chọn thời lượng cho quest.' };
    if (hours > config.maxQuestHours) {
      return { ok: false, error: `Quest dài hơn ${config.maxQuestHours} giờ phải được chia nhỏ.`, needsSplit: true };
    }
    const quest = { id: uid(), title: t, hours, parentId: null, isGroup: false, done: false, createdAt: now.getTime(), doneAt: null };
    state.quests.push(quest);
    return { ok: true, quest };
  }

  /** Thêm quest lớn đã chia thành các quest con (mỗi con <= maxQuestHours). */
  function addSplitQuest(state, title, subs, config, now = new Date()) {
    const t = cleanTitle(title);
    if (!t) return { ok: false, error: 'Quest lớn cần có tên.' };
    const clean = (subs || []).map(s => ({ title: cleanTitle(s.title), hours: Number(s.hours) })).filter(s => s.title);
    if (clean.length < 2) return { ok: false, error: 'Chia thành ít nhất 2 quest con.' };
    const bad = clean.find(s => !validHours(s.hours, config));
    if (bad) return { ok: false, error: `"${bad.title}" phải dài từ 15 phút đến ${config.maxQuestHours} giờ.` };
    const group = {
      id: uid(), title: t, hours: clean.reduce((a, s) => a + s.hours, 0), parentId: null,
      isGroup: true, done: false, createdAt: now.getTime(), doneAt: null
    };
    state.quests.push(group);
    const children = clean.map(s => {
      const q = { id: uid(), title: s.title, hours: s.hours, parentId: group.id, isGroup: false, done: false, createdAt: now.getTime(), doneAt: null };
      state.quests.push(q);
      return q;
    });
    return { ok: true, quest: group, children };
  }

  function findQuest(state, id) {
    return state.quests.find(q => q.id === id) || null;
  }

  function childrenOf(state, groupId) {
    return state.quests.filter(q => q.parentId === groupId);
  }

  /** Chọn quest "Đang làm". Chỉ một quest tại một thời điểm. */
  function setActive(state, id) {
    const q = findQuest(state, id);
    if (!q) return { ok: false, error: 'Không tìm thấy quest.' };
    if (q.isGroup) return { ok: false, error: 'Hãy chọn một quest con để làm.' };
    if (q.done) return { ok: false, error: 'Quest này đã xong.' };
    const previous = state.activeId;
    state.activeId = id;
    return { ok: true, previous };
  }

  function clearActive(state) {
    state.activeId = null;
  }

  /** Cập nhật streak khi mở app. Trả về true nếu streak vừa bị mất. */
  function refreshStreak(state, now = new Date()) {
    if (!state.lastDoneDate || state.streak === 0) return false;
    if (daysBetween(state.lastDoneDate, dateKey(now)) > 1) {
      state.streak = 0;
      return true;
    }
    return false;
  }

  function bumpStreak(state, now) {
    const today = dateKey(now);
    if (state.lastDoneDate === today) return false;
    if (state.lastDoneDate && daysBetween(state.lastDoneDate, today) === 1) state.streak += 1;
    else state.streak = 1;
    state.lastDoneDate = today;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    return true;
  }

  /** Hoàn thành quest đang làm và trao thưởng. */
  function completeActive(state, config, now = new Date()) {
    const q = state.activeId && findQuest(state, state.activeId);
    if (!q || q.done) return { ok: false, error: 'Chưa có quest nào đang làm.' };
    q.done = true;
    q.doneAt = now.getTime();
    state.activeId = null;
    state.completedCount += 1;

    const streakIncreased = bumpStreak(state, now);
    const r = reward(q.hours, state.streak, config);
    let xp = r.xp;
    let gold = r.gold;

    let groupCompleted = null;
    if (q.parentId) {
      const group = findQuest(state, q.parentId);
      if (group && !group.done && childrenOf(state, group.id).every(c => c.done)) {
        group.done = true;
        group.doneAt = now.getTime();
        const bonus = reward(group.hours * config.groupBonusPct, state.streak, config);
        groupCompleted = { id: group.id, title: group.title, xp: bonus.xp, gold: bonus.gold };
        xp += bonus.xp;
        gold += bonus.gold;
      }
    }

    state.gold += gold;
    const levelsGained = addXp(state, xp, config);
    return { ok: true, quest: q, xp, gold, levelsGained, level: state.level, streak: state.streak, streakIncreased, groupCompleted };
  }

  /** Xóa quest. Xóa quest lớn thì xóa luôn các quest con. */
  function deleteQuest(state, id) {
    const q = findQuest(state, id);
    if (!q) return { ok: false, error: 'Không tìm thấy quest.' };
    const ids = new Set([id, ...(q.isGroup ? childrenOf(state, id).map(c => c.id) : [])]);
    state.quests = state.quests.filter(x => !ids.has(x.id));
    if (ids.has(state.activeId)) state.activeId = null;
    if (q.parentId) {
      const group = findQuest(state, q.parentId);
      const rest = group ? childrenOf(state, group.id) : [];
      if (group && rest.length === 0) state.quests = state.quests.filter(x => x.id !== group.id);
      else if (group && !group.done && rest.every(c => c.done)) { group.done = true; group.doneAt = Date.now(); }
    }
    return { ok: true };
  }

  function shopItem(config, id) {
    return config.shop.find(i => i.id === id) || null;
  }

  function buy(state, itemId, config) {
    const item = shopItem(config, itemId);
    if (!item) return { ok: false, error: 'Không có món này.' };
    if (state.owned.includes(itemId)) return { ok: false, error: 'Bạn đã có món này.' };
    if (item.minLevel && state.level < item.minLevel) return { ok: false, error: `Cần đạt cấp ${item.minLevel}.` };
    if (state.gold < item.price) return { ok: false, error: `Thiếu ${item.price - state.gold} vàng.` };
    state.gold -= item.price;
    state.owned.push(itemId);
    state.equipped[item.type] = itemId;
    return { ok: true, item };
  }

  function equip(state, itemId, config) {
    const item = shopItem(config, itemId);
    if (!item || !state.owned.includes(itemId)) return { ok: false, error: 'Bạn chưa có món này.' };
    state.equipped[item.type] = itemId;
    return { ok: true, item };
  }

  const api = {
    STATE_VERSION, dateKey, daysBetween, newState, migrate, xpToNext, streakMultiplier, reward, addXp,
    addQuest, addSplitQuest, findQuest, childrenOf, setActive, clearActive, refreshStreak,
    completeActive, deleteQuest, shopItem, buy, equip
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.QJ = api;
})(this);
