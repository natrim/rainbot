//trim some strings
if (!String.prototype.trim) {
	String.prototype.trim = function() {
		return this.replace(/^\s+|\s+$/g, '');
	};
}

function ShellSource() {
	this.nick = 'shell';
	this.user = 'shell';
	this.host = 'shell';
	this.channel = '';
}

ShellSource.prototype.valueOf = ShellSource.prototype.toString = function() {
	return 'ItzAInternallPonyShell';
};

ShellSource.prototype.reply = ShellSource.prototype.respond = ShellSource.prototype.mention = ShellSource.prototype.action = ShellSource.prototype.tell = ShellSource.prototype.message = ShellSource.prototype.note = ShellSource.prototype.notice = function(msg) {
	console.log('[PONY] ' + msg);
};

function Shell(module, rl, c) {
	this.module = module;
	this.rl = rl;
	this.c = c;
	this.promptString = 'PONY> ';

	//clean what could be on before
	rl.removeAllListeners();

	rl.setPrompt(this.promptString);
	rl.on('close', this.onClose.bind(this));
	rl.on('SIGINT', this.onSigint.bind(this));
	rl.on('SIGTSTP', function() {
		// This will override SIGTSTP and prevent the program from going to the background.
	});
	rl.on('SIGCONT', function() {
		// `prompt` will automatically resume the stream
		//rl.prompt();
		process.stdin.resume();
	});

	rl.on('line', this.parseLine.bind(this));
}

Shell.prototype.parseLine = function(cmd) {
	cmd = cmd.trim();
	var source = new ShellSource();
	switch (cmd) {
		case '':
			//nothing
			break;
		case 'exit':
		case '.exit':
			process.emit('SIGINT');
			break;
		case 'help':
			console.log('[SHELL] To exit press CTRL+C, otherwise use the same Actions u would PM me trough IRC.');
			this.c.processAction(source, cmd); //process the help action
			break;
		default:
			if (cmd.substr(0, this.c.commandDelimiter.length) === this.c.commandDelimiter) { //command
				this.c.processCommand(source, cmd.substr(this.c.commandDelimiter.length));
			} else { //by default try action
				this.c.processAction(source, cmd);
			}
	}

	//this.rl.prompt();
};

Shell.prototype.onClose = function() {
	if (!this.module.ending) {
		console.log('[SHELL] Uh oh, the Shell has been terminated!');
		this.module.mm.unload(this.module.name);
		console.log('[SHELL] But i\'m still alive! To kill me you need to use CTRL+C combo!');
	}
};

Shell.prototype.onSigint = function() {
	var rl = this.rl;
	this.rl.question('[SHELL] Are you sure you want to kill me? [y/n] ', function(answer) {
		if (answer.match(/^(y|a|sure)(es|no)?$/i)) {
			process.emit('SIGINT');
		} else {
			console.log('[SHELL] *phew*, that was close one...');
			//rl.prompt();
		}
	});
};

module.exports.init = function(reload) {
	if (!reload) {
		this.rl = require('readline').createInterface({
			input: process.stdin,
			output: process.stdout
		});
	}

	var module = this;
	this.dispatcher.on('init', function(bot) {
		module.mm = bot.modules;
	});

	this.shell = new Shell(this, this.rl, this.require('controls').controls);
};

module.exports.halt = function(reload) {
	if (!reload) {
		this.ending = true;
		this.rl.close();
		process.stdin.pause();
	}
};