/* jslint node: true */
/* global BOT_DIR, LIBS_DIR, MODULES_DIR */

//mocha globals
/* global describe, it, before, after, beforeEach, afterEach */

//strict
'use strict';

//set main entry point path
global.BOT_DIR = require('path').resolve(__dirname, '..');
global.LIBS_DIR = require('path').resolve(BOT_DIR, 'libs');
global.MODULES_DIR = require('path').resolve(BOT_DIR, 'modules');

//disable logger
require(LIBS_DIR + '/logger').enabled = false;

//load assert lib
var assert = require('chai').assert;

var helpers = require(LIBS_DIR + '/helpers');

describe('Helpers', function() {
	describe('#dateFormat', function() {
		it('gets day with DD', function() {
			assert.equal(helpers.dateFormat(new Date(2222, 0, 13, 13, 14, 15, 0), 'DD'), '13');
		});
		it('gets month with MM', function() {
			assert.equal(helpers.dateFormat(new Date(2222, 0, 13, 13, 14, 15, 0), 'MM'), '01');
		});
		it('gets year with YYYY and YY', function() {
			assert.equal(helpers.dateFormat(new Date(2222, 0, 13, 13, 14, 15, 0), 'YYYY'), '2222');
			assert.equal(helpers.dateFormat(new Date(2022, 0, 13, 13, 14, 15, 0), 'YY'), '22');
		});
		it('gets hours with HH', function() {
			assert.equal(helpers.dateFormat(new Date(2222, 0, 13, 13, 14, 15, 0), 'HH'), '13');
		});
		it('gets minutes with II', function() {
			assert.equal(helpers.dateFormat(new Date(2222, 0, 13, 13, 14, 15, 0), 'II'), '14');
		});
		it('gets seconds with SS', function() {
			assert.equal(helpers.dateFormat(new Date(2222, 0, 13, 13, 14, 15, 0), 'SS'), '15');
		});
		it('gets default formats date to YYYY-MM-DD HH:II:SS', function() {
			assert.equal(helpers.dateFormat(new Date(2222, 0, 13, 13, 14, 15, 0)), '2222-01-13 13:14:15');
		});
		it('formats date to DD.MM.YYYY', function() {
			assert.equal(helpers.dateFormat(new Date(2222, 0, 13, 13, 14, 15, 0), 'DD.MM.YYYY'), '13.01.2222');
		});
		it('formats date to HH:II:SS', function() {
			assert.equal(helpers.dateFormat(new Date(2222, 0, 13, 13, 14, 15, 0), 'HH:II:SS'), '13:14:15');
		});
	});

	describe('#wrap', function() {
		it('wraps function', function() {
			var wr = helpers.wrap(String.prototype.split, function(spl, ch) {
				return spl.call(this, ch);
			});

			assert.isFunction(wr);
			assert.deepEqual(wr.call('1-2', '-'), ['1', '2']);
		});
	});

	describe('#unique', function() {
		it('returns unique values from Array', function() {
			var ret = helpers.unique(['test1', 'test2', 'test2', 'test3', 'pony', 'pony', 1, 2.3, 3, 1]);
			assert.isArray(ret);
			assert.deepEqual(ret, ['test1', 'test2', 'test3', 'pony', 1, 2.3, 3]);
		});
	});

	describe('#export', function() {
		it('exports functions from object (source) to object (target)', function() {
			var ob = {};

			var ob2 = helpers.export(ob, {
				'test': 'derp',
				'test2': 'derp derp',
				'func': function() {
					return 'yep';
				},
				'func2': function() {
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