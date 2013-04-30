/**
 * Controls Core module
 * other modules cas use it so simplify things
 */

/* jslint node: true */
/* global BOT_DIR, LIBS_DIR, MODULES_DIR */
'use strict';

var logger = require(LIBS_DIR + '/logger');

var Command = require('./controls/command').Command;
var Action = require('./controls/action').Action;

//trim some strings
if (!String.prototype.trim) {
	String.prototype.trim = function() {
		return this.replace(/^\s+|\s+$/g, '');
	};
}

function Controls(irc, actions, commands, config) {
	this._irc = irc;
	this.actions = actions;
	this.commands = commands;
	this.config = config;

	Object.defineProperty(this, 'commandDelimiter', {
		enumerable: true,
		configurable: false,
		get: function() {
			return config.commandDelimiter;
		}
	});
}

Controls.prototype.addCommand = function(name, action, access) {
	name = name.replace(/[^a-zA-Z0-9_\-]+/g, '');
	if (typeof this.commands[name] !== 'undefined') {
		throw new Error('Command \'' + name + '\' already exists!');
	}
	this.commands[name] = new Command(name, action, access);
	return this;
};

Controls.prototype.addAction = function(name, action, regexp, access) {
	name = name.replace(/[^a-zA-Z0-9_\-]+/g, '');
	if (typeof this.actions[name] !== 'undefined') {
		throw new Error('Action \'' + name + '\' already exists!');
	}
	this.actions[name] = new Action(name, action, regexp, access);
	return this;
};

Controls.prototype.removeCommand = function(name) {
	name = name.replace(/[^a-zA-Z0-9_\-]+/g, '');
	if (typeof this.commands[name] !== 'undefined') {
		delete this.commands[name];
	} else {
		throw new Error('Command \'' + name + '\' does not exists!');
	}
	return this;
};

Controls.prototype.removeAction = function(name) {
	name = name.replace(/[^a-zA-Z0-9_\-]+/g, '');
	if (typeof this.actions[name] !== 'undefined') {
		delete this.actions[name];
	} else {
		throw new Error('Action \'' + name + '\' does not exists!');
	}
	return this;
};

Controls.prototype.removeActions = function(list) {
	if (!(list instanceof Array)) {
		throw new Error('You need to pass Array as first argument!');
	}
	list.forEach(function(name) {
		this.removeAction(name);
	}, this);
	return this;
};

Controls.prototype.removeCommands = function(list) {
	if (!(list instanceof Array)) {
		throw new Error('You need to pass Array as first argument!');
	}
	list.forEach(function(name) {
		this.removeCommand(name);
	}, this);
	return this;
};

Controls.prototype.parse = function(source, text) {
	if (typeof text !== 'string' || text.length <= 0) return;

	if (!source.channel) { //itz direct message
		this.processAction(source, text.trim());
	} else if (source.channel && text.substr(0, this.config.commandDelimiter.length) === this.config.commandDelimiter) { //itz command in channel
		//remove the delimiter
		text = text.substr(this.config.commandDelimiter.length);

		this.processCommand(source, text.trim());
	} else if ((new RegExp('^' + this._irc.currentNick + '[ ,;:]')).test(text.substr(0, this._irc.currentNick.length + 1))) { //itz higlight in channel
		//remove the trigger
		text = text.substr(this._irc.currentNick.length + 1);

		this.processAction(source, text.trim());
	}
};

Controls.prototype.processCommand = function(source, text) {
	var args = text.match(/[^\s\"\']+|\"([^\"]*)\"|\'([^\']*)\'/g).map(function(v) {
		return v.replace(/\"|\'/g, '');
	});
	var command = args.shift();
	//execute the command
	Object.keys(this.commands).some(function(name) {
		if (this.commands[name] && command == this.commands[name].name) { //use == to not check type
			if (this.checkAccess(source, this.commands[name])) { //run the command only if the user has access
				logger.debug('Processing Command \'' + name + '\'');
				this.commands[name].action(source, args, text, command);
			} else {
				logger.debug('Command \'' + name + '\' access for user \'' + source + '\' denied!');
				source.notice('Command Access denied! Do i know you?');
			}
			return true; //stop searching
		}
		return false; //try next
	}, this);
};

Controls.prototype.processAction = function(source, text) {
	//proces all actions that triggers rule
	Object.keys(this.actions).forEach(function(name) {
		if (this.actions[name]) {
			var args = text.match(this.actions[name].rule);
			if (args !== null) {
				if (this.checkAccess(source, this.actions[name])) { //run the action only if the user has access
					logger.debug('Processing Action \'' + name + '\'');
					this.actions[name].action(source, args, text);
				} else {
					logger.debug('Action \'' + name + '\' access for user \'' + source + '\' denied!');
					source.notice('Action Access denied! Derpy in action!');
				}
			}
		}
	}, this);
};

Controls.prototype.checkAccess = function(source, CorA) {
	//allow access if no rule
	if (!CorA.access) {
		return true;
	}

	//shell can run everything
	if (source.toString() === 'ItzAInternallPonyShell') {
		return true;
	}

	//array means list of allowed groups
	if (CorA.access instanceof Array) {
		return CorA.access.some(function(name) {
			if (this.config.groups[name]) {
				return this.config.groups[name].some(function(user) {
					return source.toString().match(user) !== null;
				});
			}
			return false;
		}, this);
	}

	//else try matching it directly
	return source.toString().match(CorA.access) !== null;
};

module.exports.init = function(reload) {
	if (!reload) {
		this.actions = {};
		this.commands = {};
	}
	if (typeof this.config.groups !== 'object') {
		this.config.groups = {};
	}
	if (typeof this.config.commandDelimiter !== 'string') {
		this.config.commandDelimiter = '.';
	}

	this.controls = new Controls(this.require('irc'), this.actions, this.commands, this.config);

	var module = this;

	if (!reload) {
		Object.defineProperty(this, 'commandDelimiter', {
			enumerable: true,
			configurable: false,
			get: function() {
				return module.config.commandDelimiter;
			}
		});
	}

	//export some functions from Controls
	//require(LIBS_DIR + '/helpers').export(this, this.controls, ['addCommand', 'addAction', 'removeCommand', 'removeAction', 'removeCommands', 'removeActions']);
	require(LIBS_DIR + '/helpers').export(this, this.controls, ['removeCommand', 'removeAction', 'removeCommands', 'removeActions']);

	/**
	 * bind the controls to module core
	 */

	if (!reload) {
		this.moduleActions = {};
		this.moduleCommands = {};
	}

	var proto = require(LIBS_DIR + '/module').Module.prototype;
	proto.addCommand = function(name) {
		module.controls.addCommand.apply(module.controls, arguments);
		if (typeof module.moduleCommands[this.name] === 'undefined') module.moduleCommands[this.name] = {};
		module.moduleCommands[this.name][name] = name;
		return this;
	};
	proto.addAction = function(name) {
		module.controls.addAction.apply(module.controls, arguments);
		if (typeof module.moduleActions[this.name] === 'undefined') module.moduleActions[this.name] = {};
		module.moduleActions[this.name][name] = name;
		return this;
	};
	proto.removeCommand = function() {
		module.controls.removeCommand.apply(module.controls, arguments);
		return this;
	};
	proto.removeAction = function() {
		module.controls.removeAction.apply(module.controls, arguments);
		return this;
	};

	this.addCommand = this.addAction = function() {
		throw new Error('Deprecated! Dont use \'controls\' module directly!');
	};

	//clean up the module commands/actions on unload

	function clean(name) {
		if (typeof module.moduleActions[name] !== 'undefined') {
			Object.keys(module.moduleActions[name]).forEach(function(action) {
				if (typeof module.actions[action] !== 'undefined') {
					module.controls.removeAction(action);
				}
			});
			delete module.moduleActions[name];
		}
		if (typeof module.moduleCommands[name] !== 'undefined') {
			Object.keys(module.moduleCommands[name]).forEach(function(command) {
				if (typeof module.commands[command] !== 'undefined') {
					module.controls.removeCommand(command);
				}
			});
			delete module.moduleCommands[name];
		}
	}

	this.dispatcher.on('unload', clean).on('reload-unload', clean);

	//bind
	this.dispatcher.on('irc/PRIVMSG', this.controls.parse.bind(this.controls)).on('irc/NOTICE', this.controls.parse.bind(this.controls));
};

module.exports.halt = function() {
	var proto = require(LIBS_DIR + '/module').Module.prototype;
	delete proto.addCommand;
	delete proto.addAction;
	delete proto.removeCommand;
	delete proto.removeAction;
};