// Google Apps Script – dán vào Sheet: Tiện ích mở rộng → Apps Script
// Đổi TOKEN thành một chuỗi bí mật của riêng bạn (dài, khó đoán).
const TOKEN = 'DOI_THANH_MAT_KHAU_CUA_BAN';
const SHEET_NAME = 'GiaoDich';
const HEAD = ['id', 'type', 'amount', 'cat', 'note', 'date'];

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(SHEET_NAME);
  if (!s) {
    s = ss.insertSheet(SHEET_NAME);
    s.getRange(1, 1, 1, 6).setValues([HEAD]);
    s.getRange('A:B').setNumberFormat('@');   // văn bản, tránh Sheets tự đổi kiểu
    s.getRange('D:F').setNumberFormat('@');
    s.setFrozenRows(1);
  }
  return s;
}

function fmtDate_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(v);
}

function readAll_(s) {
  const n = s.getLastRow() - 1;
  if (n < 1) return [];
  return s.getRange(2, 1, n, 6).getValues()
    .filter(function (r) { return r[0] !== ''; })
    .map(function (r) {
      return { id: String(r[0]), type: String(r[1]), amount: Number(r[2]) || 0,
               cat: String(r[3]), note: String(r[4]), date: fmtDate_(r[5]) };
    });
}

function writeAll_(s, rows) {
  rows.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  const last = s.getLastRow();
  if (last > 1) s.getRange(2, 1, last - 1, 6).clearContent();
  if (!rows.length) return;
  s.getRange(2, 1, rows.length, 6).setValues(rows.map(function (r) {
    return [String(r.id), String(r.type), Number(r.amount) || 0, String(r.cat), String(r.note || ''), String(r.date)];
  }));
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  if (!e || !e.parameter || !e.parameter.token) return ContentService.createTextOutput('Sổ Chi Tiêu API đang chạy.');
  if (e.parameter.token !== TOKEN) return out_({ ok: false, error: 'Sai mã bí mật (token)' });
  return out_({ ok: true, rows: readAll_(getSheet_()) });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const b = JSON.parse(e.postData.contents);
    if (b.token !== TOKEN) return out_({ ok: false, error: 'Sai mã bí mật (token)' });
    const s = getSheet_();
    const map = new Map(readAll_(s).map(function (r) { return [r.id, r]; }));
    const put = function (r) {
      map.set(String(r.id), { id: String(r.id), type: r.type, amount: r.amount, cat: r.cat, note: r.note, date: r.date });
    };
    (b.ops || []).forEach(function (o) {
      if (o.op === 'set') put(o.r);
      else if (o.op === 'del') map.delete(String(o.id));
      else if (o.op === 'replaceAll') { map.clear(); (o.rows || []).forEach(put); }
    });
    writeAll_(s, Array.from(map.values()));
    return out_({ ok: true });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
