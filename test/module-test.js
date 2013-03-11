'use strict';

var vows = require('vows'),
	assert = require('assert');

var suite = vows.describe('Module class');

if (!global.LIBS_DIR) global.LIBS_DIR = '../libs';
if (!global.MODULES_DIR) global.MODULES_DIR = '../modules';

//disable logger
require('../libs/logger').enabled = false;

var M = require('../libs/module').Module;

var h = require('../libs/helpers');

//disable file resolving of test2 module
M.prototype._resolvePath = h.wrap(M.prototype._resolvePath, function(resol) {
	if (this.name === 'test2') {
		return '../modules/' + this.fileName;
	} else {
		return resol.apply(this);
	}
});

suite.addBatch({
	'When i construct class': {
		topic: function() {
			return new M('test');
		},
		'then i get Module class': function(context) {
			assert.isObject(context);
			assert.instanceOf(context, M);
		},
		'with module name': function(m) {
			assert.isObject(m);
			assert.equal(m.name, 'test');
		},
		'and loadable and no loaded': function(m) {
			assert.isObject(m);
			assert.isTrue(m.loadable);
			assert.isFalse(m.loaded);
		}
	},
	'When i construct empty class': {
		topic: function() {
			return new M();
		},
		'then i should get thrown error and not module': function(m) {
			assert.isObject(m);
			assert.instanceOf(m, Error);
		}
	},
	'When i construct module with nonexistent file': {
		topic: function() {
			return new M('idontexists');
		},
		'then i should get non loadable module': function(m) {
			assert.isObject(m);
			assert.equal(m.name, 'idontexists');
			assert.isFalse(m.loadable);
			assert.isFalse(m.loaded);
		}
	},
	'When i init unloadable module': {
		topic: function() {
			(new M('test2')).init(this.callback);
		},
		'then i should get thrown error and not module': function(err, m) {
			assert.isObject(err);
			assert.instanceOf(err, Error);
			assert.equal(err.message, 'Failed loading context of \'test2\' module!');
		}
	},
	'When i init loadable module with no file': {
		topic: function() {
			(new M('idontexists')).init(this.callback);
		},
		'then i should get thrown error and not module': function(err, m) {
			assert.isObject(err);
			assert.instanceOf(err, Error);
			assert.equal(err.message, 'Cannot load context of unloadable \'idontexists\' module!');
		}
	},
	'When i init loadable module': {
		topic: function() {
			(new M('test')).init(this.callback); //irc is built in module
		},
		'then i should get module context': function(err, m) {
			assert.isNull(err);
			assert.isObject(m);
			assert.isTrue(m.loaded);
			assert.isObject(m.context);
		},
		'and dispatcher': function(err, m) {
			assert.isObject(m.dispatcher);
			//assert.instanceOf(m.dispatcher, require('events').EventEmitter);
			assert.include(m, 'emit');
			assert.include(m, 'on');
			assert.include(m, 'once');
			assert.include(m, 'off');

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
	'When i inject EventEmitter': {
		topic: function() {
			(new M('test')).injectDispatcher(new(require('events').EventEmitter)(), this.callback);
		},
		'then i get bound events on module': function(err, dispatcher, m) {
			assert.isNull(err);
			assert.isObject(dispatcher);
			assert.include(dispatcher, 'emit');
			assert.include(m, 'emit');
			assert.include(m, 'on');
			assert.include(m, 'once');
			assert.include(m, 'off');
		}
	}
});

suite.export(module);