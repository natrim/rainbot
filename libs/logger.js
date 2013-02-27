function Logger() {
  this.enabled = true;
  this.debugging = false;
}

Logger.prototype.onBeforeLog = function() {};
Logger.prototype.onAfterLog = function() {};

Logger.prototype.log = function(msg, level) {
  if(!this.enabled) {
    return;
  }

  var dontlog = this.onBeforeLog(arguments) || false;
  if(!dontlog) {
    switch(level) {
    case 'error':
      console.error(msg);
      break;
    case 'warn':
      console.warn(msg);
      break;
    case 'info':
      console.info(msg);
      break;
    case 'log':
      console.log(msg);
      break;
    case 'debug':
      if(this.debugging) console.log(msg);
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