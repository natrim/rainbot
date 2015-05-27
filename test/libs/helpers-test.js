'use strict';

//load assert lib
var assert = require('chai').assert;

var helpers = require('./../../libs/helpers');

describe('Helpers', function () {
	describe('#dateFormat', function () {
		it('gets day with DD', function () {
			assert.equal(helpers.dateFormat(new Date(2222, 0, 13, 13, 14, 15, 0), 'DD'), '13');
		});
		it('gets month with MM', function () {
			assert.equal(helpers.dateFormat(new Date(2222, 0, 13, 13, 14, 15, 0), 'MM'), '01');
		});
		it('gets year with YYYY and YY', function () {
			assert.equal(helpers.dateFormat(new Date(2222, 0, 13, 13, 14, 15, 0), 'YYYY'), '2222');
			assert.equal(helpers.dateFormat(new Date(2022, 0, 13, 13, 14, 15, 0), 'YY'), '22');
		});
		it('gets hours with HH', function () {
			assert.equal(helpers.dateFormat(new Date(2222, 0, 13, 13, 14, 15, 0), 'HH'), '13');
		});
		it('gets minutes with II', function () {
			assert.equal(helpers.dateFormat(new Date(2222, 0, 13, 13, 14, 15, 0), 'II'), '14');
		});
		it('gets seconds with SS', function () {
			assert.equal(helpers.dateFormat(new Date(2222, 0, 13, 13, 14, 15, 0), 'SS'), '15');
		});
		it('gets default formats date to YYYY-MM-DD HH:II:SS', function () {
			assert.equal(helpers.dateFormat(new Date(2222, 0, 13, 13, 14, 15, 0)), '2222-01-13 13:14:15');
		});
		it('formats date to DD.MM.YYYY', function () {
			assert.equal(helpers.dateFormat(new Date(2222, 0, 13, 13, 14, 15, 0), 'DD.MM.YYYY'), '13.01.2222');
		});
		it('formats date to HH:II:SS', function () {
			assert.equal(helpers.dateFormat(new Date(2222, 0, 13, 13, 14, 15, 0), 'HH:II:SS'), '13:14:15');
		});
	});

	describe('#formatSizeUnits', function () {
		describe('formats bytes to human readable format', function () {
			it('handles zero or derp', function () {
				assert.equal(helpers.formatSizeUnits(0), '0 bytes');
				assert.equal(helpers.formatSizeUnits(-1), '0 bytes');
				assert.equal(helpers.formatSizeUnits(NaN), '0 bytes');
				assert.equal(helpers.formatSizeUnits('derp'), '0 bytes');
				assert.equal(helpers.formatSizeUnits(undefined), '0 bytes');
				assert.equal(helpers.formatSizeUnits(null), '0 bytes');
				assert.equal(helpers.formatSizeUnits({}), '0 bytes');
				assert.equal(helpers.formatSizeUnits([]), '0 bytes');
			});
			it('handles B', function () {
				assert.equal(helpers.formatSizeUnits(13), '13 bytes');
			});
			it('handles KB', function () {
				assert.equal(helpers.formatSizeUnits(13435), '13.12 KB');
			});
			it('handles MB', function () {
				assert.equal(helpers.formatSizeUnits(135125151), '128.87 MB');
			});
			it('handles GB', function () {
				assert.equal(helpers.formatSizeUnits(135125243453), '125.85 GB');
			});
		});
	});

	describe('#formatTime', function () {
		it('formats number of seconds to human readable string', function () {
			assert.equal(helpers.formatTime('derp'), 'no idea');

			assert.equal(helpers.formatTime(0), 'less than a second');
			assert.equal(helpers.formatTime(1), '1 second');
			assert.equal(helpers.formatTime(13), '13 seconds');
			assert.equal(helpers.formatTime(73), '1 minute and 13 seconds');
			assert.equal(helpers.formatTime(133), '2 minutes and 13 seconds');
			assert.equal(helpers.formatTime(6133), '1 hour and 42 minutes');
			assert.equal(helpers.formatTime(18133), '5 hours and 2 minutes');
			assert.equal(helpers.formatTime(118133), '1 day, 8 hours and 48 minutes');
			assert.equal(helpers.formatTime(4818133), '55 days, 18 hours and 22 minutes');
		});
	});

	describe('#wrap', function () {
		it('wraps function', function () {
			var wr = helpers.wrap(String.prototype.split, function (spl, ch) {
				return spl.call(this, ch);
			});

			assert.isFunction(wr);
			assert.deepEqual(wr.call('1-2', '-'), ['1', '2']);
		});
	});

	describe('#unique', function () {
		it('returns unique values from Array', function () {
			var ret = helpers.unique(['test1', 'test2', 'test2', 'test3', 'pony', 'pony', 1, 2.3, 3, 1]);
			assert.isArray(ret);
			assert.deepEqual(ret, ['test1', 'test2', 'test3', 'pony', 1, 2.3, 3]);
		});
	});

	describe('#export', function () {
		it('exports functions from object (source) to object (target)', function () {
			var ob = {};

			var ob2 = helpers.export(ob, {
				'test': 'derp',
				'test2': 'derp derp',
				'func': function () {
					return 'yep';
				},
				'func2': function () {
					return 'nope';
				}
			}, ['test', 'func']);

			assert.deepEqual(ob, ob2);
			assert.isUndefined(ob.test);
			assert.isUndefined(ob.test2);
			assert.isUndefined(ob.func2);
			assert.isFunction(ob.func);
			assert.equal(ob.func(), 'yep');
		});
	});
});
