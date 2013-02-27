var logger = require(LIBS_DIR + '/logger');

function Server() {
	this.hostname = '';
	this.port = 6667;
	this.secured = false;

	this.currentNick = '';

	this.lastMsgTo = '';
	this.lastMsgTime = 0;
	this.lastMsg = '';
}

Server.prototype.valueOf = Server.prototype.toString = function() {
	return(this.secured ? 'tls://' : 'tcp://') + this.hostname + ':' + this.port;
};

exports.Server = Server;

function Source(irc, nick, user, host) {
	this.irc = irc;
	this.nick = nick;
	this.user = user;
	this.host = host;
	this.from = '';
}

Source.prototype.valueOf = Source.prototype.toString = function() {
	return this.nick + (this.host ? (this.user ? '!' + this.user : '') + '@' + this.host : '');
};

Source.fromString = function(irc, string) {
	var m = string.match(/^([^ !@]+)(?:(?:!([^ @]+))?@([^ ]+))?$/);
	if(m) {
		return new Source(irc, m[1], m[2], m[3]);
	} else {
		return null;
	}
};

Source.prototype.reply = Source.prototype.respond = function(msg) {
	if(this.from === this.irc.server.currentNick) { //if direct message
		this.irc.privMsg(this.nick, msg);
	} else {
		this.irc.privMsg(this.from || this.nick, msg);
	}
};

Source.prototype.mention = function(msg) {
	if(this.from === this.irc.server.currentNick) { //if direct message
		this.irc.privMsg(this.nick, msg);
	} else {
		this.irc.privMsg(this.from || this.nick, this.nick + ", " + msg);
	}
};

Source.prototype.action = function(msg) {
	if(this.from === this.irc.server.currentNick) { //if direct message
		this.irc.action(this.nick, msg);
	} else {
		this.irc.action(this.from || this.nick, msg);
	}
};

Source.prototype.tell = Source.prototype.message = function(msg) {
	this.irc.privMsg(this.nick, msg);
};

Source.prototype.note = Source.prototype.notice = function(msg) {
	this.irc.notice(this.nick, msg);
};


exports.Source = Source;

if(!String.prototype.trim) {
	String.prototype.trim = function() {
		return this.replace(/^\s+|\s+$/g, '');
	};
}

function IRC(dispatcher, config) {
	var irc = this;

	this.connected = 0;
	this.recvBuffer = '';
	this.tryNick = [];

	//irc client heartbeat ping - because the socket sometimes hangs
	irc._heartbeat = 0;
	if(typeof config.heartbeat === 'undefined') {
		config.heartbeat = 120000; //default heartbeat interval
	}
	if(config.heartbeat > 0) {
		this._heartbeat = setInterval(function() {
			if(irc.connected) {
				irc.send('PING :' + irc.server.hostname, true);
			}
		}, config.heartbeat);
	}

	this.connect = function(host, port, ssl) {
		irc.server = new Server();

		if(typeof host === 'string') {
			irc.server.hostname = host;
		}
		if(typeof port === 'number') {
			irc.server.port = port;
		}
		if(typeof ssl === 'boolean') {
			irc.server.secured = ssl;
		}
		if(typeof irc.server.port !== 'number') {
			irc.server.port = 6667;
		}

		//throw error when hostname not set
		if(typeof irc.server.hostname !== 'string' || irc.server.hostname.trim() === '') {
			throw new Error('Specify server hostname!');
		}

		logger.info('CONNECTING TO \'' + irc.server + '\'');

		var options = {
			allowHalfOpen: false,
			port: irc.server.port,
			host: irc.server.hostname
		};

		var socket = (irc.server.secured ? require('tls') : require('net')).connect(options, function() {
			irc.connected = true;

			logger.info('CONNECTED');

			if(typeof config.pass === 'string' && config.pass.trim() !== '') {
				irc.pass(config.pass);
			}

			if(config.nick instanceof Array && config.nick.length > 0) {
				irc.tryNick = config.nick.slice(0); //use clone
			} else {
				irc.tryNick = ['ponbot', 'ponybot', 'a_weird_pony', 'another_ponbot']; //defaults
				if(typeof config.nick === 'string') {
					irc.tryNick.unshift(config.nick);
				}
			}

			//set first nick
			irc.nick(irc.tryNick.shift()); //will take care of duplicates later
			//set username to nick if none given
			if(!config.username) {
				config.username = irc.server.currentNick;
			}

			//mode
			var mode = (config.wallops ? 4 : 0) + (config.invisible ? 8 : 0);

			//set the user
			irc.user(config.username, config.realname ? config.realname : config.username, mode);

			dispatcher.emit('irc/connect', irc);
		});

		socket.setEncoding('ascii');
		socket.setNoDelay(true);
		socket.setTimeout(0);

		socket.on('error', function(err) {
			dispatcher.emit.call(dispatcher, 'irc/error', err, irc);
			logger.error(err);
		});

		socket.on('close', function(had_error) {
			dispatcher.emit.call(dispatcher, 'irc/close', had_error, irc);
		});

		socket.on('data', function(data) {
			dispatcher.emit.call(dispatcher, 'irc/data', data, irc);
			irc.processData(data);
		});

		//bind basic socket commands
		irc.server.write = socket.write.bind(socket);
		irc.server.end = socket.end.bind(socket);

		return irc;
	};

	this.processData = function(data) {
		if(!irc.connected) {
			irc.connected = true;
		}

		var lines = (irc.recvBuffer + data).split("\r\n");
		for(var i = 0; i < lines.length - 1; i++) {
			irc.processLine(lines[i]);
		}
		irc.recvBuffer = lines[lines.length - 1];
	};

	this.processLine = function(line) {
		line = line.trim();

		if(line === '') {
			return;
		}

		var msg = irc.parseLine(line);

		if(!msg) {
			return;
		}

		var source, text;

		if(msg.prefix) {
			source = Source.fromString(irc, msg.prefix);
		}

		if(msg.command) {
			if(msg.command !== 'PING' && msg.command !== 'PONG') { //if not pin/pong then emit it
				dispatcher.emit('irc/RECV', line);
			}

			var args = msg.params + msg.trail;

			switch(msg.command) {
			case 'NOTICE':
				source.from = args[0] === irc.server.currentNick ? '' : args[0];
				text = args[1] ||  '';
				if(text.charCodeAt(0) === 1 && text.charCodeAt((text.length - 1)) === 1) {
					text = text.slice(1);
					text = text.slice(0, (text.length - 1));
					dispatcher.emit('irc/CTCP', source, text, 'notice');
				} else {
					dispatcher.emit('irc/NOTICE', source, text);
				}
				break;
			case 'PRIVMSG':
				source.from = args[0] === irc.server.currentNick ? '' : args[0];
				text = args[1] || '';
				if(text.charCodeAt(0) === 1 && text.charCodeAt((text.length - 1)) === 1) {
					text = text.slice(1);
					text = text.slice(0, (text.length - 1));
					dispatcher.emit('irc/CTCP', source, text, 'PRIVMSG', irc);
				} else {
					dispatcher.emit('irc/PRIVMSG', source, text, irc);
				}
				break;
			case 'PING':
				//pingpong heartbeat
				irc.send('PONG :' + args[0], true);
				break;
			case '443':
				//nick already in use
				if(irc.tryNick.length > 0) { //if we still have some nicks then try them
					irc.nick(irc.tryNick.shift());
				}
				break;
			default:
				dispatcher.emit('irc/' + msg.command.toUpperCase(), source, args);
			}
		}
	};

	this.parseLine = function(line) {
		var match = line.match(/^(:(\S+) )?(\S+)( (?!:)(.+?))?( :(.+))?$/);
		return match ? {
			'prefix': match[2],
			'command': match[3],
			'params': match[5] ? match[5].split(' ') : [],
			'trail': match[7]
		} : null;
	};



	this.send = function(msg, nolog) {
		if(!/\r\n$/.test(msg)) {
			msg += "\r\n";
		}

		if(!nolog) {
			dispatcher.emit('irc/SEND', msg.replace(/\r\n$/, ''));
		}

		irc.server.write(msg);
		return irc;
	};

	this.command = function(source, command) {
		var args = '';
		for(var i = 2; i < arguments.length - 1; i++) {
			args += ' ' + arguments[i];
		}

		command = command.toUpperCase();

		var hasLongArg = arguments.length > 2 && arguments[arguments.length - 1] !== null;

		return irc.send((source ? ':' + source.toString() + ' ' : '') + command + args + (hasLongArg ? ' :' + arguments[arguments.length - 1] : ''));
	};

	this.pass = function(pass) {
		return irc.command(null, 'PASS', pass, null);
	};

	this.nick = function(nick) {
		irc.server.currentNick = nick;
		return irc.command(null, 'NICK', nick, null);
	};

	this.user = function(username, realname, mode) {
		return irc.command(null, 'USER', username, mode, '*', realname);
	};

	this.join = function() {
		return irc.command(null, 'JOIN', Array.prototype.join.call(arguments, ','), null);
	};

	this.part = function() {
		return irc.command(null, 'PART', Array.prototype.join.call(arguments, ','), null);
	};

	this.names = function(channel) {
		return irc.command(null, 'NAMES', channel, null);
	};

	this.list = function() {
		return irc.command(null, 'LIST');
	};

	this.motd = function() {
		return irc.command(null, 'MOTD');
	};

	this.topic = function(channel, topic) {
		topic = topic || null;
		return irc.command(null, 'TOPIC', channel, topic);
	};

	this.quit = function(message) {
		return irc.command(null, 'QUIT', message || config.quitMessage || "Terminating...");
	};

	this.privMsg = function(nick, message) {
		var now = Date.now();

		if(message == lastMsg && now - lastMsgTime < (config.msgDelay || 5000)) {
			return;
		}

		irc.server.lastMsgTo = nick;
		irc.server.lastMsg = message;
		irc.server.lastMsgTime = now;

		return irc.command(null, 'PRIVMSG', nick, message);
	};

	this.notice = function(nick, message) {
		var now = Date.now();

		if(message == irc.server.lastMsg && now - irc.server.lastMsgTime < (config.msgDelay || 5000)) {
			return;
		}

		irc.server.lastMsgTo = nick;
		irc.server.lastMsg = message;
		irc.server.lastMsgTime = now;

		return irc.command(null, 'NOTICE', nick, message);
	};

	this.ctcp = function(nick, message, type) {
		type = typeof type == 'string' ? type.toLowerCase() : 'privmsg';
		if(type === 'notice') {
			return irc.notice(nick, String.fromCharCode(0x01) + message + String.fromCharCode(0x01));
		} else {
			return irc.privMsg(nick, String.fromCharCode(0x01) + message + String.fromCharCode(0x01));
		}
	};

	this.action = function(channel, action) {
		return irc.ctcp(channel, 'ACTION ' + action, 'privmsg');
	};
}

exports.IRC = IRC;

exports.init = function() {
	this.irc = new IRC(this.dispatcher, this.config);

	var module = this;

	this.on('init', function() {
		module.irc.connect(module.config.hostname || module.config.host || module.config.server, module.config.port, module.config.ssl || module.config.secured);
	});

	this.on('halt', function() {
		if(module.irc.connected) {
			module.irc.quit('Pony kill!');
		}
	});
};

exports.halt = function() {
	//stop heartbeat
	if(this.irc._heartbeat) {
		clearInterval(this.irc._heartbeat);
	}
};