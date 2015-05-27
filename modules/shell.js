/**
 * REPL shell
 */

'use strict';

//trim some strings
if (!String.prototype.trim) {
	String.prototype.trim = function () {
		return this.replace(/^\s+|\s+$/g, '');
	};
}

function ShellSource() {
	this.nick = 'shell';
	this.user = 'shell';
	this.host = 'shell';
	this.channel = '';
}

ShellSource.prototype.valueOf = ShellSource.prototype.toString = function () {
	return 'ItzAInternallPonyShell';
};

ShellSource.prototype.reply = ShellSource.prototype.respond = ShellSource.prototype.mention = ShellSource.prototype.action = ShellSource.prototype.tell = ShellSource.prototype.message = ShellSource.prototype.note = ShellSource.prototype.notice = function (msg) {
	process.stdout.write('[PONY] ' + msg + '\n');
};

function Shell(module, rl, c, irc) {
	this.module = module;
	this.rl = rl;
	this.c = c;
	this.irc = irc;
	this.promptString = 'PSHELL> ';
	this.source = new ShellSource();
	Object.defineProperty(this.source, 'irc', {
		value: this.irc,
		enumerable: false,
		writable: false,
		configurable: false
	});

	//clean what could be on before
	rl.removeAllListeners();

	rl.setPrompt(this.promptString);
	rl.on('close', this.onClose.bind(this));
	rl.on('SIGINT', this.onSigint.bind(this));
	rl.on('SIGTSTP', function () {
		// This will override SIGTSTP and prevent the program from going to the background.
	});
	rl.on('SIGCONT', function () {
		// `prompt` will automatically resume the stream
		rl.prompt();
	});

	rl.on('line', this.parseLine.bind(this));
}

Shell.prototype.parseLine = function (cmd) {
	cmd = cmd.trim();

	switch (cmd) {
		case '':
			this.rl.prompt();
			break;
		case 'connect':
			if (!this.irc.connected) {
				this.irc.connect();
			} else {
				this.source.reply('I\'m already connected to \'' + this.irc.server + '\'!');
			}
			break;
		case 'disconnect':
			if (this.irc.connected) {
				this.irc.quit('Pony sleep...');
			} else {
				this.source.reply('I\'m not connected to server!');
			}
			break;
		case 'exit':
		case '.exit':
			process.emit('SIGINT');
			break;
		case 'help':
			this.source.reply('To exit press CTRL+C, otherwise use the same Actions u would PM me trough IRC.');
			this.c.processAction(this.source, cmd); //process the help action
			break;
		default:
			var handled = false;
			if (cmd.length > this.c.commandDelimiter.length && cmd.substr(0, this.c.commandDelimiter.length) === this.c.commandDelimiter) { //command
				handled = this.c.processCommand(this.source, cmd.substr(this.c.commandDelimiter.length));
			} else if (cmd.length > 0) { //action
				handled = this.c.processAction(this.source, cmd);
			}

			if (!handled) {
				this.source.reply('No valid action or command!');
			}
	}

	//this.rl.prompt();
};

Shell.prototype.onClose = function () {
	if (!this.module.ending) {
		this.source.reply('Uh oh, the Shell has been terminated!');
		this.module.mm.unload(this.module.name);
		this.source.reply('But i\'m still alive! To kill me you need to use CTRL+C combo!');
	}
};

Shell.prototype.onSigint = function () {
	//var rl = this.rl;
	var sh = this;
	this.rl.question('[SCARED PONY] Are you sure you want to kill me? [y/n] ', function (answer) {
		if (answer.match(/^(y|a|sure)(es|no)?$/i)) {
			sh.source.reply('noooooooo ... *splat*');
			process.emit('SIGINT');
		} else {
			sh.source.reply('*phew*, that was close one...');
			//rl.prompt();
		}
	});
};

module.exports.init = function (reload) {
	if (!reload) {
		this.rl = require('readline').createInterface({
			input: process.stdin,
			output: process.stdout
		});
	}

	var irc = this.require('irc');
	this.shell = new Shell(this, this.rl, this.require('controls').controls, irc);

	var module = this;
	this.dispatcher.on('init', function (bot) {
		module.mm = bot.modules;
		if (!irc.config.autoconnect) {
			module.shell.source.reply('You can connect to IRC using \'connect\'!');
		}
	});
};

module.exports.halt = function (reload) {
	if (!reload) {
		this.ending = true;
		this.rl.close();
		process.stdin.pause();
	}
};
