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

			var clean = function() {
				dispatcher.off('irc/405', fail);
				dispatcher.off('irc/471', fail);
				dispatcher.off('irc/473', fail);
				dispatcher.off('irc/474', fail);
				dispatcher.off('irc/475', fail);
				dispatcher.off('irc/JOIN', ok);
			};

			dispatcher.on('irc/405', fail);
			dispatcher.on('irc/471', fail);
			dispatcher.on('irc/473', fail);
			dispatcher.on('irc/474', fail);
			dispatcher.on('irc/475', fail);
			dispatcher.on('irc/JOIN', ok);

			setTimeout(clean, 5000);

			irc.join.apply(irc, chans);
		} else {
			source.mention('please specify a channel.');
		}
	}, /^join([ ]+(.*)|)$/i, ['owner', 'operators']);

	c.addAction('nick', function(source, args) {
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
			var clean = function() {
				dispatcher.off('irc/430', fail);
				dispatcher.off('irc/431', fail);
				dispatcher.off('irc/432', fail);
				dispatcher.off('irc/433', inuse);
				dispatcher.off('irc/438', toofast);
				dispatcher.off('irc/NICK', ok);
			};

			dispatcher.on('irc/430', fail);
			dispatcher.on('irc/431', fail);
			dispatcher.on('irc/432', fail);
			dispatcher.on('irc/433', inuse);
			dispatcher.on('irc/438', toofast);
			dispatcher.on('irc/NICK', ok);

			setTimeout(clean, 5000);

			irc.nick(nick);
		} else {
			source.respond('Hello, my name is ' + irc.currentNick);
		}
	}, /^nick([ ]+(.*)|)$/i, ['owner', 'operators']);

	function help(source) {
		//TODO: display only commands the asking user has persmission to
		source.mention('the available commands are: ' + c.commandDelimiter + Object.keys(c.commands).join(', ' + c.commandDelimiter));
		//TODO: display only actions the asking user has persmission to and send them in PRIVMSG
		//source.respond('available actions are: ' + Object.keys(c.actions).join(', '));
	}

	c.addCommand('help', help).addAction('help', help, /^help$/);

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
};

module.exports.halt = function() {
	var c = this.require('controls');

	c.removeActions(['quit', 'part', 'join', 'nick',
		'help',
		'lsmod', 'load', 'unload', 'reload']);
	c.removeCommand('help');
};