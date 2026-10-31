// Unit test cho luật game Quest Journal. Chạy: npm test (trong src/quest-journal)
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const SRC = path.join(__dirname, '../../../src/quest-journal/www');
const C = require(path.join(SRC, 'config.js'));
const L = require(path.join(SRC, 'logic.js'));

const day = (s, h = 12) => new Date(`${s}T${String(h).padStart(2, '0')}:00:00`);
const fresh = () => L.newState(C);

test('quest dài hơn maxQuestHours bị chặn và yêu cầu chia nhỏ', () => {
  const s = fresh();
  const r = L.addQuest(s, 'Viết cả game', C.maxQuestHours + 1, C);
  assert.equal(r.ok, false);
  assert.equal(r.needsSplit, true);
  assert.equal(s.quests.length, 0);
});

test('quest đúng maxQuestHours được nhận', () => {
  const s = fresh();
  assert.equal(L.addQuest(s, 'Title screen', C.maxQuestHours, C).ok, true);
});

test('quest cần tên và thời lượng', () => {
  const s = fresh();
  assert.equal(L.addQuest(s, '   ', 1, C).ok, false);
  assert.equal(L.addQuest(s, 'A', null, C).ok, false);
});

test('chia quest lớn: cần >= 2 quest con, mỗi con <= max', () => {
  const s = fresh();
  assert.equal(L.addSplitQuest(s, 'Lớn', [{ title: 'a', hours: 2 }], C).ok, false);
  assert.equal(L.addSplitQuest(s, 'Lớn', [{ title: 'a', hours: 2 }, { title: 'b', hours: 5 }], C).ok, false);
  const r = L.addSplitQuest(s, 'Lớn', [{ title: 'a', hours: 2 }, { title: 'b', hours: 4 }], C);
  assert.equal(r.ok, true);
  assert.equal(r.quest.hours, 6);
  assert.equal(L.childrenOf(s, r.quest.id).length, 2);
});

test('chỉ một quest đang làm; không chọn được quest lớn', () => {
  const s = fresh();
  const a = L.addQuest(s, 'A', 1, C).quest;
  const b = L.addQuest(s, 'B', 1, C).quest;
  L.setActive(s, a.id);
  const r = L.setActive(s, b.id);
  assert.equal(r.previous, a.id);
  assert.equal(s.activeId, b.id);
  const g = L.addSplitQuest(s, 'G', [{ title: 'x', hours: 1 }, { title: 'y', hours: 1 }], C).quest;
  assert.equal(L.setActive(s, g.id).ok, false);
});

test('hoàn thành trao XP và vàng theo số giờ', () => {
  const s = fresh();
  const q = L.addQuest(s, 'A', 1, C).quest;
  L.setActive(s, q.id);
  const r = L.completeActive(s, C, day('2026-10-01'));
  const expected = L.reward(1, 1, C);
  assert.equal(r.xp, expected.xp);
  assert.equal(r.gold, expected.gold);
  assert.equal(s.gold, expected.gold);
  assert.equal(s.activeId, null);
  assert.equal(q.done, true);
});

test('không có quest đang làm thì không hoàn thành được', () => {
  assert.equal(L.completeActive(fresh(), C).ok, false);
});

test('lên cấp khi đủ XP, phần dư được giữ', () => {
  const s = fresh();
  const need = L.xpToNext(1, C);
  const gained = L.addXp(s, need + 7, C);
  assert.equal(gained, 1);
  assert.equal(s.level, 2);
  assert.equal(s.xp, 7);
});

test('streak tăng theo ngày liên tiếp, không tăng 2 lần trong ngày', () => {
  const s = fresh();
  const doOne = (d) => { const q = L.addQuest(s, 'q', 0.5, C).quest; L.setActive(s, q.id); return L.completeActive(s, C, d); };
  doOne(day('2026-10-01'));
  doOne(day('2026-10-01', 18));
  assert.equal(s.streak, 1);
  doOne(day('2026-10-02'));
  assert.equal(s.streak, 2);
  assert.equal(s.bestStreak, 2);
});

test('bỏ lỡ một ngày thì streak về 0 khi mở app', () => {
  const s = fresh();
  const q = L.addQuest(s, 'q', 1, C).quest;
  L.setActive(s, q.id);
  L.completeActive(s, C, day('2026-10-01'));
  assert.equal(L.refreshStreak(s, day('2026-10-02')), false);
  assert.equal(L.refreshStreak(s, day('2026-10-03')), true);
  assert.equal(s.streak, 0);
});

test('xong hết quest con thì quest lớn hoàn tất và có thưởng thêm', () => {
  const s = fresh();
  const r = L.addSplitQuest(s, 'G', [{ title: 'x', hours: 2 }, { title: 'y', hours: 2 }], C);
  const [x, y] = r.children;
  L.setActive(s, x.id);
  assert.equal(L.completeActive(s, C, day('2026-10-01')).groupCompleted, null);
  L.setActive(s, y.id);
  const res = L.completeActive(s, C, day('2026-10-01'));
  assert.ok(res.groupCompleted);
  assert.equal(r.quest.done, true);
  assert.equal(res.groupCompleted.gold, L.reward(4 * C.groupBonusPct, 1, C).gold);
});

test('xóa quest lớn xóa luôn quest con và bỏ quest đang làm', () => {
  const s = fresh();
  const r = L.addSplitQuest(s, 'G', [{ title: 'x', hours: 1 }, { title: 'y', hours: 1 }], C);
  L.setActive(s, r.children[0].id);
  L.deleteQuest(s, r.quest.id);
  assert.equal(s.quests.length, 0);
  assert.equal(s.activeId, null);
});

test('mua đồ: trừ vàng, chặn khi thiếu vàng hoặc chưa đủ cấp', () => {
  const s = fresh();
  const item = C.shop.find(i => i.price > 0 && !i.minLevel);
  assert.equal(L.buy(s, item.id, C).ok, false);
  s.gold = item.price;
  assert.equal(L.buy(s, item.id, C).ok, true);
  assert.equal(s.gold, 0);
  assert.equal(s.equipped[item.type], item.id);
  assert.equal(L.buy(s, item.id, C).ok, false);
  const locked = C.shop.find(i => i.minLevel);
  s.gold = 99999;
  assert.equal(L.buy(s, locked.id, C).ok, false);
});

test('migrate giữ dữ liệu cũ và bù trường thiếu', () => {
  const m = L.migrate({ gold: 42, quests: [{ id: 'a' }] }, C);
  assert.equal(m.gold, 42);
  assert.equal(m.level, 1);
  assert.deepEqual(m.equipped, C.defaults);
  assert.equal(L.migrate(null, C).gold, 0);
});
