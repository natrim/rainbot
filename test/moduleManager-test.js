/* jslint node: true */
/* global BOT_DIR, LIBS_DIR, MODULES_DIR */
'use strict';

//set main entry point path
global.BOT_DIR = require('path').resolve(__dirname, '..');
global.LIBS_DIR = require('path').resolve(BOT_DIR, 'libs');
global.MODULES_DIR = require('path').resolve(BOT_DIR, 'modules');

var vows = require('vows'),
	assert = require('assert');

var suite = vows.describe('ModuleManager class');

//disable logger
require(LIBS_DIR + '/logger').enabled = false;

var MM = require(LIBS_DIR + '/moduleManager').ModuleManager;
var M = require(LIBS_DIR + '/module').Module;

var h = require(LIBS_DIR + '/helpers');

//disable file resolving of test2 module
M.prototype._resolvePath = h.wrap(M.prototype._resolvePath, function(resol) {
	if (this.name === 'test2') {
		return '../modules/' + this.fileName;
	} else {
		return resol.apply(this);
	}
});

//isError assert
assert.isError = function(val) {
	assert.isObject(val);
	assert.instanceOf(val, Error);
};

suite.addBatch({
	'When i construct class': {
		topic: function() {
			return new MM();
		},
		'then i get ModuleManager class': function(context) {
			assert.isObject(context);
			assert.instanceOf(context, MM);
		},
		'and get modules': function(mm) {
			assert.isObject(mm);
			assert.isArray(mm.getModules());
		},
		'with module, then i have': {
			topic: function(mm) {
				mm.load('test');
				return mm;
			},
			'working has,exists,contains': function(mm) {
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
				assert.isError(err);
			}
		},
		'nonexistent module': {
			topic: function() {
				(new MM()).load('someunknownpony', this.callback);
			},
			'then i get error': function(err, module) {
				assert.isError(err);
			}
		},
		'test module': {
			topic: function() {
				(new MM()).load('test', this.callback);
			},
			'then i get it loaded': function(err, module, mm) {
				assert.isNull(err);
				assert.equal(module, 'test');

				module = mm.get(module);

				assert.isObject(module);
				assert.instanceOf(module, M);
				assert.equal(module.name, 'test');
				assert.isTrue(module.loaded);
				assert.isTrue(mm.has('test'));
				assert.isObject(mm.get('test'));
				assert.isObject(mm.test);
				assert.isObject(module.context);
				assert.equal(module.test_init, 'Many ponies!');
			}
		},
		'broken test2 module callback': {
			topic: function() {
				(new MM()).load('test2', this.callback);
			},
			'then i get error': function(err, module, mm) {
				assert.isError(err);
				assert.equal(err.message, 'Error happened during module \'test2\' initialization: Failed loading context of \'test2\' module! Cannot find module \'../modules/test2.js\'');
				assert.isFalse(mm.has('test2'));
			}
		},
		'broken test2 module return': {
			topic: function() {
				this.mm = (new MM());
				return this.mm.load('test2');
			},
			'then i get err': function(err) {
				assert.isError(err);
				assert.isFalse(this.mm.has('test2'));
			}
		}
	},
	'When i unload': {
		'empty': {
			topic: function() {
				(new MM()).unload(undefined, this.callback);
			},
			'then i get error': function(err, name, mm) {
				assert.isError(err);
			}
		},
		'nonexistent module': {
			topic: function() {
				(new MM()).unload('someunknownpony', this.callback);
			},
			'then i get error': function(err, name, mm) {
				assert.isError(err);
			}
		},
		'test module': {
			topic: function() {
				var mm = (new MM());
				mm.load('test');
				return mm;
			},
			'then i get it unloaded': {
				topic: function(mm) {
					mm.unload('test', this.callback);
				},
				'and itz gone': function(err, name, mm) {
					assert.isNull(err);
					assert.isFalse(mm.has('test'));
					assert.isUndefined(mm.test);
				}
			}
		}
	},
	'When i require': {
		topic: function() {
			return (new MM()).require('test');
		},
		'then i get the module': function(m) {
			assert.isObject(m);
			assert.instanceOf(m, M);
			assert.equal(m.name, 'test');
			assert.equal(m.test_init, 'Many ponies!');
		}
	},
	'When i reload': {
		'not loaded module': {
			topic: function() {
				(new MM()).reload('test', this.callback);
			},
			'then i get error': function(err, m, mm) {
				assert.isObject(err);
				assert.instanceOf(err, Error);
			}
		},
		'loaded module': {
			topic: function() {
				(new MM()).load('test').reload('test', this.callback);
			},
			'then i get ok': function(err, m, mm) {
				assert.isNull(err);
				assert.equal(m.test_init, 'Reload Many ponies!');
				assert.equal(m.test_halt, 'Reloading No ponies!');
			}
		}
	}
});


suite.addBatch({
	'When i load module and protected it': {
		topic: function() {
			var mm = (new MM());
			mm.load('test');
			mm.protect('test');
			return mm;
		},
		'then i cannot unload it': {
			topic: function(mm) {
				mm.unload('test', this.callback);
			},
			'so, i get error': function(err, m, mm) {
				assert.isError(err);
				assert.equal(err.message, 'Module \'test\' is protected!');
				assert.isTrue(mm.has('test'));
			}
		}
	}
});

suite.export(module);