/* jslint node: true */
/* global BOT_DIR, LIBS_DIR, MODULES_DIR */
'use strict';

function Logger() {
  this.enabled = true;
  this.debugging = false;
}

Logger.prototype.onBeforeLog = function() {};
Logger.prototype.onAfterLog = function() {};

var colors = {
  //styles
  'bold': ['\x1B[1m', '\x1B[22m'],
  'italic': ['\x1B[3m', '\x1B[23m'],
  'underline': ['\x1B[4m', '\x1B[24m'],
  'inverse': ['\x1B[7m', '\x1B[27m'],
  'strikethrough': ['\x1B[9m', '\x1B[29m'],
  //grayscale
  'white': ['\x1B[37m', '\x1B[39m'],
  'grey': ['\x1B[90m', '\x1B[39m'],
  'black': ['\x1B[30m', '\x1B[39m'],
  //colors
  'blue': ['\x1B[34m', '\x1B[39m'],
  'cyan': ['\x1B[36m', '\x1B[39m'],
  'green': ['\x1B[32m', '\x1B[39m'],
  'magenta': ['\x1B[35m', '\x1B[39m'],
  'red': ['\x1B[31m', '\x1B[39m'],
  'yellow': ['\x1B[33m', '\x1B[39m']
};

Logger.prototype.log = function(msg, level) {
  if (!this.enabled) {
    return;
  }

  var dontlog = this.onBeforeLog(arguments) || false;
  if (!dontlog) {
    switch (level) {
      case 'error':
        console.error(colors.red[0] + '[ERROR] ' + colors.red[1] + msg);
        break;
      case 'warn':
        console.warn(colors.yellow[0] + '[WARNING] ' + colors.yellow[1] + msg);
        break;
      case 'info':
        console.info(colors.cyan[0] + '[INFO] ' + colors.cyan[1] + msg);
        break;
      case 'debug':
        if (this.debugging) console.log(colors.magenta[0] + '[DEBUG] ' + colors.magenta[1] + msg);
        break;
      default:
        console.log(msg);
    }
  }
  this.onAfterLog(dontlog || false, arguments);
};

Logger.prototype.error = function(msg) {
  this.log(msg, 'error');
};

Logger.prototype.warn = function(msg) {
  this.log(msg, 'warn');
};

Logger.prototype.info = function(msg) {
  this.log(msg, 'info');
};

Logger.prototype.debug = function(msg) {
  this.log(msg, 'debug');
};

module.exports = new Logger();
module.exports.Logger = Logger;