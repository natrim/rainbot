"use strict";

//set name
global.bot_name = "IRC-PONY";
//set main entry point path
global.bot_path = require.main.filename.replace(/\\/g, '/').replace(/\/[^\/]*$/, '');

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

	this.loadConfig = function loadConfig() {
		dispatcher.emit('load-config');
	};

	this.loadModules = function loadModules() {
		dispatcher.emit('load-modules');
	};

	this.run = function run() {
		dispatcher.emit('init');
	};
}

module.exports = Bot;