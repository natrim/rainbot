var logger = require(LIBS_DIR + '/logger');

var Command = require('./controls/command').Command;
var Action = require('./controls/action').Action;

//trim some strings
if (!String.prototype.trim) {
	String.prototype.trim = function() {
		return this.replace(/^\s+|\s+$/g, '');
	};
}

function Controls(irc, actions, commands) {
	this._irc = irc;
	this.actions = actions;
	this.commands = commands;
	this.commandDelimiter = '.';
}

Controls.prototype.add = function(ca) {
	if (ca instanceof Command) {
		if (typeof this.commands[ca.name] !== 'undefined') {
			throw new Error('Defined command \'' + ca.name + '\' already exists!');
		}
		this.commands[ca.name] = ca;
	} else if (ca instanceof Action) {
		if (typeof this.actions[ca.name] !== 'undefined') {
			throw new Error('Defined action \'' + ca.name + '\' already exists!');
		}
		this.actions[ca.name] = ca;
	} else {
		throw new Error('Unknown control type!');
	}

	return this;
};

Controls.prototype.remove = function(ca) {
	if (ca instanceof Command) {
		if (typeof this.commands[ca.name] === 'undefined') {
			throw new Error('Command \'' + ca.name + '\' does not exists!');
		}
		delete this.commands[ca.name];
	} else if (ca instanceof Action) {
		if (typeof this.actions[ca.name] === 'undefined') {
			throw new Error('Action \'' + ca.name + '\' does not exists!');
		}
		delete this.actions[ca.name];
	} else {
		throw new Error('Unknown control type!');
	}

	return this;
};

Controls.prototype.addCommand = function(name, action) {
	return this.add(new Command(name, action));
};

Controls.prototype.addAction = function(name, action, regexp) {
	return this.add(new Action(name, action, regexp));
};

Controls.prototype.removeCommand = function(name) {
	if (typeof this.commands[name] !== 'undefined') {
		this.remove(this.commands[name]);
	} else {
		throw new Error('Command \'' + name + '\' does not exists!');
	}
	return this;
};

Controls.prototype.removeAction = function(name) {
	if (typeof this.actions[name] !== 'undefined') {
		this.remove(this.actions[name]);
	} else {
		throw new Error('Action \'' + name + '\' does not exists!');
	}
	return this;
};

Controls.prototype.parse = function(source, text) {
	if (typeof text !== 'string' || text.length <= 0) return;

	if (!source.channel) { //itz direct message
		this.processAction(source, text.trim());
	} else if (source.channel && text.substr(0, this.commandDelimiter.length) === this.commandDelimiter) { //itz command in channel
		//remove the delimiter
		text = text.substr(this.commandDelimiter.length);

		this.processCommand(source, text.trim());
	} else if (text.substr(0, this._irc.currentNick.length + 1).search(new RegExp(this._irc.currentNick + '[ ,;:]')) !== -1) { //itz higlight in channel
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
		if (command == this.commands[name].name) { //use == to not check type
			logger.debug('Processing Command \'' + name + '\'');
			this.commands[name].action(source, args, text);
			return true;
		}
		return false;
	}, this);
};

Controls.prototype.processAction = function(source, text) {
	//proces all actions that triggers rule
	Object.keys(this.actions).forEach(function(name) {
		var args = text.match(this.actions[name].rule);
		if (args !== null) {
			logger.debug('Processing Action \'' + name + '\'');
			this.actions[name].action(source, args, text);
		}
	}, this);
};

module.exports.init = function(reload) {
	if (!reload) {
		this.actions = {};
		this.commands = {};
	}

	this.controls = new Controls(this.require('irc'), this.actions, this.commands);

	if (typeof this.config.commandDelimiter === 'string') {
		this.controls.commandDelimiter = this.config.commandDelimiter;
	}

	var module = this;
	Object.defineProperty(this, 'commandDelimiter', {
		enumerable: true,
		get: function() {
			return module.controls.commandDelimiter;
		}
	});

	//export some functions from Controls
	require(LIBS_DIR + '/helpers').export(this, this.controls, ['addCommand', 'addAction', 'removeCommand', 'removeAction']);

	//bind
	//this.require('irc');
	this.on('irc/PRIVMSG', this.controls.parse.bind(this.controls)).on('irc/NOTICE', this.controls.parse.bind(this.controls));
};