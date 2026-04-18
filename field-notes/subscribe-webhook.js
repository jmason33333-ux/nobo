/**
 * Nobo — Field Notes subscribe webhook
 *
 * Deploy this as a Google Apps Script web app. It receives POSTs from the
 * subscribe form in issue-01.html and appends a row to the bound Google Sheet.
 *
 * Expected form fields:
 *   email   — subscriber email (required)
 *   source  — where the subscribe came from (e.g. "field-notes-01")
 *
 * Sheet columns (row 1 headers): Timestamp | Email | Source | User Agent
 */

const SHEET_NAME = 'Subscribers';

function doPost(e) {
  try {
    const email  = (e.parameter.email  || '').trim().toLowerCase();
    const source = (e.parameter.source || 'unknown').trim();
    const ua     = (e.parameter.ua     || '').trim();

    // Basic email validation — enough to block junk, not so strict it breaks valid addresses.
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ ok: false, error: 'invalid_email' });
    }

    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

    // Write headers if the sheet is brand new.
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Timestamp', 'Email', 'Source', 'User Agent']);
      sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
    }

    // Dedupe — if this email already exists, just stamp the existing row with a new "last seen".
    const existing = sheet.getRange(2, 2, Math.max(sheet.getLastRow() - 1, 1), 1).getValues().flat();
    if (existing.indexOf(email) !== -1) {
      return json({ ok: true, status: 'already_subscribed' });
    }

    sheet.appendRow([new Date(), email, source, ua]);
    return json({ ok: true, status: 'subscribed' });

  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doGet() {
  return ContentService
    .createTextOutput('Nobo Field Notes — subscribe endpoint. POST only.')
    .setMimeType(ContentService.MimeType.TEXT);
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
