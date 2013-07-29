/**
 * Some basic commands for bot
 */

'use strict';

module.exports.init = function () {
	var dispatcher = this.dispatcher;
	var irc = this.require('irc');
	var controls = this.require('controls');
	var module = this;

	//get moduleManager and bot and save it for the commands
	this.dispatcher.on('init', function (bot) {
		module.mm = bot.modules;
		module.bot = bot;
	});

	this.addAction('quit', function (source, args) {
		if (!irc.connected) {
			source.respond('I\'m not connected to server!');
			return;
		}

		source.respond('okey, ' + source.nick + '! Goodbye everypony!');
		irc.quit(args[1]);
	}, /^quit[ ]?(.*)$/i, ['owner']);

	this.addAction('part', function (source, args) {
		//dispatcher.on('irc/PART', ok);
		//is not needed as nothing can stop us from parting

		if (!irc.connected) {
			source.respond('I\'m not connected to server!');
			return;
		}

		var chans = args[1].match(/#[\w\-\_]+/gi);
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

	this.addAction('join', function (source, args) {
		if (!irc.connected) {
			source.respond('I\'m not connected to server!');
			return;
		}
		var chans = args[1].match(/#[\w\-\_]+/gi);
		if (chans !== null) {
			source.respond('okey, ' + source.nick + '! Lemme see what goes in \'' + chans.join('\', \'') + '\'.');

			var fail = function (s, args) {
				source.mention('i cannot go to \'' + args[1] + '\'! Because ' + args[2]);
				clean();
			};
			var ok = function (s, args) {
				if (s.nick === irc.currentNick) {
					source.respond('*ding*, i am now in \'' + args[0] + '\' too!');
					clean();
				}
			};

			var timer;
			var clean = function () {
				dispatcher.off('irc/405', fail);
				dispatcher.off('irc/471', fail);
				dispatcher.off('irc/473', fail);
				dispatcher.off('irc/474', fail);
				dispatcher.off('irc/475', fail);
				dispatcher.off('irc/JOIN', ok);
				clearTimeout(timer);
			};
			timer = setTimeout(clean, 5000);

			irc.join.apply(irc, chans);

			dispatcher.on('irc/405', fail);
			dispatcher.on('irc/471', fail);
			dispatcher.on('irc/473', fail);
			dispatcher.on('irc/474', fail);
			dispatcher.on('irc/475', fail);
			dispatcher.on('irc/JOIN', ok);
		} else {
			source.mention('please specify a channel.');
		}
	}, /^join([ ]+(.*)|)$/i, ['owner', 'operators']);

	this.addAction('nick', function (source, args) {
		if (!irc.connected) {
			source.respond('I\'m not connected to server!');
			return;
		}
		var nick = args[2];
		if (nick) {
			source.respond('okey, ' + source.nick + '! Lemmy try this new name.');

			var fail = function () {
				source.mention('i failed in renaming myself!');
				clean();
			};
			var inuse = function () {
				source.mention('i failed, somepony uses that name already!');
				clean();
			};
			var toofast = function () {
				source.mention('i failed, they told me i need to wait!');
				clean();
			};
			var ok = function (s) {
				if (s.nick === irc.lastNick) {
					source.mention('success! Do u like my new name?');
					clean();
				}
			};

			var timer;
			var clean = function () {
				dispatcher.off('irc/430', fail);
				dispatcher.off('irc/431', fail);
				dispatcher.off('irc/432', fail);
				dispatcher.off('irc/433', inuse);
				dispatcher.off('irc/438', toofast);
				dispatcher.off('irc/NICK', ok);
				clearTimeout(timer);
			};
			timer = setTimeout(clean, 5000);

			irc.nick(nick);

			dispatcher.on('irc/430', fail);
			dispatcher.on('irc/431', fail);
			dispatcher.on('irc/432', fail);
			dispatcher.on('irc/433', inuse);
			dispatcher.on('irc/438', toofast);
			dispatcher.on('irc/NICK', ok);
		} else {
			source.respond('Hello, my name is ' + irc.currentNick);
		}
	}, /^nick([ ]+(.*)|)$/i, ['owner', 'operators']);

	function actionList(source) {
		var actions = [];
		Object.keys(controls.actions).forEach(function (n) {
			if (this.controls.checkAccess(source, this.actions[n])) {
				actions.push(n);
			}
		}, controls);

		source.mention('check private message from me for available actions.');
		source.message('actions that can be triggered by you are: ' + actions.join(', '));
	}

	function commandList(source, args) {
		if (args[0] === 'actions' ||  args[1] === ' actions') {
			actionList(source);
			return;
		}

		var commands = [];
		Object.keys(controls.commands).forEach(function (n) {
			if (this.controls.checkAccess(source, this.commands[n])) {
				commands.push(n);
			}
		}, controls);

		source.mention('the available commands are: ' + controls.commandDelimiter + commands.join(', ' + controls.commandDelimiter));
	}

	this.addCommand('help', commandList).addAction('help', commandList, /^help( actions)?$/);

	this.addAction('config save', function (source) {
		if (module.bot._configFile) {
			module.bot.saveConfig(module.bot._configFile);
			if (source.toString() !== 'ItzAInternallPonyShell') {
				source.respond('Config saved!');
			}
		} else {
			source.respond('Config cannot be saved!');
		}
	}, /^config save$/i);

	this.addAction('config load', function (source) {
		if (module.bot._configFile) {
			module.bot.loadConfig(module.bot._configFile);
			if (source.toString() !== 'ItzAInternallPonyShell') {
				source.respond('Config (re)loaded!');
			}
		} else {
			source.respond('Config cannot be loaded!');
		}
	}, /^config load$/i);

	this.addAction('lsmod', function (source) {
		source.mention('i have these modules active: ' + module.mm.getModules().join(', '));
	}, /^lsmod|modules$/i, ['owner']);

	this.addAction('reload', function (source, args) {
		var modules = args[1].match(/\w+/gi);
		source.respond('okey, ' + source.nick + '! Gimmie a sec to tune my element to it.');
		modules.forEach(function (name) {
			try {
				module.mm.reload(name);
				source.respond('module \'' + name + '\' reloaded!');
			} catch (e) {
				source.respond('module \'' + name + '\' failed to reload! ' + e);
			}
		});
	}, /^reload[ ]+(.*)$/i, ['owner']);

	this.addAction('load', function (source, args) {
		var modules = args[1].match(/\w+/gi);
		source.respond('okey, ' + source.nick + '! I\'m really eager to learn new things!');
		modules.forEach(function (name) {
			try {
				module.mm.load(name);
				source.respond('module \'' + name + '\' loaded!');
			} catch (e) {
				source.respond('module \'' + name + '\' failed to load! ' + e);
			}
		});
	}, /^load[ ]+(.*)$/i, ['owner']);

	this.addAction('unload', function (source, args) {
		var modules = args[1].match(/\w+/gi);
		source.respond('okey, ' + source.nick + '! Let\'s throw it away!');
		modules.forEach(function (name) {
			try {
				module.mm.unload(name);
				source.respond('module \'' + name + '\' unloaded!');
			} catch (e) {
				source.respond('module \'' + name + '\' failed to unload! ' + e);
			}
		});
	}, /^unload[ ]+(.*)$/i, ['owner']);


	this.addAction('say', function (source, args) {
		if (!irc.connected) {
			source.respond('I\'m not connected to server!');
			return;
		}
		var target = args[2];
		var msg = args[3];
		if (msg.trim() === '') {
			source.respond('you probadly should tell me what i should tell to \'' + target + '\'');
		} else {
			var resendreply = function (s, text) {
				if (target === s.nick) {
					source.respond(target + ' REPLY: ' + text);
					clean();
				}
			};
			var wrongnick = function (s, argv) {
				source.respond('Nick or channel with name \'' + argv[1] + '\' was not found.');
				clean();
			};
			var noExternal = function (s, argv) {
				source.respond('Channel \'' + argv[1] + '\' has blocked external messages.');
				clean();
			};

			var timer;
			var clean = function () {
				dispatcher.off('irc/PRIVMSG', resendreply);
				dispatcher.off('irc/NOTICE', resendreply);
				dispatcher.off('irc/401', wrongnick);
				dispatcher.off('irc/404', noExternal);
				clearTimeout(timer);
			};
			timer = setTimeout(clean, 5000);

			//say it
			var ret;
			if (args[1] === 'note') {
				ret = irc.notice(target, msg);
			} else if (args[1] === 'me') {
				ret = irc.action(target, msg);
			} else if (args[1] === 'tell') {
				ret = irc.privMsg(target, 'hey ' + target + ', ' + msg);
			} else {
				ret = irc.privMsg(target, msg);
			}

			if (ret) {
				dispatcher.on('irc/PRIVMSG', resendreply);
				dispatcher.on('irc/NOTICE', resendreply);
				dispatcher.on('irc/401', wrongnick);
				dispatcher.on('irc/404', noExternal);
			} else {
				source.mention('wait a little while...');
			}
		}
	}, /^(say|tell|note|me)[ ]+(#?[\w\_\-\\\[\]\{\}\^\`\|]+)[ ]*(.*)$/i, ['owner', 'operators']);

	//pass the command
	this.addAction('command', function (source, args) {
		if (!irc.connected) {
			source.respond('I\'m not connected to server!');
			return;
		}

		if (args[1]) {
			var wrongcommand = function (s, args) {
				if (args[0] === irc.currentNick) {
					source.mention('my pony powers tells me that command \'' + args[1] + '\' is unknown!');
					clean();
				}
			};

			var timer;
			var clean = function () {
				dispatcher.off('irc/421', wrongcommand);
				clearTimeout(timer);
			};
			timer = setTimeout(clean, 5000);

			irc.irc.send(args[1]);

			dispatcher.on('irc/421', wrongcommand);

			source.mention('okey');
		} else {
			source.mention('tell me what');
		}
	}, /^command[ ]+(.*)/i, ['owner']);

	this.addAction('update', function (source) {
		source.action('is fetching updates...');

		require('child_process').exec('cd ' + BOT_DIR + ' && git pull', function (error, stdout) {
			if (error) {
				source.respond('Update failed!');
				return;
			}

			var stdouts = stdout.replace(/\n$/, '').split('\n');
			var message = stdouts.shift();
			var updatedModules = [];
			var updatedCore = false;
			var npm = false;
			var config = false;
			var uptodate = false;

			if (message) {
				if (message.match(/up\-to\-date/)) {
					uptodate = true;
				}
				source.respond(message);
			} else {
				source.respond('Update failed!');
				return;
			}

			if (stdouts.length > 0) {
				stdouts.forEach(function (value) {
					var tmp = value.match(/modules\/(.+)\.js/);
					if (tmp) {
						updatedModules.push(tmp[1]);
					} else {
						tmp = value.match(/app\.js|libs\//);
						if (tmp) {
							updatedCore = true;
						} else {
							tmp = value.match(/package\.json/);
							if (tmp) {
								npm = true;
							} else {
								tmp = value.match(/example-config\.json/);
								if (tmp) {
									config = true;
								}
							}
						}
					}
				});
			}

			if (updatedCore) {
				source.respond('CORE was updated, please restart the bot! ... Eh, i mean\'t: release the pony!');
			}

			if (npm) {
				source.respond('package.json was updated, please use \'npm install\'');
			}

			if (config) {
				source.respond('example-config.json was updated, please use check your configuration');
			}

			updatedModules = require(LIBS_DIR + '/helpers').unique(updatedModules);
			if (updatedModules.length > 0) {
				source.respond('Don\'t forget to reload updated modules: ' + updatedModules.join(', '));
			}

			if (!updatedCore && updatedModules.length <= 0 && !uptodate) {
				source.respond('Nothing important has been updated.');
			}
		});
	}, /^update$/i, ['owner']);

	this.addAction('stats', function (source, args) {
		var helpers = require(LIBS_DIR + '/helpers');

		if (args[0] === 'uptime') {
			source.mention('i\'m running already ' + helpers.formatTime(process.uptime()));
		} else if (args[0] === 'mem' || args[0] === 'memory') {
			source.mention('i currently pony with ' + helpers.formatSizeUnits(process.memoryUsage().rss));
		} else if (args[0] === 'connected') {
			if (irc.connected) {
				source.mention('i connected to server \'' + irc.server + '\' on ' + helpers.formatDate(new Date(irc.connectedOn * 1000), module.config.dateFormat));
			} else {
				source.mention('i\'m not currently connected to server');
			}
		} else {
			source.mention('i currently pony with ' + helpers.formatSizeUnits(process.memoryUsage().rss) + ' for ' + helpers.formatTime(process.uptime()) + (irc.connected ? ' and i connected to server \'' + irc.server + '\' on ' + helpers.formatDate(new Date(irc.connectedOn * 1000), module.config.dateFormat) : ' and i am not connected to server'));
		}
	}, /^stats|mem(ory)?|uptime|connected$/i, ['owner']);
};