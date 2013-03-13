var logger = require(LIBS_DIR + '/logger');

var Server = require('./irc/server').Server;
var Source = require('./irc/source').Source;

//trim some strings
if (!String.prototype.trim) {
	String.prototype.trim = function() {
		return this.replace(/^\s+|\s+$/g, '');
	};
}

function IRC(dispatcher, config) {
	this.connected = 0;
	this.recvBuffer = '';
	this.tryNick = [];
	this.server = new Server();

	//irc client heartbeat ping - because the socket sometimes hangs
	this._heartbeat = 0;
	if (typeof config.heartbeat === 'undefined') {
		config.heartbeat = 120000; //default heartbeat interval
	}
	if (config.heartbeat > 0) {
		var irc = this;
		this._heartbeat = setInterval(function() {
			if (irc.connected) {
				irc.send('PING :' + irc.server.hostname, true);
			}
		}, config.heartbeat);
	}

	this.config = config;
	this.dispatcher = dispatcher;
}


IRC.prototype.connect = function(host, port, ssl) {
	if (this.connected) {
		logger.warn('Already connected.');
		return this;
	}

	if (typeof host === 'string') {
		this.server.hostname = host;
	}
	if (typeof port === 'number') {
		this.server.port = port;
	}
	if (typeof ssl === 'boolean') {
		this.server.secured = ssl;
	}
	if (typeof this.server.port !== 'number') {
		this.server.port = 6667;
	}

	//throw error when hostname not set
	if (typeof this.server.hostname !== 'string' || this.server.hostname.trim() === '') {
		throw new Error('Specify server hostname!');
	}

	if (this.config.nick instanceof Array && this.config.nick.length > 0) {
		this.tryNick = this.config.nick.slice(0); //use clone
	} else {
		this.tryNick = ['ponbot', 'ponybot', 'a_weird_pony', 'another_ponbot']; //defaults
		if (typeof this.config.nick === 'string') {
			this.tryNick.unshift(this.config.nick);
		}
	}

	logger.info('CONNECTING TO \'' + this.server + '\'');

	var options = {
		allowHalfOpen: false,
		port: this.server.port,
		host: this.server.hostname
	};

	var irc = this;
	var config = this.config;
	var dispatcher = this.dispatcher;

	var socket = (this.server.secured ? require('tls') : require('net')).connect(options, function() {
		irc.connected = true;

		logger.info('CONNECTED');

		if (typeof config.pass === 'string' && config.pass.trim() !== '') {
			irc.pass(config.pass);
		}

		//try first nick
		irc.nick(irc.tryNick.shift());

		//set username to nick if none given
		if (!config.username) {
			config.username = irc.server.currentNick;
		}

		//mode
		var mode = (config.wallops ? 4 : 0) + (config.invisible ? 8 : 0);

		//set the user
		irc.user(config.username, config.realname ? config.realname : config.username, mode);

		//emit the connect event on next tick - just for fun
		process.nextTick(function() {
			dispatcher.emit('irc/connect', irc);
		});
	});

	socket.setEncoding('ascii');
	socket.setNoDelay(true);
	socket.setTimeout(0);

	socket.on('error', function(err) {
		dispatcher.emit.call(dispatcher, 'irc/error', err, irc);
		logger.error(err);
	});

	socket.on('timeout', function() {
		irc.connected = false;
		dispatcher.emit.call(dispatcher, 'irc/timeout', irc);
	});

	socket.on('close', function(had_error) {
		irc.connected = false;
		dispatcher.emit.call(dispatcher, 'irc/disconnect', had_error, irc);
		logger.info('DISCONNECTED' + (had_error ? ' WITH ERROR' : ''));
	});

	socket.on('data', function(data) {
		dispatcher.emit.call(dispatcher, 'irc/data', data, irc);
		irc.processData(data);
	});

	//bind basic socket commands
	this.server.write = socket.write.bind(socket);
	this.server.end = socket.end.bind(socket);

	this.server.socket = socket;

	return this;
};

IRC.prototype.processData = function(data) {
	if (!this.connected) {
		this.connected = true;
	}

	var lines = (this.recvBuffer + data).split("\r\n");
	for (var i = 0; i < lines.length - 1; i++) {
		this.processLine(lines[i]);
	}
	this.recvBuffer = lines[lines.length - 1];
};

IRC.prototype.processLine = function(line) {
	line = line.trim();

	if (line === '') {
		return;
	}

	var msg = this.parseLine(line);

	if (!msg) {
		return;
	}

	var source, text;

	if (msg.prefix) {
		source = Source.fromString(msg.prefix);
		Object.defineProperty(source, 'irc', {
			value: this
		});
	}

	if (msg.command) {
		logger.debug('[RECV]> ' + line);

		if (msg.command !== 'PING' && msg.command !== 'PONG') { //if not ping/pong then emit it
			this.dispatcher.emit('irc/RECV', line);
		}

		var args = msg.params.slice(0);
		args.push(msg.trail);

		var handled = false;

		switch (msg.command) {
			case 'NOTICE':
				source.channel = args[0] === this.server.currentNick ? '' : args[0];
				text = args[1] || '';
				if (text.charCodeAt(0) === 1 && text.charCodeAt((text.length - 1)) === 1) {
					text = text.slice(1);
					text = text.slice(0, (text.length - 1));
					if (this.processCTCP(source, text, 'notice')) this.dispatcher.emit('irc/CTCP', source, text, 'notice', this);
				} else {
					this.dispatcher.emit('irc/NOTICE', source, text, this);
				}

				handled = true;
				break;
			case 'PRIVMSG':
				source.channel = args[0] === this.server.currentNick ? '' : args[0];
				text = args[1] || '';
				if (text.charCodeAt(0) === 1 && text.charCodeAt((text.length - 1)) === 1) {
					text = text.slice(1);
					text = text.slice(0, (text.length - 1));
					if (this.processCTCP(source, text, 'privmsg')) this.dispatcher.emit('irc/CTCP', source, text, 'privmsg', this);
				} else {
					this.dispatcher.emit('irc/PRIVMSG', source, text, this);
				}

				handled = true;
				break;
			case 'PING':
				//pingpong heartbeat
				this.send('PONG :' + args[0], true);
				handled = true;
				break;
			case '001':
				//autojoin
				this.tryAutoJoin();
				break;
			case '433':
				//nick already in use
				if (this.tryNick.length > 0) { //if we still have some nicks then try them
					this.nick(this.tryNick.shift());
				} else {
					logger.error('No free nick found!');
					this.quit('Nooo...');
				}
				break;
		}

		if (!handled) this.dispatcher.emit('irc/' + msg.command.toUpperCase(), source, args, this);
	}
};

IRC.prototype.parseLine = function(line) {
	var match = line.match(/^(:(\S+) )?(\S+)( (?!:)(.+?))?( :(.+))?$/);
	return match ? {
		'prefix': match[2],
		'command': match[3],
		'params': match[5] ? match[5].split(' ') : [],
		'trail': match[7]
	} : null;
};


IRC.prototype.send = function(msg, nolog) {
	if (!this.connected) { //dont write if no connection
		return this;
	}

	if (!/\r\n$/.test(msg)) {
		msg += "\r\n";
	}

	if (!nolog) {
		this.dispatcher.emit('irc/SEND', msg.replace(/\r\n$/, ''));
	}

	logger.debug('[SEND]> ' + msg.replace(/\r\n$/, ''));

	if (msg.search(/^QUIT /) !== -1) {
		this.connected = false;
		this.server.end(msg);
	} else {
		this.server.write(msg);
	}

	return this;
};

IRC.prototype.command = function(source, command) {
	var args = '';
	for (var i = 2; i < arguments.length - 1; i++) {
		args += ' ' + arguments[i];
	}

	command = command.toUpperCase();

	var hasLongArg = arguments.length > 2 && arguments[arguments.length - 1] !== null;

	return this.send((source ? ':' + source.toString() + ' ' : '') + command + args + (hasLongArg ? ' :' + arguments[arguments.length - 1] : ''));
};

IRC.prototype.pass = function(pass) {
	return this.command(null, 'PASS', pass, null);
};

IRC.prototype.nick = function(nick) {
	this.server.currentNick = nick;
	return this.command(null, 'NICK', nick, null);
};

IRC.prototype.user = function(username, realname, mode) {
	return this.command(null, 'USER', username, mode, '*', realname);
};

IRC.prototype.join = function() {
	return this.command(null, 'JOIN', Array.prototype.join.call(arguments, ','), null);
};

IRC.prototype.part = function() {
	return this.command(null, 'PART', Array.prototype.join.call(arguments, ','), null);
};

IRC.prototype.names = function(channel) {
	return this.command(null, 'NAMES', channel, null);
};

IRC.prototype.topic = function(channel, topic) {
	topic = topic || null;
	return this.command(null, 'TOPIC', channel, topic);
};

IRC.prototype.quit = function(message) {
	return this.command(null, 'QUIT', message || this.config.quitMessage || "Terminating...");
};

IRC.prototype.privMsg = function(nick, message) {
	var now = Date.now();

	if (message === this.server.lastMsg && now - this.server.lastMsgTime < (this.config.msgDelay || 5000)) {
		return;
	}

	this.server.lastMsgTo = nick;
	this.server.lastMsg = message;
	this.server.lastMsgTime = now;

	return this.command(null, 'PRIVMSG', nick, message);
};

IRC.prototype.notice = function(nick, message) {
	var now = Date.now();

	if (message === this.server.lastMsg && now - this.server.lastMsgTime < (this.config.msgDelay || 5000)) {
		return;
	}

	this.server.lastMsgTo = nick;
	this.server.lastMsg = message;
	this.server.lastMsgTime = now;

	return this.command(null, 'NOTICE', nick, message);
};

IRC.prototype.ctcp = function(nick, message, type) {
	type = typeof type === 'string' ? type.toLowerCase() : 'privmsg';
	if (type === 'notice') {
		return this.notice(nick, String.fromCharCode(0x01) + message + String.fromCharCode(0x01));
	} else {
		return this.privMsg(nick, String.fromCharCode(0x01) + message + String.fromCharCode(0x01));
	}
};

IRC.prototype.action = function(channel, action) {
	return this.ctcp(channel, 'ACTION ' + action, 'privmsg');
};

//returning false means no CTCP event
IRC.prototype.processCTCP = function(source, msg, type) {
	type = typeof type === 'string' ? type.toLowerCase() : 'privmsg';
	if (type === 'privmsg') {
		var parts = msg.split(' ');
		switch (parts[0]) {
			case 'VERSION':
				this.ctcp(source.nick, 'VERSION Friendship Powered PonyBot', 'notice');
				return false;
			case 'TIME':
				this.ctcp(source.nick, 'TIME ' + (new Date()).toUTCString(), 'notice');
				return false;
			case 'PING':
				this.ctcp(source.nick, msg, 'notice');
				return false;
		}
	}
	return true;
};

IRC.prototype.tryAutoJoin = function() {
	var channels;
	if (typeof this.config.channel === 'string') {
		channels = this.config.channel.split(',');
	} else if (this.config.channel instanceof Array) {
		channels = this.config.channel;
	} else {
		return;
	}

	this.join.apply(this, channels.map(function(c) {
		if (c.search(/^#/) === -1) c = '#' + c;
		return c.trim();
	}));
};

exports.IRC = IRC;

exports.init = function(reload) {
	if (reload) return; //do nothing on context reload

	this.irc = new IRC(this.dispatcher, this.config);

	var module = this;

	//export functions
	require(LIBS_DIR + '/helpers').export(module, module.irc, ['command', 'join', 'part', 'connect', 'quit', 'nick', 'ctcp', 'action', 'notice', 'privMsg', 'names', 'topic']);
	Object.defineProperty(this, 'connected', {
		get: function() {
			return module.irc.connected;
		}
	});

	//connect to server on bot init
	this.on('init', function() {
		module.irc.connect(module.config.hostname || module.config.host || module.config.server, module.config.port, module.config.ssl || module.config.secured);
	});

	//quit irc on bot halt
	this.on('halt', function() {
		if (module.irc.server.socket) {
			if (module.irc.server.secured) {
				module.irc.server.socket.removeAllListeners('secureConnect');
			} else {
				module.irc.server.socket.removeAllListeners('connect');
			}
		}

		if (module.irc.connected) {
			module.irc.quit('Pony kill!');
		}
	});
};

exports.halt = function(reload) {
	if (reload) return; //do nothing on context reload

	//stop heartbeat
	if (this.irc._heartbeat) {
		clearInterval(this.irc._heartbeat);
	}
	//quit on module halt
	if (this.irc.connected) {
		this.irc.quit('Pony going to sleep...');
	}
};