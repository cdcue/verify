// Certificate verification page + automatic mail queue.
// 1) Verification: Deploy > New deployment > Web app, Execute as: Me, Who has access: Anyone.
//    The /exec URL goes into verify/web/index.html (the page published on GitHub Pages), whose address goes
//    into the app settings; the /exec URL itself still shows the older page, for links already given out.
// 2) Mail queue: after pasting this file, choose setupMailQueue in the toolbar and press Run once
//    (approve the permissions). Google then runs processQueue every 10 minutes, even with the computer off.
const REGISTRY_ID = '179lVGwO0HQnQRbdXZtW2nFeCpHpBqK-WpJux8wre-64';

function doGet(e) {
  const p = (e && e.parameter) || {};
  const serial = String(p.s || '').trim().toUpperCase();
  const code = String(p.k || '').trim().toUpperCase();  // not "c": Apps Script reserves it
  const found = findCertificate(serial, code);
  if (p.api === '1') {
    // the verification page hosted outside Google (GitHub Pages) reads this without any Google account,
    // so browsers signed in to several accounts do not hit Google's "/u/1/" error
    return ContentService.createTextOutput(JSON.stringify(found)).setMimeType(ContentService.MimeType.JSON);
  }
  const t = HtmlService.createTemplateFromFile('Index');
  t.serial = serial;
  t.code = code;
  t.row = found.row;
  t.locked = found.locked;
  t.linkedin = '';
  if (t.row && !t.row.revoked && !t.locked) {  // LinkedIn's official "Add to profile" link for this certification
    const d = new Date(t.row.issued), q = {startTask: 'CERTIFICATION_NAME', name: t.row.type + ' — ' + t.row.activity,
      organizationName: t.row.org, issueYear: d.getFullYear() || '', issueMonth: (d.getMonth() + 1) || '',
      certUrl: ScriptApp.getService().getUrl() + '?s=' + encodeURIComponent(t.row.serial) + (code ? '&k=' + encodeURIComponent(code) : ''), certId: t.row.serial};
    t.linkedin = 'https://www.linkedin.com/profile/add?' + Object.keys(q).map(k => k + '=' + encodeURIComponent(q[k])).join('&');
  }
  return t.evaluate().setTitle('التحقق من الشواهد').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// {row, locked}: the registry line of a serial. Certificates issued with a secret code (column J) show everything
// only with it (from the QR code or typed); the serial alone proves the certificate exists, nothing more,
// so numbers cannot be browsed one after another.
function findCertificate(serial, code) {
  if (!serial) return {row: null, locked: false};
  const values = SpreadsheetApp.openById(REGISTRY_ID).getSheets()[0].getDataRange().getValues();
  const row = values.slice(1).find(r => String(r[0]).toUpperCase() === serial);
  if (!row) return {row: null, locked: false};
  const out = {serial: row[0], name: row[1], activity: row[2], dates: row[3], org: row[4], type: row[5],
               link: row[6], issued: row[7] instanceof Date ? row[7].toISOString().slice(0, 10) : String(row[7]),
               revoked: String(row[8] || '').startsWith('revoked') ? String(row[8]).replace(/^revoked:?\s*/, '') || 'ملغاة' : ''};
  const need = String(row[9] || '').trim().toUpperCase();
  const locked = !!(need && need !== code);
  if (locked) {
    out.name = String(out.name).split(/\s+/).map(w => w ? w.charAt(0) + '***' : '').join(' ');
    out.link = '';
  }
  return {row: out, locked: locked};
}

// ---------- automatic mail queue (filled by the Shawahid app) ----------
const DAILY_MARGIN = 10;   // sends left untouched each day for the account's own mail
const PAUSE_MS = 1500;     // at most ~40 messages a minute
const MAX_ATTEMPTS = 3;    // a failing address is retried on the next runs, then left as an error
// queue columns: qid, activity_id, person_id, to, subject, body, attach_id, sender, status, attempts, sent_at, error, queued_at, html

function setupMailQueue() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'processQueue').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('processQueue').timeBased().everyMinutes(10).create();
  processQueue();
}

// Mail that left but never arrived (address not found, mailbox full...) comes back to this inbox from
// mailer-daemon. Each one is noted once in 'mail_bounces': address, reason, time, message id.
function scanBounces(book) {
  const sh = book.getSheetByName('mail_bounces') || book.insertSheet('mail_bounces', book.getNumSheets());
  const seen = new Set(sh.getLastRow() ? sh.getRange(1, 4, sh.getLastRow(), 1).getValues().map(r => String(r[0])) : []);
  const out = [];
  GmailApp.search('from:mailer-daemon newer_than:14d', 0, 100).forEach(th => th.getMessages().forEach(m => {
    if (seen.has(m.getId())) return;
    const to = String(m.getHeader('X-Failed-Recipients') || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const reason = m.getPlainBody().split('\n').map(s => s.trim()).filter(Boolean).slice(0, 3).join(' ').slice(0, 300);
    (to.length ? to : ['']).forEach(a => out.push([a, reason, m.getDate().getTime(), m.getId()]));
  }));
  if (out.length) sh.getRange(sh.getLastRow() + 1, 1, out.length, 4).setValues(out);
}

// Personal data is not kept longer than needed: 30 days after a message left (or was cancelled), its address,
// subject and text are erased from the queue; rows stay in place, with their status and time, for the statistics.
function forgetOld(book) {
  const limit = Date.now() - 30 * 24 * 3600 * 1000;
  const sh = book.getSheetByName('mail_queue');
  if (sh && sh.getLastRow() > 1) {
    const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 14).getValues();
    rows.forEach((r, i) => {
      const at = r[8] === 'sent' ? Number(r[10]) : (r[8] === 'cancelled' ? new Date(r[12]).getTime() : NaN);
      if (at < limit && (r[3] || r[5] || r[13])) {
        sh.getRange(i + 2, 4, 1, 3).setValues([['', '', '']]);
        sh.getRange(i + 2, 14).setValue('');
      }
    });
  }
  const bo = book.getSheetByName('mail_bounces');
  if (bo && bo.getLastRow() > 0) {
    bo.getRange(1, 1, bo.getLastRow(), 3).getValues().forEach((r, i) => {
      if (r[0] && Number(r[2]) < limit) bo.getRange(i + 1, 1, 1, 2).setValues([['', '']]);
    });
  }
}

function processQueue() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;  // the previous run is still sending
  try {
    const book = SpreadsheetApp.openById(REGISTRY_ID);
    const sh = book.getSheetByName('mail_queue');
    let left = MailApp.getRemainingDailyQuota() - DAILY_MARGIN;
    const started = Date.now();
    if (sh && sh.getLastRow() > 1) {
      const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 14).getValues();
      for (let i = 0; i < rows.length && left > 0 && Date.now() - started < 4.5 * 60 * 1000; i++) {
        const r = rows[i];
        if (!(r[8] === 'pending' || (r[8] === 'error' && Number(r[9]) < MAX_ATTEMPTS))) continue;
        try {
          const opts = {name: String(r[7] || '')};
          if (r[13]) opts.htmlBody = String(r[13]);  // formatted version; the plain text stays as fallback
          if (r[6]) opts.attachments = [DriveApp.getFileById(String(r[6])).getBlob()];
          MailApp.sendEmail(String(r[3]), String(r[4]), String(r[5]), opts);
          r[8] = 'sent'; r[10] = Date.now(); r[11] = ''; left--;
        } catch (err) {
          r[8] = 'error'; r[9] = Number(r[9] || 0) + 1; r[11] = String(err).slice(0, 300);
        }
        sh.getRange(i + 2, 9, 1, 4).setValues([[r[8], r[9], r[10], r[11]]]);
        Utilities.sleep(PAUSE_MS);
      }
    }
    try {
      scanBounces(book);
    } catch (err) {
      console.log('bounce scan: ' + err);  // never blocks the sending
    }
    try {
      forgetOld(book);
    } catch (err) {
      console.log('cleanup: ' + err);
    }
    // at the end: the registry must stay the first tab, the verification page reads it
    const st = book.getSheetByName('mail_state') || book.insertSheet('mail_state', book.getNumSheets());
    st.getRange(1, 1, 2, 2).setValues([['last_run', Date.now()], ['remaining', MailApp.getRemainingDailyQuota()]]);
  } finally {
    lock.releaseLock();
  }
}
