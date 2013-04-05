/**
 * Twitter reader
 */

/* jslint node: true */
/* global BOT_DIR, LIBS_DIR, MODULES_DIR */
'use strict';

var https = require('https');
var df = require(LIBS_DIR + '/helpers').dateFormat;

function Twitter(config) {
    this.config = config;
}

Twitter.prototype.getTweet = function(source, user, number) {
    var wait = this.config.waitBetweenMessages;
    var dateFormat = this.config.dateFormat;

    https.get({
        host: 'api.twitter.com',
        path: '/1/statuses/user_timeline.json?include_rts=1&screen_name=' + user + '&count=' + number
    }, function(res) {
        var data = '';
        res.setEncoding('utf8');
        res.on('data', function(chunk) {
            if (chunk) {
                data += chunk;
            }
        }).on('end', function() {
            data = JSON.parse(data);

            if (typeof data.error !== 'undefined') {
                source.mention('i got bird error: ' + data.error);
                return;
            }

            if (typeof data.errors !== 'undefined') {
                data.errors.map(function(err) {
                    source.mention('i got twitter error: ' + err.message);
                });
                return;
            }

            if (data.length <= 0) {
                source.mention('i found no tweets');
                return;
            }

            var i = 0;
            var writeIt = function() {
                var date = new Date(data[i].created_at);
                source.mention(user + ' on ' + df(date, dateFormat) + ' tweeted: ' + data[i].text);

                i++;
                if (i < data.length) {
                    setTimeout(writeIt, wait);
                }
            };

            writeIt();

        });

    }).on('error', function(e) {
        source.mention('i got error: ' + e.message);
    });
};

Twitter.prototype.respond = function(source, argv) {
    var user = this.config.defaultUser;
    var number = 1;

    if (argv[0]) {
        if (/^[0-9]+$/.test(argv[0])) {
            number = argv[0];
        } else if (/[a-zA-Z0-9_]{1,15}/.test(argv[0])) {
            user = argv[0];
        }
    }

    if (argv[1]) {
        if (/^[0-9]+$/.test(argv[1])) {
            number = argv[1];
        }
    }

    if (number > this.config.maxTweets) {
        source.mention('i can catch only last ' + this.config.maxTweets + ' birds at once!');
        number = this.config.maxTweets;
    }

    source.action('is catching' + (number > 1 ? ' ' + number : '') + ' blue bird' + (number > 1 ? 's' : '') + ' with message from \'' + user + '\'!');
    this.getTweet(source, user, number);
};

exports.init = function() {
    if (typeof this.config.maxTweets === 'undefined') {
        this.config.maxTweets = 5;
    }

    if (typeof this.config.waitBetweenMessages === 'undefined') {
        this.config.waitBetweenMessages = 1000;
    }

    if (typeof this.config.defaultUser === 'undefined') {
        this.config.defaultUser = 'MyLittlePony';
    }

    if (typeof this.config.dateFormat === 'undefined') {
        this.config.dateFormat = 'DD.MM.YYYY HH:II:SS';
    }

    this.twitter = new Twitter(this.config);

    this.addCommand('tweet', this.twitter.respond.bind(this.twitter));
    this.addCommand('twitter', this.twitter.respond.bind(this.twitter));
};