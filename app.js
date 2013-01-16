
//set some shortcuts
global._ = require("underscore");
global.a = require("async");
global.dateFormat = require("./src/libs/dateFormat");

var bot = new(require("./src/bot"))();

bot.loadConfig();
bot.loadModules();

bot.run();