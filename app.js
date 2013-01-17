//set some shortcuts
//global._ = require("underscore");
//global.a = require("async");
//global.dateFormat = require("./src/libs/dateFormat");
var bot = new(require('./src/bot'))(); //create bot
bot.loadConfig(); //load the config from file - default is config.json
bot.loadModules(); //preload all active modules - default is modules.json
bot.run(); //and run the bot