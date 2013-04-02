/* jslint node: true */
/* global BOT_DIR, LIBS_DIR, MODULES_DIR */
'use strict';

var vows = require('vows'),
	assert = require('assert');

var suite = vows.describe('Module class');

if (!global.LIBS_DIR) global.LIBS_DIR = '../libs';
if (!global.MODULES_DIR) global.MODULES_DIR = '../modules';

//disable logger
require(LIBS_DIR + '/logger').enabled = false;

var M = require(LIBS_DIR + '/module').Module;

var h = require(LIBS_DIR + '/helpers');

//disable file resolving of test2 module
M.prototype._resolvePath = h.wrap(M.prototype._resolvePath, function(resol) {
	if (this.name === 'test2') {
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

//osModule
assert.isModule = function(m) {
	assert.isObject(m);
	assert.instanceOf(m, M);
};

suite.addBatch({
	'When i construct class': {
		topic: function() {
			return new M('test');
		},
		'then i get Module': function(m) {
			assert.isModule(m);
			assert.equal(m.name, 'test');
			assert.isFalse(m.loaded);
		}
	},
	'When i construct empty class': {
		topic: function() {
			return new M();
		},
		'then i should get thrown error and not module': function(m) {
			assert.isError(m);
			assert.equal(m.message, 'You need to specifify module name!');
		}
	},
	'When i construct module with nonexistent file': {
		topic: function() {
			return new M('idontexists');
		},
		'then i should get error': function(err) {
			assert.isError(err);
			assert.equal(err.message, 'Module \'idontexists\' does not exists in MODULE_DIR!');
		}
	},
	'When i init broken module': {
		'callback': {
			topic: function() {
				var m = (new M('test2'));
				m.init(this.callback);
			},
			'then i get error': function(err, m) {
				assert.isError(err);
				assert.equal(err.message, 'Failed loading context of \'test2\' module! Cannot find module \'../modules/test2.js\'');
			}
		},
		'return': {
			topic: function() {
				var m = (new M('test2'));
				return m.init();
			},
			'then i get error': function(err) {
				assert.isError(err);
				assert.equal(err.message, 'Failed loading context of \'test2\' module! Cannot find module \'../modules/test2.js\'');
			}
		}
	},
	'When i init loadable module callback': {
		topic: function() {
			(new M('test')).init(this.callback);
		},
		'then i should get module context': function(err, m) {
			assert.isNull(err);
			assert.isModule(m);
			assert.isTrue(m.loaded);
			assert.isObject(m.context);
			assert.equal(m.context.test, 'Pony');
			assert.equal(m.test_init, 'Many ponies!');
		},
		'and dispatcher': function(err, m) {
			assert.isObject(m.dispatcher);
			assert.include(m.dispatcher, 'emit');
			assert.include(m.dispatcher, 'on');
			assert.include(m.dispatcher, 'once');
			assert.include(m.dispatcher, 'off');
		},
		'and config': function(err, m) {
			assert.isObject(m.config);
			assert.instanceOf(m.config, require(LIBS_DIR + '/config').Config);
		}
	},
	'When i init loadable module return': {
		topic: function() {
			return (new M('test')).init();
		},
		'then ok': function(m) {
			assert.isModule(m);
			assert.equal(m.name, 'test');
			assert.isTrue(m.loaded);
			assert.isObject(m.context);
			assert.equal(m.context.test, 'Pony');
			assert.equal(m.test_init, 'Many ponies!');
		}
	},
	'When i inject EventEmitter': {
		topic: function() {
			(new M('test')).injectDispatcher(new(require('events').EventEmitter)(), this.callback);
		},
		'then i get bound events on module': function(err, dispatcher, m) {
			assert.isNull(err);
			assert.isObject(dispatcher);
			assert.include(dispatcher, 'emit');
			assert.include(dispatcher, 'on');
			assert.include(dispatcher, 'once');
			assert.include(dispatcher, 'off');
		}
	},
	'When i halt': {
		'loaded module return': {
			topic: function() {
				return (new M('test')).init().halt();
			},
			'then it unloads': function(m) {
				assert.isObject(m);
				assert.equal(m.name, 'test');
				assert.isFalse(m.loaded);
			}
		},
		'loaded module callback': {
			topic: function() {
				(new M('test')).init().halt(this.callback);
			},
			'then it unloads': function(err, m) {
				assert.isNull(err);
				assert.isObject(m);
				assert.equal(m.name, 'test');
				assert.isFalse(m.loaded);
			}
		}
	},
	'When i reload context': {
		'of loadable module': {
			topic: function() {
				(new M('test')).init().reload(this.callback);
			},
			'then i get ok': function(err, m) {
				assert.isNull(err);
				assert.isModule(m);
				assert.equal(m.test_init, 'Reload Many ponies!');
				assert.equal(m.test_halt, 'Reloading No ponies!');
			}
		},
		'of not loaded loadable module': {
			topic: function() {
				(new M('test')).reload(this.callback);
			},
			'then i get error': function(err, m) {
				assert.isError(err);
				assert.equal(err.message, 'Module \'test\' is not loaded!');
			}
		}
	}
});

suite.export(module);