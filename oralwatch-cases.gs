/**
 * OralWatch case inbox, by Dr Manish S. Tiwari.  Version 2.
 * Receives "Discuss with Dr Manish" cases from the OralWatch app, saves the photos to a
 * private Google Drive folder ("OralWatch cases") and logs each case in a Google Sheet.
 * v2: the app uploads photos first (while the dentist fills the form) and sends the patient
 * details a moment later with the same case ID; both land in the same folder and the same row.
 * Deploy: Deploy > Manage deployments > edit (pencil) > Version: New version > Deploy (keeps the same URL).
 */
const FOLDER = 'OralWatch cases';
const SHEET = 'OralWatch case register';
const HEAD = ['Received', 'Case ID', 'Dentist name', 'Dentist mobile', 'Clinic / city', 'Patient age', 'Sex', 'Site', 'Duration',
  'Habits', 'Findings', 'Note', 'Photos', 'Patches/OSMF per month', 'Suspected cancers last year', 'Photo folder', 'App visitor ID'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const d = JSON.parse(e.postData.contents);
    const id = /^[A-Za-z0-9-]{6,40}$/.test(d.id || '') ? d.id
      : Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyyMMdd-HHmm') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    lock.waitLock(20000);
    const root = folder_();
    const it = root.getFoldersByName('Case ' + id);
    const caseFolder = it.hasNext() ? it.next() : root.createFolder('Case ' + id);
    if (d.photos && d.photos.length) {
      if (d.replace) { const old = caseFolder.getFiles(); while (old.hasNext()) old.next().setTrashed(true); }
      d.photos.slice(0, 3).forEach((b64, i) => {
        caseFolder.createFile(Utilities.newBlob(Utilities.base64Decode(b64), 'image/jpeg', 'case-' + id + '-' + (i + 1) + '.jpg'));
      });
    }
    let n = 0; const fs = caseFolder.searchFiles('trashed = false'); while (fs.hasNext()) { fs.next(); n++; }
    const row = [new Date(), id, d.name || '', d.mobile || '', d.city || '', d.age || '', d.sex || '', d.site || '', d.dur || '',
      d.hab || '', d.fnd || '', d.note || '', n, d.opmd || '', d.ca || '', caseFolder.getUrl(), d.vid || ''];
    const sh = sheet_();
    const hit = sh.getRange('B:B').createTextFinder(id).matchEntireCell(true).findNext();
    if (hit) {
      const r = hit.getRow(), old = sh.getRange(r, 1, 1, row.length).getValues()[0];
      row.forEach((v, i) => { if (i === 0 || v === '' || v === null) row[i] = old[i]; });
      sh.getRange(r, 1, 1, row.length).setValues([row]);
    } else sh.appendRow(row);
    return out_({ ok: true, v: 2, id: id, url: caseFolder.getUrl() });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}
function doGet() { return out_({ ok: true, v: 2, service: 'OralWatch case inbox' }); }
function setup() { folder_(); sheet_(); }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function folder_() { const it = DriveApp.getFoldersByName(FOLDER); return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER); }
function sheet_() {
  const it = DriveApp.getFilesByName(SHEET);
  const ss = it.hasNext() ? SpreadsheetApp.open(it.next()) : SpreadsheetApp.create(SHEET);
  const sh = ss.getSheets()[0];
  if (sh.getLastRow() === 0) sh.appendRow(HEAD);
  return sh;
}
