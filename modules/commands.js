module.exports.init = function() {
	'use strict';

	var dispatcher = this.dispatcher;
	var c = this.require('controls');
	var irc = this.require('irc');

	c.addAction('quit', function(source, args) {
		source.respond('ok, ' + source.nick + '! goodbye everypony!');
		args.shift();
		irc.quit(args.join(' '));
	}, /^quit[ ]?(.*)$/i);

	c.addAction('part', function(source, args) {
		//dispatcher.on('irc/PART', ok);
		//is not needed as nothing can stop us from parting

		var chans = args[1].match(/#[\w]+/gi);
		if (chans !== null) {
			source.respond('ok, ' + source.nick + '!');
			irc.part.apply(irc, chans);
		} else if (source.channel) {
			source.respond('ok, ' + source.nick + '!');
			irc.part(source.channel);
		} else {
			source.mention('please specify a channel.');
		}
	}, /^part([ ]+(.*)|)$/i);

	c.addAction('join', function(source, args) {
		var chans = args[1].match(/#[\w]+/gi);
		if (chans !== null) {
			source.respond('ok, ' + source.nick + '!');

			var fail = function(s, args) {
				source.mention('joining the channel \'' + args[1] + '\' has failed! ' + args[2]);
				clean();
			};
			var ok = function(s, args) {
				if (s.nick === irc.currentNick) {
					source.respond('ok, i joined the channel \'' + args[0] + '\'');
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
	}, /^join([ ]+(.*)|)$/i);

	c.addAction('nick', function(source, args) {
		var nick = args[2];
		if (nick) {
			source.respond('ok, ' + source.nick + ', lemmy try this new name');

			var fail = function() {
				source.mention('NICK change failed!');
				clean();
			};
			var inuse = function() {
				source.mention('NICK change failed! Nick already in use!');
				clean();
			};
			var ok = function(s) {
				if (s.nick === irc.currentNick) {
					source.mention('NICK change is success!');
					clean();
				}
			};
			var clean = function() {
				dispatcher.off('irc/430', fail);
				dispatcher.off('irc/431', fail);
				dispatcher.off('irc/432', fail);
				dispatcher.off('irc/433', inuse);
				dispatcher.off('irc/NICK', ok);
			};

			dispatcher.on('irc/430', fail);
			dispatcher.on('irc/431', fail);
			dispatcher.on('irc/432', fail);
			dispatcher.on('irc/433', inuse);
			dispatcher.on('irc/NICK', ok);

			setTimeout(clean, 5000);

			irc.nick(nick);
		} else {
			source.respond('Hello, my name is ' + irc.currentNick);
		}
	}, /^nick([ ]+(.*)|)$/i);

	function help(source) {
		//TODO: display only commands the asking user has persmission to
		source.mention('available commands are: ' + c.commandDelimiter + Object.keys(c.commands).join(', ' + c.commandDelimiter));
		//TODO: display only actions the asking user has persmission to and send them in PRIVMSG
		//source.respond('available actions are: ' + Object.keys(c.actions).join(', '));
	}

	c.addCommand('help', help).addAction('help', help, /^help$/);

	//get moduleManager and save it for the commands
	var mm;
	this.dispatcher.on('init', function(bot) {
		mm = bot.modules;
	});

	c.addAction('lsmod', function(source) {
		source.mention('i have these modules active: ' + mm.getModules().join(', '));
	}, /^lsmod|modules$/);

	c.addAction('reload', function(source, args) {
		var modules = args[1].match(/\w+/gi);
		var call = function(err, m) {
			if (err) {
				source.respond('module \'' + m + '\' failed to reload! ' + err);
			} else {
				source.respond('module \'' + m + '\' reloaded!');
			}
		};
		source.mention('ok');
		modules.forEach(function(name) {
			mm.reload(name, call);
		});
	}, /^reload[ ]+(.*)$/);

	c.addAction('load', function(source, args) {
		var modules = args[1].match(/\w+/gi);
		var call = function(err, m) {
			if (err) {
				source.respond('module \'' + m + '\' failed to load! ' + err);
			} else {
				source.respond('module \'' + m + '\' loaded!');
			}
		};
		source.mention('ok');
		modules.forEach(function(name) {
			mm.load(name, call);
		});
	}, /^load[ ]+(.*)$/);

	c.addAction('unload', function(source, args) {
		var modules = args[1].match(/\w+/gi);
		var call = function(err, m) {
			if (err) {
				source.respond('module \'' + m + '\' failed to unload! ' + err);
			} else {
				source.respond('module \'' + m + '\' unloaded!');
			}
		};
		source.mention('ok');
		modules.forEach(function(name) {
			mm.unload(name, call);
		});
	}, /^unload[ ]+(.*)$/);
};

module.exports.halt = function() {
	var c = this.require('controls');

	c.removeAction('quit').removeAction('part').removeAction('join').removeAction('nick');
	c.removeAction('help').removeCommand('help');
	c.removeAction('lsmod').removeAction('load').removeAction('unload').removeAction('reload');
};