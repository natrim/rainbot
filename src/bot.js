"use strict";

//set name
global.bot_name = "IRC-PONY";
//set main entry point path
global.bot_path = require.main.filename.replace(/\\/g, "/").replace(/\/[^\/]*$/, "");

function Bot() {
	var bot = this;
	var dispatcher = new(require("events").EventEmitter)();

	dispatcher.setMaxListeners(0); //remove listener limit
	dispatcher.on("newListener", function(event, listener) {
		var i, name;
		if(((i = event.indexOf("/")) + 1) && (name = event.substr(0, i))) {
			//todo check if module active
		}
	});

	this.loadConfig = function loadConfig(config, callback) {
		var error = false;
		if(typeof config === "string") {
			try {
				bot.config = require(bot_path + "/" + config);
			} catch(Error) {
				error = true;
				bot.config = {};
			}
		} else if(config instanceof Object) {
			bot.config = config;
		} else {
			try {
				bot.config = require(bot_path + "/config.json");
			} catch(Error) {
				error = true;
				bot.config = {};
			}
		}

		if(callback) callback(error, bot.config);
	};

	this.loadModules = function loadModules() {
		dispatcher.emit('load-modules');
	};

	this.run = function run() {
		dispatcher.emit('init');
	};
}

module.exports = Bot;