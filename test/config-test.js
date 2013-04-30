/* jslint node: true */
/* global BOT_DIR, LIBS_DIR, MODULES_DIR */
'use strict';

//set main entry point path
global.BOT_DIR = require('path').resolve(__dirname, '..');
global.LIBS_DIR = require('path').resolve(BOT_DIR, 'libs');
global.MODULES_DIR = require('path').resolve(BOT_DIR, 'modules');

var vows = require('vows'),
	assert = require('assert');

var suite = vows.describe('Config class');

//disable logger
require(LIBS_DIR + '/logger').enabled = false;

//isError assert
assert.isError = function(val) {
	assert.isObject(val);
	assert.instanceOf(val, Error);
};

var Config = require(LIBS_DIR + '/config').Config;

suite.addBatch({
	'When i construct class': {
		topic: function() {
			return new Config();
		},
		'then i get Config': function(c) {
			assert.isObject(c);
			assert.instanceOf(c, Config);
		}
	},
	'When i load config': {
		topic: function() {
			return new Config().load({
				'test': true,
				'test2': 'ok'
			});
		},
		'then i get the loaded config loaded': function(c) {
			assert.isObject(c);
			assert.isTrue(c.test);
			assert.equal(c.test2, 'ok');
		}
	},
	'When i clear config': {
		topic: function() {
			var cc = new Config();
			cc.test = true;
			cc.test2 = false;
			return cc.clear();
		},
		'then i get the config cleared': function(c) {
			assert.isObject(c);
			assert.isUndefined(c.test);
			assert.isUndefined(c.test2);
		}
	}
});

suite.export(module);