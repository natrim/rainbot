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
var assert = require('assert');

//assert helpers
assert.isError = function(val) {
	assert.isObject(val);
	assert.instanceOf(val, Error);
};

assert.isObject = function(o) {
	return typeof o === 'object';
};

assert.instanceOf = function(real, expected) {
	return real instanceof expected;
};

assert.isTrue = function(v) {
	return v === true;
};

assert.isFalse = function(v) {
	return v === false;
};

assert.isUndefined = function(v) {
	return typeof v === 'undefined';
};

//and letz go
var Config = require(LIBS_DIR + '/config');

describe('Config lib', function() {
	describe('class construction', function() {
		it('should return \'Config\' instance', function() {
			assert.isObject(Config);
			assert.instanceOf(new Config.Config(), Config.Config);
			assert.instanceOf(Config.create(), Config.Config);
		});
	});

	var config;
	beforeEach(function() {
		config = Config.create();
		config.test2 = 'error';
		config.test3 = 'derp';
	});

	describe('config load', function() {
		it('should load the config', function() {
			config.load({
				'test': true,
				'test2': 'ok'
			});

			assert.isTrue(config.test);
			assert.equal(config.test2, 'ok');
			assert.equal(config.test3, 'derp');
		});
	});

	describe('config clear', function() {
		it('should clear the config', function() {
			config.clear();
			assert.isUndefined(config.test2);
			assert.isUndefined(config.test3);
		});
	});
});