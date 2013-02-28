'use strict';

var vows = require('vows'),
	assert = require('assert');

var suite = vows.describe('ModuleManager class');

if (!global.LIBS_DIR) global.LIBS_DIR = '../libs';
if (!global.MODULES_DIR) global.MODULES_DIR = '../modules';

//disable logger
require('../libs/logger').enabled = false;

var MM = require(LIBS_DIR + '/moduleManager').ModuleManager;
var M = require(LIBS_DIR + '/module').Module;

var h = require(LIBS_DIR + '/helpers');

//disable file resolving of test modules
M.prototype._resolvePath = h.wrap(M.prototype._resolvePath, function(resol) {
	if (this.name === 'test' || this.name === 'test2') {
		return MODULES_DIR + '/' + this.fileName;
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
			'then i get it loaded without context': function(err, module, mm) {
				assert.equal(err.message, "Failed loading context of 'test' module!");
				//assert.isNull(err);
				assert.isObject(module);
				assert.instanceOf(module, M);
				assert.equal(module.name, 'test');
				assert.isTrue(mm.has('test'));
				assert.isObject(mm.get('test'));
				assert.isNull(module.context);
			}
		},
		'test2 module': {
			topic: function() {
				return (new MM()).load('test2');
			},
			'then i get it loaded without context': function(mm) {
				assert.isObject(mm);
				assert.isTrue(mm.has('test2'));
				assert.isObject(mm.find('test2'));
				assert.instanceOf(mm.find('test2'), M);
				assert.equal(mm.find('test2').name, 'test2');
				assert.isNull(mm.find('test2').context);
			}
		}
	},
	'When i unload': {
		'empty': {
			topic: function() {
				(new MM()).unload(undefined, this.callback);
			},
			'then i get error': function(err, module) {
				assert.isError(err);
			}
		},
		'nonexistent module': {
			topic: function() {
				(new MM()).unload('someunknownpony', this.callback);
			},
			'then i get error': function(err, module) {
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
				'and itz gone': function(err, mm) {
					assert.isNull(err);
					assert.isFalse(mm.has('test'));
				}
			}
		},
		'test2 module': {
			topic: function() {
				var mm = (new MM());
				mm.load('test2');
				return mm;
			},
			'then i get it unloaded': {
				topic: function(mm) {
					return mm.unload('test2');
				},
				'and itz gone': function(mm) {
					assert.isObject(mm);
					assert.isFalse(mm.has('test2'));
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
		}
	}

});

suite.export(module);