/**
 * Controls Core module
 * other modules cas use it so simplify things
 */

'use strict';

var logger = require('./../libs/logger');

var Command = require('./controls/command').Command;
var Action = require('./controls/action').Action;

//trim some strings
if (!String.prototype.trim) {
	String.prototype.trim = function () {
		return this.replace(/^\s+|\s+$/g, '');
	};
}

function Controls(irc, actions, commands, dispatcher) {
	this._irc = irc;
	this.actions = actions;
	this.commands = commands;
	this.dispatcher = dispatcher;
}

Controls.prototype.addCommand = function (name, action, access) {
	name = name.replace(/[^a-zA-Z0-9_\-]+/g, '');
	if (typeof this.commands[name] !== 'undefined') {
		throw new Error('Command \'' + name + '\' already exists!');
	}
	this.commands[name] = new Command(name, action, access);
	this.dispatcher.emit('controls/addCommand', name);
	return this;
};

Controls.prototype.addAction = function (name, action, regexp, access) {
	name = name.replace(/[^a-zA-Z0-9_\-]+/g, '');
	if (typeof this.actions[name] !== 'undefined') {
		throw new Error('Action \'' + name + '\' already exists!');
	}
	this.actions[name] = new Action(name, action, regexp, access);
	this.dispatcher.emit('controls/addAction', name, regexp);
	return this;
};

Controls.prototype.removeCommand = function (name) {
	name = name.replace(/[^a-zA-Z0-9_\-]+/g, '');
	if (typeof this.commands[name] !== 'undefined') {
		delete this.commands[name];
		this.dispatcher.emit('controls/removeCommand', name);
	} else {
		throw new Error('Command \'' + name + '\' does not exists!');
	}
	return this;
};

Controls.prototype.removeAction = function (name) {
	name = name.replace(/[^a-zA-Z0-9_\-]+/g, '');
	if (typeof this.actions[name] !== 'undefined') {
		delete this.actions[name];
		this.dispatcher.emit('controls/removeAction', name);
	} else {
		throw new Error('Action \'' + name + '\' does not exists!');
	}
	return this;
};

Controls.prototype.removeActions = function (list) {
	if (!(list instanceof Array)) {
		throw new Error('You need to pass Array as first argument!');
	}
	list.forEach(function (name) {
		this.removeAction(name);
	}, this);
	return this;
};

Controls.prototype.removeCommands = function (list) {
	if (!(list instanceof Array)) {
		throw new Error('You need to pass Array as first argument!');
	}
	list.forEach(function (name) {
		this.removeCommand(name);
	}, this);
	return this;
};

Controls.prototype.parse = function (source, text) {
	if (typeof text !== 'string' || text.length <= 0) {
		return;
	}

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

Controls.prototype.processCommand = function (source, text) {
	var args = text.match(/[^\s\"\']+|\"([^\"]*)\"|\'([^\']*)\'/g).map(function (v) {
		return v.replace(/\"|\'/g, '');
	});
	var command = args.shift();
	//execute the command
	return Object.keys(this.commands).some(function (name) {
		if (this.commands[name] && command === this.commands[name].name) {
			if (this.checkAccess(source, this.commands[name])) { //run the command only if the user has access
				var execute = this.commands[name].action,
					dispatcher = this.dispatcher;
				setImmediate(function () {
					logger.debug('Processing Command \'' + name + '\'');
					execute(source, args, text, command);
					dispatcher.emit('controls/command', name, source, args, text, command);
				});
			} else {
				logger.debug('Command \'' + name + '\' access for user \'' + source + '\' denied!');
				source.notice('Command Access denied! Do i know you?');
			}
			return true; //stop searching
		}
		return false; //try next
	}, this);
};

Controls.prototype.processAction = function (source, text) {
	//proces all actions that triggers rule
	var found = false;
	Object.keys(this.actions).forEach(function (name) {
		if (this.actions[name]) {
			var args = text.match(this.actions[name].rule);
			if (args !== null) {
				if (this.checkAccess(source, this.actions[name])) { //run the action only if the user has access
					var execute = this.actions[name].action,
						dispatcher = this.dispatcher;
					setImmediate(function () {
						logger.debug('Processing Action \'' + name + '\'');
						execute(source, args, text);
						dispatcher.emit('controls/action', name, source, args, text);
					});
					found = true;
				} else {
					logger.debug('Action \'' + name + '\' access for user \'' + source + '\' denied!');
					source.notice('Action Access denied! Derpy in action!');
				}
			}
		}
	}, this);
	return found;
};

Controls.prototype.checkAccess = function (source, CorA) {
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
		return CorA.access.some(function (name) {
			if (this.config.groups[name]) {
				return this.config.groups[name].some(function (user) {
					return source.toString().match(user) !== null;
				});
			}
			return false;
		}, this);
	}

	//else try matching it directly
	return source.toString().match(CorA.access) !== null;
};

module.exports.init = function (reload) {
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

	this.controls = new Controls(this.require('irc'), this.actions, this.commands, this.dispatcher);

	var module = this;

	Object.defineProperty(this.controls, 'config', {
		enumerable: true,
		configurable: false,
		get: function () {
			return module.config;
		}
	});

	Object.defineProperty(this.controls, 'commandDelimiter', {
		enumerable: true,
		configurable: false,
		get: function () {
			return module.config.commandDelimiter;
		}
	});

	if (!reload) {
		Object.defineProperty(this, 'commandDelimiter', {
			enumerable: true,
			configurable: false,
			get: function () {
				return module.config.commandDelimiter;
			}
		});
	}

	//export some functions from Controls
	//require('./../libs/helpers').export(this, this.controls, ['addCommand', 'addAction', 'removeCommand', 'removeAction', 'removeCommands', 'removeActions']);
	require('./../libs/helpers').export(this, this.controls, ['removeCommand', 'removeAction', 'removeCommands', 'removeActions']);

	/**
	 * bind the controls to module core
	 */

	if (!reload) {
		this.moduleActions = {};
		this.moduleCommands = {};
	}

	var proto = require('./../libs/module').Module.prototype;
	proto.addCommand = function (name) {
		name = name.replace(/[^a-zA-Z0-9_\-]+/g, '');
		var args = arguments;
		var that = this;
		process.nextTick(function () {
			module.controls.addCommand.apply(module.controls, args);
			if (typeof module.moduleCommands[that.name] === 'undefined') {
				module.moduleCommands[that.name] = {};
			}
			module.moduleCommands[that.name][name] = name;
		});
		return this;
	};
	proto.addAction = function (name) {
		name = name.replace(/[^a-zA-Z0-9_\-]+/g, '');
		var args = arguments;
		var that = this;
		process.nextTick(function () {
			module.controls.addAction.apply(module.controls, args);
			if (typeof module.moduleActions[that.name] === 'undefined') {
				module.moduleActions[that.name] = {};
			}
			module.moduleActions[that.name][name] = name;
		});
		return this;
	};
	proto.removeCommand = function () {
		module.controls.removeCommand.apply(module.controls, arguments);
		return this;
	};
	proto.removeAction = function () {
		module.controls.removeAction.apply(module.controls, arguments);
		return this;
	};

	this.addCommand = this.addAction = function () {
		throw new Error('Deprecated! Dont use \'controls\' module directly!');
	};

	//clean up the module commands/actions on unload

	function clean(name) {
		if (typeof module.moduleActions[name] !== 'undefined') {
			Object.keys(module.moduleActions[name]).forEach(function (action) {
				if (typeof module.actions[action] !== 'undefined') {
					module.controls.removeAction(action);
				}
			});
			delete module.moduleActions[name];
		}
		if (typeof module.moduleCommands[name] !== 'undefined') {
			Object.keys(module.moduleCommands[name]).forEach(function (command) {
				if (typeof module.commands[command] !== 'undefined') {
					module.controls.removeCommand(command);
				}
			});
			delete module.moduleCommands[name];
		}
	}

	this.dispatcher.on('module-unload', clean).on('module-reload', clean);

	//bind
	this.dispatcher.on('irc/PRIVMSG', this.controls.parse.bind(this.controls)).on('irc/NOTICE', this.controls.parse.bind(this.controls));
};

module.exports.halt = function () {
	var proto = require('./../libs/module').Module.prototype;
	delete proto.addCommand;
	delete proto.addAction;
	delete proto.removeCommand;
	delete proto.removeAction;
};
