module.exports.init = function() {
	'use strict';

	var dispatcher = this.dispatcher;
	var c = this.require('controls');
	var irc = this.require('irc');

	c.addAction('quit', function(source, args) {
		source.respond('okey, ' + source.nick + '! Goodbye everypony!');
		args.shift();
		irc.quit(args.join(' '));
	}, /^quit[ ]?(.*)$/i, ['owner']);

	c.addAction('part', function(source, args) {
		//dispatcher.on('irc/PART', ok);
		//is not needed as nothing can stop us from parting

		if (!irc.connected) {
			source.respond('I\'m not connected to server!');
			return;
		}

		var chans = args[1].match(/#[\w]+/gi);
		if (chans !== null) {
			source.respond('okey, ' + source.nick + '! I didnt like the \'' + chans.join('\', \'') + '\' either.');
			irc.part.apply(irc, chans);
		} else if (source.channel) {
			source.respond('okey, ' + source.nick + '! I\'m going to look for ponies elsewhere.');
			irc.part(source.channel);
		} else {
			source.mention('please specify a channel.');
		}
	}, /^part([ ]+(.*)|)$/i, ['owner', 'operators']);

	c.addAction('join', function(source, args) {
		if (!irc.connected) {
			source.respond('I\'m not connected to server!');
			return;
		}
		var chans = args[1].match(/#[\w]+/gi);
		if (chans !== null) {
			source.respond('okey, ' + source.nick + '! Lemme see what goes in \'' + chans.join('\', \'') + '\'.');

			var fail = function(s, args) {
				source.mention('i cannot go to \'' + args[1] + '\'! Because ' + args[2]);
				clean();
			};
			var ok = function(s, args) {
				if (s.nick === irc.currentNick) {
					source.respond('*ding*, i am now in \'' + args[0] + '\' too!');
					clean();
				}
			};

			var timer = setTimeout(clean, 5000);
			var clean = function() {
				dispatcher.off('irc/405', fail);
				dispatcher.off('irc/471', fail);
				dispatcher.off('irc/473', fail);
				dispatcher.off('irc/474', fail);
				dispatcher.off('irc/475', fail);
				dispatcher.off('irc/JOIN', ok);
				clearTimeout(timer);
			};

			dispatcher.on('irc/405', fail);
			dispatcher.on('irc/471', fail);
			dispatcher.on('irc/473', fail);
			dispatcher.on('irc/474', fail);
			dispatcher.on('irc/475', fail);
			dispatcher.on('irc/JOIN', ok);

			irc.join.apply(irc, chans);
		} else {
			source.mention('please specify a channel.');
		}
	}, /^join([ ]+(.*)|)$/i, ['owner', 'operators']);

	c.addAction('nick', function(source, args) {
		if (!irc.connected) {
			source.respond('I\'m not connected to server!');
			return;
		}
		var nick = args[2];
		if (nick) {
			source.respond('okey, ' + source.nick + '! Lemmy try this new name.');

			var fail = function() {
				source.mention('i failed in renaming myself!');
				clean();
			};
			var inuse = function() {
				source.mention('i failed, somepony uses that name already!');
				clean();
			};
			var toofast = function() {
				source.mention('i failed, they told me i need to wait!');
				clean();
			};
			var ok = function(s) {
				if (s.nick === irc.lastNick) {
					source.mention('success! Do u like my new name?');
					clean();
				}
			};

			var timer = setTimeout(clean, 5000);
			var clean = function() {
				dispatcher.off('irc/430', fail);
				dispatcher.off('irc/431', fail);
				dispatcher.off('irc/432', fail);
				dispatcher.off('irc/433', inuse);
				dispatcher.off('irc/438', toofast);
				dispatcher.off('irc/NICK', ok);
				clearTimeout(timer);
			};

			dispatcher.on('irc/430', fail);
			dispatcher.on('irc/431', fail);
			dispatcher.on('irc/432', fail);
			dispatcher.on('irc/433', inuse);
			dispatcher.on('irc/438', toofast);
			dispatcher.on('irc/NICK', ok);

			irc.nick(nick);
		} else {
			source.respond('Hello, my name is ' + irc.currentNick);
		}
	}, /^nick([ ]+(.*)|)$/i, ['owner', 'operators']);


	function actionList(source) {
		var actions = [];
		Object.keys(c.actions).forEach(function(n) {
			if (this.controls.checkAccess(source, this.actions[n])) {
				actions.push(n);
			}
		}, c);

		source.message('actions that can be triggered by you are: ' + actions.join(', '));
	}

	function commandList(source, args) {
		if (args[0] === 'actions' ||  args[1] === ' actions') {
			actionList(source);
			return;
		}

		var commands = [];
		Object.keys(c.commands).forEach(function(n) {
			if (this.controls.checkAccess(source, this.commands[n])) {
				commands.push(n);
			}
		}, c);

		source.mention('the available commands are: ' + c.commandDelimiter + commands.join(', ' + c.commandDelimiter));
	}

	c.addCommand('help', commandList).addAction('help', commandList, /^help( actions)?$/);

	//get moduleManager and save it for the commands
	var module = this;
	this.dispatcher.on('init', function(bot) {
		module.mm = bot.modules;
	});

	c.addAction('lsmod', function(source) {
		source.mention('i have these modules active: ' + module.mm.getModules().join(', '));
	}, /^lsmod|modules$/, ['owner']);

	c.addAction('reload', function(source, args) {
		var modules = args[1].match(/\w+/gi);
		var call = function(err, m) {
			if (err) {
				source.respond('module \'' + m + '\' failed to reload! ' + err);
			} else {
				source.respond('module \'' + m + '\' reloaded!');
			}
		};
		source.respond('okey, ' + source.nick + '! I reload it after i find it.');
		modules.forEach(function(name) {
			module.mm.reload(name, call);
		});
	}, /^reload[ ]+(.*)$/, ['owner']);

	c.addAction('load', function(source, args) {
		var modules = args[1].match(/\w+/gi);
		var call = function(err, m) {
			if (err) {
				source.respond('module \'' + m + '\' failed to load! ' + err);
			} else {
				source.respond('module \'' + m + '\' loaded!');
			}
		};
		source.respond('okey, ' + source.nick + '! I\'m really eager to learn new things!');
		modules.forEach(function(name) {
			module.mm.load(name, call);
		});
	}, /^load[ ]+(.*)$/, ['owner']);

	c.addAction('unload', function(source, args) {
		var modules = args[1].match(/\w+/gi);
		var call = function(err, m) {
			if (err) {
				source.respond('module \'' + m + '\' failed to unload! ' + err);
			} else {
				source.respond('module \'' + m + '\' unloaded!');
			}
		};
		source.respond('okey, ' + source.nick + '! Let\'s throw it away!');
		modules.forEach(function(name) {
			module.mm.unload(name, call);
		});
	}, /^unload[ ]+(.*)$/, ['owner']);


	c.addAction('say', function(source, args) {
		if (!irc.connected) {
			source.respond('I\'m not connected to server!');
			return;
		}
		args.shift(); //remove the first one
		if (args[2].trim() === '') {
			source.respond('you probadly should tell me what i should tell to \'' + args[1] + '\'');
		} else {
			var resendreply = function(s, text) {
				if (args[1] === s.nick) {
					source.respond(args[1] + ' REPLY: ' + text);
					clean();
				}
			};
			var wrongnick = function(s, argv) {
				source.respond('Nick or channel with name \'' + argv[1] + '\' was not found.');
				clean();
			};
			var noExternal = function(s, argv) {
				source.respond('Channel \'' + argv[1] + '\' has blocked external messages.');
				clean();
			};

			var timer = setTimeout(clean, 5000);
			var clean = function() {
				dispatcher.off('irc/PRIVMSG', resendreply);
				dispatcher.off('irc/NOTICE', resendreply);
				dispatcher.off('irc/401', wrongnick);
				dispatcher.off('irc/404', noExternal);
				clearTimeout(timer);
			};

			//say it
			if (irc.privMsg(args[1], args[2])) {
				dispatcher.on('irc/PRIVMSG', resendreply);
				dispatcher.on('irc/NOTICE', resendreply);
				dispatcher.on('irc/401', wrongnick);
				dispatcher.on('irc/404', noExternal);
			} else {
				source.mention('wait a little while...');
			}
		}
	}, /^(say|tell)[ ]+(#?\w+)[ ]*(.*)$/i, ['owner', 'operators']);
};

module.exports.halt = function() {
	var c = this.require('controls');

	c.removeActions(['quit', 'part', 'join', 'nick',
		'help',
		'lsmod', 'load', 'unload', 'reload',
		'say']);
	c.removeCommand('help');
};