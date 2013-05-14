/* jslint node: true */
/* global BOT_DIR, LIBS_DIR, MODULES_DIR */
'use strict';

//set main entry point path
global.BOT_DIR = require('path').resolve(__dirname, '..');
global.LIBS_DIR = require('path').resolve(BOT_DIR, 'libs');
global.MODULES_DIR = require('path').resolve(BOT_DIR, 'modules');

var vows = require('vows'),
	assert = require('assert');

var suite = vows.describe('Helpers');

//disable logger
require(LIBS_DIR + '/logger').enabled = false;

//isError assert
assert.isError = function(val) {
	assert.isObject(val);
	assert.instanceOf(val, Error);
};

var helpers = require(LIBS_DIR + '/helpers');

suite.addBatch({
	'When i format date': {
		topic: function() {
			return helpers.dateFormat(new Date(2222, 0, 13, 13, 14, 15, 0), 'YYYY-MM-DD-HH-II-SS');
		},
		'then i get it formated my way': function(ret) {
			assert.equal(ret, '2222-01-13-13-14-15');
		}
	},
	'When i wrap function': {
		topic: function() {
			return helpers.wrap(String.split, function(split, ch) {
				return this.split(ch);
			});
		},
		'then i get wrapped function': function(wr) {
			assert.isFunction(wr);
			assert.deepEqual(wr.call('1-2', '-'), ['1', '2']);
		}
	},
	'When i want unique values from array': {
		topic: function() {
			return helpers.unique(['test1', 'test2', 'test2', 'test3', 'pony', 'pony', 1, 2.3, 3, 1]);
		},
		'then i get it': function(ret) {
			assert.deepEqual(ret, ['test1', 'test2', 'test3', 'pony', 1, 2.3, 3]);
		}
	},
	'when i export some functions': {
		topic: function() {
			return helpers.export({}, {
				'test': 'derp',
				'test2': 'derp derp',
				'func': function() {
					return 'yep';
				},
				'func2': function() {
					return 'nope';
				}
			}, ['test', 'func']);
		},
		'then i get exported only the mentioned functions': function(ob) {
			assert.isObject(ob);
			assert.isUndefined(ob.test);
			assert.isUndefined(ob.test2);
			assert.isUndefined(ob.func2);
			assert.isFunction(ob.func);
			assert.equal(ob.func(), 'yep');
		}
	}
});

suite.export(module);