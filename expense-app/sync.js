// Đồng bộ với Google Sheets qua Apps Script (xem SHEETS-SETUP.md)
(function () {
  const K = "sheets-sync-v1", O = "sheets-outbox-v1";
  const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v } catch (e) { return d } };
  const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) {} };
  let cfg = load(K, null);          // {url, token, seeded}
  let out = load(O, []);            // hàng đợi thao tác chưa đẩy lên
  let timer = null;
  const cloud = window.cloud = { configured: true, connected: !!cfg, busy: false, status: "" };
  const emit = () => window.dispatchEvent(new CustomEvent("cloudstate"));
  const setStatus = s => { cloud.status = s; emit() };
  const clean = r => ({ id: r.id, type: r.type, amount: r.amount, cat: r.cat, note: r.note || "", date: r.date });
  const norm = r => ({ id: Number(r.id), type: r.type, amount: Number(r.amount) || 0, cat: String(r.cat), note: String(r.note || ""), date: String(r.date) });
  const errMsg = e => /Failed to fetch|NetworkError|Load failed/i.test(e.message)
    ? "Không kết nối được. Kiểm tra link, và Apps Script phải deploy với quyền \"Anyone\"." : e.message;

  async function call(c, ops) {
    let res;
    if (!ops) {
      const u = new URL(c.url); u.searchParams.set("token", c.token);
      res = await fetch(u);
    } else {
      // text/plain để tránh preflight CORS (Apps Script không hỗ trợ OPTIONS)
      res = await fetch(c.url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ token: c.token, ops }) });
    }
    let j; try { j = await res.json() } catch (e) { throw new Error("Link không đúng hoặc chưa deploy Apps Script.") }
    if (!j.ok) throw new Error(j.error || "Lỗi không rõ");
    return j;
  }

  function applyPending(rows) {
    let m = new Map(rows.map(r => [String(r.id), r]));
    out.forEach(o => {
      if (o.op === "set") m.set(String(o.r.id), o.r);
      else if (o.op === "del") m.delete(String(o.id));
      else if (o.op === "replaceAll") { m = new Map(o.rows.map(r => [String(r.id), r])) }
    });
    return Array.from(m.values()).map(norm);
  }

  cloud.sync = async function () {
    if (!cfg || cloud.busy) return;
    if (!navigator.onLine) { setStatus("Đang offline – sẽ tự đồng bộ khi có mạng"); return }
    cloud.busy = true; setStatus("Đang đồng bộ…");
    try {
      if (!cfg.seeded) {
        out = out.concat(window.getLocalData().map(r => ({ op: "set", r: clean(r) })));
        cfg.seeded = true; store(K, cfg); store(O, out);
      }
      if (out.length) {
        const batch = out.slice();
        await call(cfg, batch);
        out = out.slice(batch.length); store(O, out);
      }
      const j = await call(cfg);
      window.onCloudData(applyPending(j.rows));
      setStatus("Đã đồng bộ lúc " + new Date().toLocaleTimeString("vi-VN"));
    } catch (e) { setStatus("Lỗi đồng bộ: " + errMsg(e)) }
    cloud.busy = false;
  };

  const later = () => { clearTimeout(timer); timer = setTimeout(cloud.sync, 800) };
  const push = o => { out.push(o); store(O, out); later() };
  cloud.set = r => push({ op: "set", r: clean(r) });
  cloud.del = id => push({ op: "del", id });
  cloud.replaceAll = arr => { out = [{ op: "replaceAll", rows: arr.map(clean) }]; store(O, out); later() };

  cloud.connect = async function (url, token) {
    const c = { url: url.trim(), token: token.trim(), seeded: false };
    try { await call(c) } catch (e) { throw new Error(errMsg(e)) }
    cfg = c; out = []; store(K, cfg); store(O, out);
    cloud.connected = true; emit();
    return cloud.sync();
  };
  cloud.disconnect = function () {
    cfg = null; out = []; cloud.connected = false;
    try { localStorage.removeItem(K); localStorage.removeItem(O) } catch (e) {}
    setStatus("");
  };
  cloud.getUrl = () => cfg ? cfg.url : "";

  window.addEventListener("online", cloud.sync);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) cloud.sync() });
  emit();
  cloud.sync();
})();
