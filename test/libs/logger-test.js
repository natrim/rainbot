'use strict';

//load assert lib
var assert = require('chai').assert;

var logger = require(LIBS_DIR + '/logger');

describe('Logger', function () {
	var loggr;
	beforeEach(function () {
		loggr = new logger.Logger();
	});

	describe('#log', function () {
		it('logs message', function () {
			loggr.onAfterLog = function (l, msg) {
				assert.equal(msg, 'PONY!');
				assert.equal(this.lastMessage, 'PONY!');
			};

			assert.isTrue(loggr.log('PONY!'));
		});

		it('does\'nt log if #enabled is false', function () {
			loggr.enabled = false;
			assert.isFalse(loggr.log('NOPONY!'));
		});

		it('logs Error message with level', function () {
			loggr.onAfterLog = function (l, msg) {
				assert.equal(msg, 'DERP');
				assert.equal(this.lastMessage, logger.colorize.yellow('[WARNING] ') + 'DERP');
			};
			assert.isTrue(loggr.warn(new Error('DERP')));
		});

		it('logs Error message without level', function () {
			loggr.onAfterLog = function (l, msg) {
				assert.equal(msg, 'DERP');
				assert.equal(this.lastMessage, logger.colorize.red('[ERROR] ') + 'DERP');
			};
			assert.isTrue(loggr.log(new Error('DERP')));
		});

		it('runs onBeforeLog', function (done) {
			loggr.onBeforeLog = function () {
				done();
			};

			loggr.log('PON PONY');
		});

		it('runs onAfterLog', function (done) {
			loggr.onAfterLog = function () {
				done();
			};

			loggr.log('PON PONY');
		});

		it('stops logging message if onBeforeLog returns false', function () {
			loggr.onBeforeLog = function () {
				return true;
			};
			loggr.onAfterLog = function (l) {
				assert.equal(this.lastMessage, '');
				assert.isTrue(l);
			};
			loggr.log('STOP PONIES!');
		});

		it('does\'nt log debug message if #debugging is false', function () {
			loggr.onAfterLog = function () {
				assert.equal(this.lastMessage, '');
			};
			loggr.debugging = false;
			loggr.debug('Twilie!');
		});

		it('does log debug message if #debugging is true', function () {
			loggr.onAfterLog = function () {
				assert.isTrue(this.debugging);
				assert.equal(this.lastMessage, logger.colorize.magenta('[DEBUG] ') + 'Twilie!');
			};
			loggr.debugging = true;
			loggr.debug('Twilie!');
		});
	});

	describe('#error', function () {
		it('logs message with error level', function (done) {
			loggr.log = function (m, lv) {
				if (lv === 'error') {
					done();
				}
			};
			loggr.error();
		});
	});

	describe('#warn', function () {
		it('logs message with warn level', function (done) {
			loggr.log = function (m, lv) {
				if (lv === 'warn') {
					done();
				}
			};
			loggr.warn();
		});
	});

	describe('#info', function () {
		it('logs message with info level', function (done) {
			loggr.log = function (m, lv) {
				if (lv === 'info') {
					done();
				}
			};
			loggr.info();
		});
	});

	describe('#debug', function () {
		it('logs message with debug level', function (done) {
			loggr.log = function (m, lv) {
				if (lv === 'debug') {
					done();
				}
			};
			loggr.debug();
		});
	});

	describe('#colorize', function () {
		it('wraps string in console color codes', function () {
			assert.equal(logger.colorize.red('RED'), '\x1B[31mRED\x1B[39m');
			assert.equal(logger.colorize.bold('BOLD'), '\x1B[1mBOLD\x1B[22m');
			assert.isUndefined(logger.colorize.wrongcolorname);
		});
	});
});