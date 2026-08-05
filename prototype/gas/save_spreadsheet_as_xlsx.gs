/**
 * Googleスプレッドシートをxlsx形式に変換し、指定したGoogle Driveフォルダへ保存します。
 *
 * 使い方：
 * 1. CONFIG.FOLDER_ID に保存先フォルダのIDを設定する
 * 2. saveSpreadsheetAsXlsx() を実行する
 * 3. 初回のみ、スプレッドシートとGoogle Driveへの権限を許可する
 */
const CONFIG = {
  // 保存先フォルダのURLが https://drive.google.com/drive/folders/XXXX の場合、XXXXの部分。
  FOLDER_ID: 'ここに保存先フォルダIDを入力',

  // trueの場合、ファイル名の末尾に実行日時を付けます。
  ADD_TIMESTAMP: true,
};

/**
 * アクティブなスプレッドシートをxlsxとして指定フォルダに保存します。
 * @return {GoogleAppsScript.Base.Blob} 保存したファイルのBlob
 */
function saveSpreadsheetAsXlsx() {
  if (!CONFIG.FOLDER_ID || CONFIG.FOLDER_ID.includes('ここに')) {
    throw new Error('CONFIG.FOLDER_ID に保存先フォルダIDを設定してください。');
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('アクティブなスプレッドシートを取得できませんでした。');
  }

  const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
  const spreadsheetId = spreadsheet.getId();
  const fileName = buildXlsxFileName_(spreadsheet.getName());
  const exportUrl = 'https://docs.google.com/spreadsheets/d/'
    + encodeURIComponent(spreadsheetId)
    + '/export?format=xlsx';

  const response = UrlFetchApp.fetch(exportUrl, {
    headers: {
      Authorization: 'Bearer ' + ScriptApp.getOAuthToken(),
    },
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() !== 200) {
    throw new Error(
      'xlsxの書き出しに失敗しました。HTTPステータス: '
      + response.getResponseCode()
      + '\n'
      + response.getContentText().slice(0, 500)
    );
  }

  const blob = response.getBlob()
    .setName(fileName)
    .setContentType(MimeType.MICROSOFT_EXCEL);
  const savedFile = folder.createFile(blob);

  Logger.log('xlsxを保存しました: ' + savedFile.getUrl());
  return savedFile.getBlob();
}

/**
 * 保存ファイル名を作成します。
 * @param {string} spreadsheetName
 * @return {string}
 */
function buildXlsxFileName_(spreadsheetName) {
  const safeName = spreadsheetName.replace(/[\\/:*?"<>|]/g, '_').trim() || 'spreadsheet';
  if (!CONFIG.ADD_TIMESTAMP) {
    return safeName + '.xlsx';
  }

  const timestamp = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone() || 'Asia/Tokyo',
    'yyyyMMdd_HHmmss'
  );
  return safeName + '_' + timestamp + '.xlsx';
}

/**
 * スプレッドシートを開いたときに、手動実行用メニューを追加します。
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('xlsx保存')
    .addItem('指定フォルダへ保存', 'saveSpreadsheetAsXlsx')
    .addToUi();
}
