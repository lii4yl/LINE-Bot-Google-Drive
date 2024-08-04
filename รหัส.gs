// ฟังก์ชันหลักที่รับ Webhook จาก LINE
function doPost(e) {
  var json = JSON.parse(e.postData.contents);
  var events = json.events;

  for (var i = 0; i < events.length; i++) {
    var event = events[i];
    if (event.type == 'message') {
      handleMediaMessage(event);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
}

// ฟังก์ชันสำหรับจัดการสื่อ (ไม่ใช่ข้อความ text)
function handleMediaMessage(event) {
  var messageType = event.message.type;
  var replyToken = event.replyToken;

  if (messageType == 'image') {
    saveMediaMessage(event.message.id, 'image', replyToken);
  } else if (messageType == 'file') {
    saveMediaMessage(event.message.id, 'file', replyToken);
  } else {
    replyToLine(replyToken, 'ไม่สามารถบันทึกข้อความประเภทนี้ได้');
  }
}

// ฟังก์ชันสำหรับบันทึกสื่อ (รูปภาพหรือไฟล์)
function saveMediaMessage(messageId, type, replyToken) {
  var credentials = getCredentials();
  var url = 'https://api-data.line.me/v2/bot/message/' + messageId + '/content';
  var token = credentials.channelAccessToken;
  var options = {
    'headers': {
      'Authorization': 'Bearer ' + token
    }
  };

  var response = UrlFetchApp.fetch(url, options);
  var blob = response.getBlob();

  var fileName = 'line_' + type + '_' + new Date().getTime() + '.' + blob.getContentType().split('/')[1];
  var folderId = (type == 'image') ? credentials.imageFolderId : credentials.fileFolderId;
  var folder = DriveApp.getFolderById(folderId);
  var file = folder.createFile(blob.setName(fileName));

  var fileUrl = file.getUrl();
  replyToLine(replyToken, 'ไฟล์ถูกบันทึกลงใน Google Drive ที่: ' + fileUrl);
}

// ฟังก์ชันสำหรับส่งข้อความตอบกลับไปที่ LINE
function replyToLine(replyToken, text) {
  var credentials = getCredentials();
  var url = 'https://api.line.me/v2/bot/message/reply';
  var token = credentials.channelAccessToken;

  var replyMessage = {
    'replyToken': replyToken,
    'messages': [{
      'type': 'text',
      'text': text
    }]
  };

  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'headers': {
      'Authorization': 'Bearer ' + token
    },
    'payload': JSON.stringify(replyMessage)
  };

  UrlFetchApp.fetch(url, options);
}

// ฟังก์ชันสำหรับดึงค่าจาก Google Sheets
function getCredentials() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1'); // ดึงค่า Spreadsheet ที่ใช้งานอยู่
  var channelAccessToken = sheet.getRange('C2').getValue();
  var imageFolderUrl = sheet.getRange('C3').getValue();
  var fileFolderUrl = sheet.getRange('C4').getValue();

  var imageFolderId = extractFolderIdFromUrl(imageFolderUrl);
  var fileFolderId = extractFolderIdFromUrl(fileFolderUrl);

  return {
    channelAccessToken: channelAccessToken,
    imageFolderId: imageFolderId,
    fileFolderId: fileFolderId
  };
}

// ฟังก์ชันสำหรับแปลง URL เป็น Folder ID
function extractFolderIdFromUrl(url) {
  var folderId = url.match(/[-\w]{25,}/);
  return folderId ? folderId[0] : null;
}
