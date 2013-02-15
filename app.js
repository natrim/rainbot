//set some shortcuts
//global._ = require("underscore");
//global.a = require("async");
//global.dateFormat = require("./libs/dateFormat");
var bot = new(require('./libs/bot').Bot)(); //create bot
// OR var bot = require('./libs/bot').create();
bot.loadConfig(); //load the config from file - default is config.json
bot.loadModules(); //preload all active modules - default is from config or modules.json
bot.run(); //and run the bot