/* jslint node: true */
/* global BOT_DIR, LIBS_DIR, MODULES_DIR */

//mocha globals
/* global describe, it, before, after, beforeEach, afterEach */

//strict
'use strict';

//load assert lib
var assert = require('chai').assert;

var Config = require(LIBS_DIR + '/config');

describe('Config lib', function() {
	describe('class construction', function() {
		it('should return \'Config\' instance', function() {
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

	describe('#load', function() {
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

	describe('#clear', function() {
		it('should clear the config', function() {
			config.clear();
			assert.isUndefined(config.test2);
			assert.isUndefined(config.test3);
		});
	});
});