/**
 * Countdown airing time of tv series
 */

/* jslint node: true */
/* global BOT_DIR, LIBS_DIR, MODULES_DIR */
'use strict';

var time = require('time');
var http = require('http');
var formattedDate = require(LIBS_DIR + '/helpers').dateFormat;

function parseDecimal(v) {
    return parseInt(v, 10);
}

function TvCountDownFactory(event, what, serial) {
    http.get({
        host: 'tvcountdown.com',
        path: '/s/' + what
    }, function(res) {
        var data = '';
        res.setEncoding('utf8');
        res.on('data', function(chunk) {
            if (chunk) {
                data += chunk;
            }
        }).on('end', function() {
            var dnow = new time.Date().getTime();
            var countdowndates = data.match(/var[ ]+timestamp[ ]?=[ ]?\[\'(.*)\'\]\;/);
            var episodenames = data.match(/var[ ]+episode[ ]?=[ ]?\[\'(.*)\'\]\;/);
            if (countdowndates !== null) {
                var episode = [];
                if (episodenames !== null) {
                    episode = eval(episodenames[0] + ' episode'); //eval in strict mode to get the last variable
                }

                var timestamp = eval(countdowndates[0] + ' timestamp'); //eval in strict mode to get the last variable
                var airing, epname = serial,
                    eptext = '';
                for (var i = 0; i < timestamp.length; i++) {
                    airing = new time.Date(timestamp[i], 'America/New_York').getTime();
                    if (airing > dnow) {
                        var name = data.match(/<h2 id="show-title">(.*)<\/h2>/);
                        if (name !== null) {
                            epname = name[1];
                        }
                        if (typeof episode[i] === 'string') {
                            eptext = episode[i].split('_').pop();
                        }
                        event.emit('countdown/FOUND' + what, airing, epname, eptext, dnow);
                        return;
                    }
                }
            }

            event.emit('countdown/NOTFOUND' + what);
        });
    }).on('error', function(e) {
        event.emit('countdown/ERROR' + what, 'i got error while counting down!');
    });
}

function MLPCountDownFactory(event, what) {
    http.get({
        host: 'ponycountdown.com',
        path: '/api.js'
    }, function(res) {
        var data = '';
        res.setEncoding('utf8');
        res.on('data', function(chunk) {
            if (chunk) {
                data += chunk;
            }
        }).on('end', function() {
            var dnow = new time.Date().getTime();
            var ponycountdowndates = data.match(new RegExp('([A-Za-z]+)([ \n\r\t]+)([0-9]+)([,]+)([ \n\r\t]+)([0-9]+)([ \n\r\t]+)([0-9]+)([:]+)([0-9]+)([:]+)([0-9]+)([ \n\r\t]?)([A-Z0-9+]*)([ \n\r\t]?)([)(A-Z]*)', 'g'));
            if (ponycountdowndates !== null) {
                var episodesnames = data.match(new RegExp('[,]{1}[0-9]+[,]{1}[0-9]+[,]{1}"{1}([^"]*)"{1}', 'g'));
                var pt, eptext = '';
                for (var i = 0; i < ponycountdowndates.length; i++) {
                    pt = new time.Date(ponycountdowndates[i], 'UTC').getTime();
                    if (pt > dnow) {
                        if (typeof episodesnames[i] === 'string') {
                            var tep = episodesnames[i].split(',');
                            eptext = 'S' + (tep[1] < 10 ? '0' + tep[1] : tep[1]) + 'E' + (tep[2] < 10 ? '0' + tep[2] : tep[2]) + ' (' + tep[3].replace(/"/g, '') + ')';
                        }

                        event.emit('countdown/FOUND' + what, pt, 'MLP:FiM', eptext, dnow);
                        return;
                    }
                }
            }

            event.emit('countdown/NOTFOUND' + what);
        });
    }).on('error', function(e) {
        event.emit('countdown/ERROR' + what, 'i got error while counting my little ponies!');
    });
}

function Countdown(dispatcher) {
    this.event = dispatcher;

    this.checkEvery = 3600000;
    this.dateFormat = 'DD.MM.YYYY HH:II TZ';
    this.defaultSerial = 'My Little Pony';
    this.cache = {};
    this.aliases = {
        'got': 'Game Of Thrones',
        'gots': 'Game Of Thrones',
        'reddwarf': 'Red Dwarf',
        'dwarf': 'Red Dwarf',
        'rd': 'Red Dwarf',
        'bbt': 'The Big Bang Theory',
        'tbbt': 'The Big Bang Theory',
        'mlp': 'My Little Pony',
        'mlpfim': 'My Little Pony',
        'mlp:fim': 'My Little Pony',
        'My Little Pony: Friendship is Magic': 'My Little Pony',
        'himym': 'How I Met Your Mother'
    };
    this.countdownFactories = {
        'my-little-pony': MLPCountDownFactory,
        'default': TvCountDownFactory
    };
}

Countdown.prototype.formatCountdown = function(airing, serial, episode, now) {
    if (airing === 0) {
        return 'i have no idea when next episode ' + (serial ? 'of \'' + serial + '\' ' : '') + 'airs';
    }

    now = now || new time.Date().getTime();

    var ttnextep = (airing / 1000) - (now / 1000);

    var days = Math.floor(ttnextep / 86400);
    var hours = Math.floor(ttnextep / 3600 - days * 24);
    var minutes = Math.floor(ttnextep / 60 - days * 1440 - hours * 60);
    var seconds = Math.floor(ttnextep - days * 86400 - hours * 3600 - minutes * 60);

    var returnstr = 'next episode ' + (serial ? 'of \'' + serial + (episode ? ' - ' + episode : '') + '\' ' : '') + 'airs in ';
    if (days) {
        returnstr += (days) + ' day' + (days == 1 ? '' : 's') + ', ' + (hours) + ' hour' + (hours == 1 ? '' : 's') + ' and ' + (minutes) + ' minute' + (minutes == 1 ? '' : 's');
    } else if (hours) {
        returnstr += (hours) + ' hour' + (hours == 1 ? '' : 's') + ' and ' + (minutes) + ' minute' + (minutes == 1 ? '' : 's');
    } else if (minutes) {
        returnstr += (minutes) + ' minute' + (minutes == 1 ? '' : 's') + ' and ' + (seconds) + ' second' + (seconds == 1 ? '' : 's');
    } else if (seconds) {
        returnstr += (seconds) + ' second' + (seconds == 1 ? '' : 's');
    } else {
        returnstr += 'less than a second';
    }

    returnstr += ' - ' + (formattedDate(new time.Date(airing), this.dateFormat));

    return returnstr;
};

Countdown.prototype.getSerial = function(word) {
    if (typeof word !== 'string') {
        return false;
    }

    var alias = word;
    if (typeof this.aliases[word.toLowerCase()] !== 'undefined') {
        alias = this.aliases[word.toLowerCase()];
    }

    if (alias instanceof Array) {
        return alias.slice(0); //return clone
    }

    return alias;
};

Countdown.prototype.getSlug = function(word) {
    if (typeof word !== 'string') {
        return false;
    }

    return word.toLowerCase().replace(/[^a-z0-9_]+/g, '-').replace(/^-|-$/g, '');
};

Countdown.prototype.createReplyWithCountdown = function(source, serial) {
    var cd = this;

    if (serial instanceof Array) {
        var broadcast = function() {
            var w = cd.getSerial(serial.pop());

            if (w) {
                cd.createReplyWithCountdown(source, w);
            }

            if (serial.length > 0) {
                setTimeout(broadcast, 1000);
            }
        };

        setTimeout(broadcast, 100);
        return;
    }

    var now = new time.Date().getTime();
    var what = cd.getSlug(serial);

    if (!what) {
        source.mention('i failed to get what you wanted...');
        return;
    }

    if (typeof cd.cache[what] === 'undefined') {
        cd.cache[what] = {
            name: serial,
            episode: '',
            date: 0,
            lastCheck: 0
        };
    }

    if (((now - cd.cache[what].lastCheck) > cd.checkEvery) || ((cd.cache[what].date - now) < 0)) { //if itz time for update or time in past
        var found = function(airing, name, episode, now) {
            cd.cache[what].date = airing;
            cd.cache[what].lastCheck = now || new time.Date().getTime();
            if (name && name !== '') {
                cd.cache[what].name = name;
            }
            if (episode) {
                cd.cache[what].episode = episode;
            } else {
                cd.cache[what].episode = '';
            }

            source.mention(cd.formatCountdown(cd.cache[what].date, cd.cache[what].name, cd.cache[what].episode, now));

            cd.event.removeListener('countdown/ERROR' + what, error);
            cd.event.removeListener('countdown/NOTFOUND' + what, notfound);
        };

        var notfound = function() {
            var name = cd.cache[what].name;
            source.mention('i did not found next episode' + (name ? ' of \'' + name + '\'' : ''));

            cd.event.removeListener('countdown/FOUND' + what, found);
            cd.event.removeListener('countdown/ERROR' + what, error);
        };

        var error = function(custom_message) {
            if (custom_message) {
                source.mention(custom_message);
            } else {
                source.mention('i got error');
            }

            cd.event.removeListener('countdown/FOUND' + what, found);
            cd.event.removeListener('countdown/NOTFOUND' + what, notfound);
        };

        cd.event.once('countdown/FOUND' + what, found);
        cd.event.once('countdown/NOTFOUND' + what, notfound);
        cd.event.once('countdown/ERROR' + what, error);

        if (typeof cd.countdownFactories[what] !== 'undefined') {
            cd.countdownFactories[what](cd.event, what, cd.cache[what].name);
        } else {
            cd.countdownFactories['default'](cd.event, what, cd.cache[what].name);
        }
    } else {
        source.mention(cd.formatCountdown(cd.cache[what].date, cd.cache[what].name, cd.cache[what].episode, now));
    }
};

Countdown.prototype.command = function(source, args, text, command) {
    var word = null;

    if (args.length > 0) {
        word = this.getSerial(args.join(' '));
    } else if (typeof this.aliases[('personalized-' + source.nick).toLowerCase()] !== 'undefined') {
        word = this.getSerial('personalized-' + source.nick);
    } else if (command === 'cd') {
        word = this.getSerial(this.defaultSerial);
    } else {
        source.mention('tell me what serial should i count down!');
        return;
    }

    if (word) {
        this.createReplyWithCountdown(source, word);
    } else {
        source.mention('i failed to get what you wanted...');
    }
};

Countdown.prototype.actions = function(source, args) {
    var mode = args[3];
    if (mode === 'alias' || mode === 'default') {
        if (args[5]) {
            var tmp = args[5].split(' ');
            var nick = tmp.shift();
            var alias = tmp.join(' ');
            if (alias === 'null' || alias === 'false') {
                delete this.aliases[((mode === 'default' ? 'personalized-' : '') + nick).toLowerCase()];
                source.respond(mode === 'default' ? 'ok, personalized default removed' : 'ok, alias removed');
            } else {
                tmp = alias.match(/^\[(.*)\]$/);

                if (tmp !== null) {
                    //no need for this.getSerial as itz array and will be done just in time
                    this.aliases[((mode === 'default' ? 'personalized-' : '') + nick).toLowerCase()] = tmp[1].replace(/"|'/g, '').split(',');
                } else {
                    this.aliases[((mode === 'default' ? 'personalized-' : '') + nick).toLowerCase()] = this.getSerial(alias);
                }

                source.respond(mode === 'default' ? 'ok, personalized default changed' : 'ok, alias changed');
            }
        } else {
            source.mention('i have no idea what do u mean with that, give me more...');
        }
    } else {
        source.mention('i don\'t know what to do with that...');
    }
};

exports.init = function() {
    this.countdown = new Countdown(this.dispatcher);

    if (typeof this.config.checkEvery !== 'undefined') {
        this.countdown.checkEvery = this.config.checkEvery;
    }

    if (typeof this.config.defaultSerial !== 'undefined') {
        this.countdown.defaultSerial = this.config.defaultSerial;
    }

    if (typeof this.config.dateFormat !== 'undefined') {
        this.countdown.dateFormat = this.config.dateFormat;
    }

    var c = this.require('controls');
    c.addCommand('cd', this.countdown.command.bind(this.countdown));
    c.addCommand('tv', this.countdown.command.bind(this.countdown));

    c.addAction('countdown', this.countdown.actions.bind(this.countdown), /^countdown(([ ]+(\w+)([ ]+(.*)|))*)/, ['owner', 'operators']);
};

exports.halt = function(bot, dispatcher, cd) {
    var c = this.require('controls');
    c.removeCommand('cd');
    c.removeCommand('tv');
    c.removeAction('countdown');
};