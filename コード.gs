function doPost(e) {
  if (e.parameter.text != undefined) {
    var sl = new get_slack(e);
    try {
      sl.main();
    } catch (eee) {
      this.sk.postSlackMessage(eee);
    }
    
  } else {
    var ln = new line(e);
    ln.main();
  }
}

function test() {
  var sk = new slack();
  sk.postSlackMessage('hoge');
  //var sh = new sheet();
  //Logger.log(sh.find_row(1, 3));
  //sh.delete_row(sh.find_row(1, 3));
}

/**
* Sheet Class.
*/
var sheet = function () {
  this.spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  this.sheet = this.spreadsheet.getSheets()[0];
  this.sk = new slack();
  // this.sk.postSlackMessage(this.last_row);
  
  /**
  * Set value.
  */
  this.setvalue = function (row, column, value) {
    this.sheet.getRange(row, column).setValue(value);
  };
  
  /**
  * Get value.
  */
  this.getvalue = function (row, column) {
    var value = this.sheet.getRange(row, column).getValue();
    return value;
  };
  
  /**
  * Delete row.
  */
  this.delete_row = function (row) {
    // for return 0
    try {
      this.sheet.deleteRow(row);
    } catch (e) {
      Logger.log(e);
    }
  };
  
  /**
  * Get last row.
  */
  this.get_last_row = function () {
    return this.sheet.getLastRow();
  };
  
  /**
  * Find row of same text
  */
  this.find_row = function (column, value) {
    for (var row = 1; row <= this.get_last_row(); row++) {
      if (this.getvalue(row, column) == value) return row;
    }
    return 0;
  };
  
};

/**
* Webhook slack class.
*/
var get_slack = function (e) {
  this.slack = e.parameter;
  this.sk = new slack();
  try {
    this.ln = new line();
  }
  catch(eee) {
    this.sk.postSlackMessage(eee);
  }
  this.sh = new sheet();
  
  /**
  * Main function.
  */  
  this.main = function () {
    var text = this.get_text(this.slack);
    var userId;
    if (text[1] != undefined) { // @unko: ~~~~~~~~~~~~
      userId = this.sh.getvalue(this.sh.find_row(3, text[1]),2);
      PropertiesService.getScriptProperties().setProperty('userId', userId);
      text = text[2];
    }
    else {
      userId = PropertiesService.getScriptProperties().getProperty('userId');
      text = text[0];
    }
    this.sk.postSlackMessage(userId);
    this.ln.send_line(userId, text);
    this.sk.postSlackMessage(userId);
  };
  
  /**
  * Get text.
  * return array.
  */
  this.get_text = function (slack) {
    var text;
    if (slack.trigger_word != undefined) text = slack.text.replace(slack.trigger_word, '');
    else text = slack.text;
    text = text.split(/@([\s\S]*?):/);
    // if (text[0] == '') text = text[2];
    // else text = text[0];

    return text;
  };
  
};

/**
* Line Class.
*/
var line = function (e) {
  this.token = PropertiesService.getScriptProperties().getProperty('CHANNEL_ACCESS_TOKEN');
  if (e != undefined) this.line = JSON.parse(e.postData.contents).events[0];
  this.headers = {
    'Authorization': 'Bearer ' + this.token
  };
  this.options = {
    'headers': this.headers
  };
  this.sk = new slack();
  this.sh = new sheet();
  this.last_row = this.sh.get_last_row();
  
  /**
  * Main function.
  */
  this.main = function () {
    var profile;
    switch (this.line.type) {
      case 'follow':
        profile = this.get_line_profile(this.line);
        this.sk.postSlackMessage('```follow```', profile);
        // set sheet
        this.sh.setvalue(this.last_row + 1, 1, this.last_row);
        this.sh.setvalue(this.last_row + 1, 2, this.line.source.userId);
        this.sh.setvalue(this.last_row + 1, 3, profile.displayName);
        break;
      case 'unfollow':
        profile = this.get_line_profile(this.line);
        this.sk.postSlackMessage('```unfollow```', profile);
        // Deletes the row of the user ID.
        this.sh.delete_row(this.sh.find_row(2, this.line.source.userId));
        break;
      case 'join':
        this.sk.postSlackMessage('Join group: ' + this.line.source.groupId);
        break;
      case 'leave':
        this.sk.postSlackMessage('Leave group: ' + this.line.source.groupId);
        break;
      case 'message':
        profile = this.get_line_profile(this.line);
        switch (this.line.source.type) {
          case 'user':
            this.sk.postSlackMessage(this.get_line_message(this.line), profile);
            break;
          case 'group':
            break;
          case 'room':
            break;
        }
        break;
      default:
        this.sk.postSlackMessage(this.line);
        break;
    }
  };
  
  /**
  * Get line Message.
  */
  this.get_line_message = function (line) {
    switch (line.message.type) {
      case 'text':
        return line.message.text;
      case 'image':
        return this.get_url_of_drive_files(line.message.id);
      case 'video':
        return this.get_url_of_drive_files(line.message.id);
      case 'audio':
        return this.get_url_of_drive_files(line.message.id);
      case 'file':
        return this.get_url_of_drive_files(line.message.id);
      case 'location':
        return 'location';
      case 'sticker':
        return 'https://stickershop.line-scdn.net/stickershop/v1/sticker/' + line.message.stickerId + '/android/sticker.png';
      default:
        return 0;
    }
  };
  
  /**
  * Get url of Drive files.
  */
  this.get_url_of_drive_files = function (message_id) {
    var url = 'https://api.line.me/v2/bot/message/' + message_id + '/content';
    var blob = UrlFetchApp.fetch(url, this.options);
    var file = DriveApp.createFile(blob);
    return file.getUrl();
  };
  
  
  /**
  * Get line profile.
  */
  this.get_line_profile = function (line) {
    var url, response, profile;
    switch (line.source.type) {
      case 'user':
        url = 'https://api.line.me/v2/bot/profile/' + line.source.userId;
        break;
      case 'group':
        url = 'https://api.line.me/v2/bot/group/' + line.source.groupId + '/member/' + line.source.userId;
        break;
      case 'room':
        url = 'https://api.line.me/v2/bot/room/' + line.source.groupId + '/member/' + line.source.userId;
        break;
    }
    try {
      response = UrlFetchApp.fetch(url, this.options);
      profile = JSON.parse(response.getContentText());
    } catch (e) {
      this.sk.postSlackMessage(e);
    }
    return profile;
  };
  
  /**
  * Send message to LINE.
  */
  this.send_line = function (id, text) {
    var url = "https://api.line.me/v2/bot/message/push";
    var headers = {
      'Content-Type': 'application/json; charset=UTF-8',
      'Authorization': 'Bearer ' + this.token,
    };
    var postData = {
      "to": id,
      "messages": [{
        'type': 'text',
        'text': text
      }]
    };
    var options = {
      "method": "post",
      "headers": headers,
      "payload": JSON.stringify(postData)
    };
    UrlFetchApp.fetch(url, options);
  };
  
};

/**
* Post Slack Class.
*/
var slack = function () {
  var token = PropertiesService.getScriptProperties().getProperty('SLACK_LEGACY_TOKEN');
  this.slackApp = SlackApp.create(token);
  this.channels = '#random';
  
  /**
  * Post Slack message.
  */
  this.postSlackMessage = function (mes, profile) {
    var options;
    if (profile != undefined) {
      options = {
        username: profile.displayName,
        icon_url: profile.pictureUrl
      };
    }
    this.slackApp.postMessage(this.channels, mes, options);
  };
  
  /**
  * Post Slack Files.
  */
  this.postSlackFiles = function (image) {
    var options = {
      channels: this.channels
    };
    this.slackApp.filesUpload(image, options);
  };
};
