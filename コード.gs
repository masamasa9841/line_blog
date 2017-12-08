function doPost(e) {
  if (e.parameter.text != undefined) {
    var sl = new send_line(e);
    try {
      sl.main();
    } catch (e) {
      this.sk.postSlackMessage(e);
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


var sheet = function () {
  this.spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  this.sheet = this.spreadsheet.getSheets()[0];
  this.sk = new slack();
  // this.sk.postSlackMessage(this.last_row);

  this.setvalue = function (row, column, value) {
    this.sheet.getRange(row, column).setValue(value);
  }

  this.getvalue = function (row, column) {
    this.value = this.sheet.getRange(row, column).getValue();
    return this.value;
  }

  this.delete_row = function (row) {
    // for return 0
    try {
      this.sheet.deleteRow(row);
    } catch (e) {
      Logger.log(e);
    }
  }

  this.get_last_row = function () {
    return this.sheet.getLastRow();
  }

  /**
   * Find place of same text
   */
  this.find_row = function (column, value) {
    for (var row = 1; row <= this.get_last_row(); row++) {
      if (this.getvalue(row, column) == value) return row;
    }
    return 0;
  }
};

var send_line = function (e) {
  this.slack = e.parameter;
  this.sk = new slack();

  this.main = function () {
    this.text = this.get_text(this.slack);
    this.sk.postSlackMessage(this.text);
  }

  /**
   * Get text.
   */
  this.get_text = function (slack) {
    if (slack.trigger_word != undefined) this.text = slack.text.replace(slack.trigger_word, '');
    else this.text = slack.text
    return this.text
  }

  /**
   * Send message to LINE.
   */
  this.send_line = function (text) {
    this.token = PropertiesService.getScriptProperties().getProperty('CHANNEL_ACCESS_TOKEN');
    this.url = "https://api.line.me/v2/bot/message/push";
    this.headers = {
      'Content-Type': 'application/json; charset=UTF-8',
      'Authorization': 'Bearer ' + token,
    };
    this.postData = {
      "to": user_id,
      "messages": [{
        'type': 'text',
        'text': text
      }]
    };
    this.options = {
      "method": "post",
      "headers": headers,
      "payload": JSON.stringify(this.postData)
    };
    UrlFetchApp.fetch(this.url, this.options);
  }
};

var line = function (e) {
  this.token = PropertiesService.getScriptProperties().getProperty('CHANNEL_ACCESS_TOKEN');
  this.line = JSON.parse(e.postData.contents).events[0];
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
    switch (this.line.type) {
      case 'follow':
        this.profile = this.get_line_profile(this.line);
        this.sk.postSlackMessage('```follow```', this.profile);
        // set sheet
        this.sh.setvalue(this.last_row + 1, 1, this.last_row);
        this.sh.setvalue(this.last_row + 1, 2, this.line.source.userId);
        this.sh.setvalue(this.last_row + 1, 3, this.profile.displayName);
        break;
      case 'unfollow':
        this.profile = this.get_line_profile(this.line);
        this.sk.postSlackMessage('```unfollow```', this.profile);
        // sheet delete
        this.sh.delete_row(this.sh.find_row(2, this.line.source.userId));
        break;
      case 'join':
        this.sk.postSlackMessage('Join group: ' + this.line.source.groupId);
        break;
      case 'leave':
        this.sk.postSlackMessage('Leave group: ' + this.line.source.groupId);
        break;
      case 'message':
        this.profile = this.get_line_profile(this.line);
        switch (this.line.source.type) {
          case 'user':
            this.sk.postSlackMessage(this.get_line_message(this.line), this.profile);
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
  }

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
  }

  /**
   * Get url of Drive files.
   */
  this.get_url_of_drive_files = function (message_id) {
    this.url = 'https://api.line.me/v2/bot/message/' + message_id + '/content';
    this.blob = UrlFetchApp.fetch(this.url, this.options);
    this.file = DriveApp.createFile(this.blob);
    return this.file.getUrl();
  }


  /**
   * Get line profile.
   */
  this.get_line_profile = function (line) {
    switch (line.source.type) {
      case 'user':
        this.url = 'https://api.line.me/v2/bot/profile/' + line.source.userId;
        break;
      case 'group':
        this.url = 'https://api.line.me/v2/bot/group/' + line.source.groupId + '/member/' + line.source.userId;
        break;
      case 'room':
        this.url = 'https://api.line.me/v2/bot/room/' + line.source.groupId + '/member/' + line.source.userId;
        break;
    }
    try {
      this.response = UrlFetchApp.fetch(this.url, this.options);
      this.profile = JSON.parse(this.response.getContentText());
    } catch (e) {
      this.sk.postSlackMessage(e);
    }
    return this.profile;
  }

};

/**
 * Slack Class.
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
