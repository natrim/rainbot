'use strict';

var vows = require('vows'),
	assert = require('assert');

var suite = vows.describe('ModuleManager class');

//disable logger
require('../libs/logger').enabled = false;

var MM = require('../libs/moduleManager');
var M = require('../libs/module');

suite.addBatch({
	'When i construct class': {
		topic: function() {
			return new MM();
		},
		'then i get ModuleManager class': function(context) {
			assert.instanceOf(context, MM);
		},
		'and get modules': function(mm) {
			assert.isArray(mm.modules);
			assert.isArray(mm.getModules());
		},
		'with': {
			topic: function(mm) {
				mm.modules = [new M('test')];
				return mm;
			},
			'working has,exists,contains': function(mm) {
				assert.isArray(mm.modules);
				assert.isTrue(mm.has('test'));
				assert.isTrue(mm.exists('test'));
				assert.isTrue(mm.contains('test'));
				assert.isFalse(mm.has('not-ok'));
			},
			'working find,get': function(mm) {
				assert.isTrue(mm.has('test'));
				assert.isTrue(mm.exists('test'));

				assert.instanceOf(mm.find('test'), M);
				assert.instanceOf(mm.get('test'), M);

				assert.isNull(mm.find('failedtest'));
			}
		}
	},
	'When i load': {
		'empty': {
			topic: function() {
				(new MM()).load(undefined, this.callback);
			},
			'then i get error': function(err, module) {
				assert.isTrue(err);
			}
		},
		'nonexistent module': {
			topic: function() {
				(new MM()).load('someunknownpony', this.callback);
			},
			'then i get error': function(err, module) {
				assert.isTrue(err);
			}
		},
		'test module': {
			topic: function() {
				(new MM()).load('test', this.callback);
			},
			'then i get it loaded': function(err, module, mm) {
				assert.isNull(err);
				assert.isObject(module);
				assert.instanceOf(module, M);
				assert.equal(module.name, 'test');
				assert.isTrue(mm.has('test'));
				assert.isObject(mm.get('test'));
			}
		},
		'test2 module': {
			topic: function() {
				return(new MM()).load('test2');
			},
			'then i get it loaded': function(mm) {
				assert.isObject(mm);
				assert.isTrue(mm.has('test2'));
				assert.isObject(mm.find('test2'));
				assert.instanceOf(mm.find('test2'), M);
				assert.equal(mm.find('test2').name, 'test2');
			}
		}
	},
	'When i unload': {
		'empty': {
			topic: function() {
				(new MM()).unload(undefined, this.callback);
			},
			'then i get error': function(err, module) {
				assert.isTrue(err);
			}
		},
		'nonexistent module': {
			topic: function() {
				(new MM()).unload('someunknownpony', this.callback);
			},
			'then i get error': function(err, module) {
				assert.isTrue(err);
			}
		},
		'test module': {
			topic: function() {
				var mm = (new MM()).load('test');
				assert.isObject(mm.find('test'));
				mm.unload('test', this.callback);
			},
			'then i get it unloaded': function(err, mm) {
				assert.isNull(err);
				assert.isFalse(mm.has('test'));
			}
		},
		'test2 module': {
			topic: function() {
				var mm = (new MM()).load('test2');
				assert.isObject(mm.find('test2'));
				mm.unload('test2');
				return mm;
			},
			'then i get it unloaded': function(mm) {
				assert.isObject(mm);
				assert.isFalse(mm.has('test2'));
			}
		}
	}
});

suite.export(module);