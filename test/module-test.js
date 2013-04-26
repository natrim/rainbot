/* jslint node: true */
/* global BOT_DIR, LIBS_DIR, MODULES_DIR */
'use strict';

//set main entry point path
global.BOT_DIR = require('path').resolve(__dirname, '..');
global.LIBS_DIR = require('path').resolve(BOT_DIR, 'libs');
global.MODULES_DIR = require('path').resolve(BOT_DIR, 'modules');

var vows = require('vows'),
	assert = require('assert');

var suite = vows.describe('Module class');

//disable logger
require(LIBS_DIR + '/logger').enabled = false;

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
				var m = (new M('test2')).injectDispatcher(new(require('events').EventEmitter)()).injectConfig(new(require(LIBS_DIR + '/config').Config)());
				m.init(this.callback);
			},
			'then i get error': function(err, m) {
				assert.isError(err);
				assert.equal(err.message, 'Failed loading context of \'test2\' module! Cannot find module \'../modules/test2.js\'');
			}
		},
		'return': {
			topic: function() {
				var m = (new M('test2')).injectDispatcher(new(require('events').EventEmitter)()).injectConfig(new(require(LIBS_DIR + '/config').Config)());
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
			var m = new M('test');
			m.injectDispatcher(new(require('events').EventEmitter)());
			m.injectConfig(new(require(LIBS_DIR + '/config').Config)());
			m.init(this.callback);
		},
		'then i should get module context': function(err, m) {
			assert.isNull(err);
			assert.isModule(m);
			assert.isTrue(m.loaded);
			assert.isObject(m.context);
			assert.equal(m.context.test, 'Pony');
			assert.equal(m.test_init, 'Many ponies!');
		},
		'and working dispatcher': function(err, m) {
			assert.isObject(m.dispatcher);
			assert.include(m.dispatcher, 'emit');
			assert.include(m.dispatcher, 'on');
			assert.include(m.dispatcher, 'once');
			assert.include(m.dispatcher, 'off');
		},
		'and working config': function(err, m) {
			assert.isObject(m.config);
		}
	},
	'When i init loadable module return': {
		topic: function() {
			var m = new M('test');
			m.injectDispatcher(new(require('events').EventEmitter)());
			m.injectConfig(new(require(LIBS_DIR + '/config').Config)());
			m.init();
			return m;
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
	'When i halt': {
		'loaded module return': {
			topic: function() {
				return (new M('test')).injectDispatcher(new(require('events').EventEmitter)()).injectConfig(new(require(LIBS_DIR + '/config').Config)()).init().halt();
			},
			'then it unloads': function(m) {
				assert.isObject(m);
				assert.equal(m.name, 'test');
				assert.isFalse(m.loaded);
			}
		},
		'loaded module callback': {
			topic: function() {
				(new M('test')).injectDispatcher(new(require('events').EventEmitter)()).injectConfig(new(require(LIBS_DIR + '/config').Config)()).init().halt(this.callback);
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
				(new M('test')).injectDispatcher(new(require('events').EventEmitter)()).injectConfig(new(require(LIBS_DIR + '/config').Config)()).init().reload(undefined, this.callback);
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
				(new M('test')).reload(undefined, this.callback);
			},
			'then i get error': function(err, m) {
				assert.isError(err);
				assert.equal(err.message, 'Context of module \'test\' is not loaded!');
			}
		}
	}
});

suite.export(module);