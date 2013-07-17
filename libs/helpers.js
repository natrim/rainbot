'use strict';

module.exports.checkGlobals = function check(resolve) {
	if (!global.BOT_DIR) {
		if (!resolve) {
			throw new Error('Wrong entry point! No \'BOT_DIR\' defined!');
		}
		global.BOT_DIR = require('path').resolve(__dirname, '..');
	}
	if (!global.LIBS_DIR) {
		if (!resolve) {
			throw new Error('Wrong entry point! No \'LIBS_DIR\' defined!');
		}
		global.LIBS_DIR = require('path').resolve(global.BOT_DIR, 'libs');
	}
	if (!global.MODULES_DIR) {
		if (!resolve) {
			throw new Error('Wrong entry point! No \'MODULES_DIR\' defined!');
		}
		global.MODULES_DIR = require('path').resolve(global.BOT_DIR, 'modules');
	}
};

/**
 * date helper
 * @param {Date} d Date instance or nothing
 * @param {string} format Format with (YYYY-MM-DD HH:II:SS TZ) placeholders
 * @return {string}   returns date in defined format
 */
module.exports.dateFormat = module.exports.formatDate = module.exports.formattedDate = function helperDateFormat(d, format) {
	if (typeof d === 'undefined' || !d) {
		d = new Date();
	}
	if (typeof format !== 'string') {
		format = 'YYYY-MM-DD HH:II:SS';
	}
	if (format.toLowerCase() === 'utc') {
		return d.toUTCString();
	} else if (format.toLowerCase().substr(0, 5) === 'local') {
		return d.toLocaleString();
	}

	var year = d.getFullYear(),
		month = (d.getMonth() + 1),
		day = d.getDate(),
		hour = d.getHours(),
		minute = d.getMinutes(),
		second = d.getSeconds(),
		tz = -(d.getTimezoneOffset() / 60);
	if (month < 10) {
		month = '0' + month;
	}
	if (day < 10) {
		day = '0' + day;
	}
	if (hour < 10) {
		hour = '0' + hour;
	}
	if (minute < 10) {
		minute = '0' + minute;
	}
	if (second < 10) {
		second = '0' + second;
	}
	if (tz === 0) {
		tz = 'UTC';
	} else if (tz > 0) {
		tz = 'UTC+' + tz;
	} else {
		tz = 'UTC' + tz;
	}
	return format.replace('YYYY', year).replace('YY', year.toString().substr(-2)).replace('MM', month).replace('DD', day).replace('HH', hour).replace('II', minute).replace('SS', second).replace('TZ', tz);
};

/**
 * Formats size in bytes to pretty string
 * @param  {number} bytes
 * @return {string}
 */
module.exports.formatSizeUnits = function formatSizeUnits(bytes) {
	if (bytes >= 1073741824) {
		bytes = (bytes / 1073741824).toFixed(2) + ' GB';
	} else if (bytes >= 1048576) {
		bytes = (bytes / 1048576).toFixed(2) + ' MB';
	} else if (bytes >= 1024) {
		bytes = (bytes / 1024).toFixed(2) + ' KB';
	} else if (bytes > 1) {
		bytes = bytes + ' bytes';
	} else if (bytes >= 1) {
		bytes = bytes + ' byte';
	} else {
		bytes = '0 bytes';
	}
	return bytes;
};

/**
 * formats number of seconds tu human readable format
 * @param  {number} sec number of seconds
 * @return {string}
 */
module.exports.formatTime = function formatTime(sec) {
	if (sec instanceof Date) {
		sec = Date.getTime() / 1000;
	} else if (typeof sec !== 'number') {
		return 'no idea';
	}
	var days = Math.floor(sec / 86400);
	var hours = Math.floor(sec / 3600 - days * 24);
	var minutes = Math.floor(sec / 60 - days * 1440 - hours * 60);
	var seconds = Math.floor(sec - days * 86400 - hours * 3600 - minutes * 60);

	var returnstr = '';
	if (days) {
		returnstr += (days) + ' day' + (days === 1 ? '' : 's') + ', ' + (hours) + ' hour' + (hours === 1 ? '' : 's') + ' and ' + (minutes) + ' minute' + (minutes === 1 ? '' : 's');
	} else if (hours) {
		returnstr += (hours) + ' hour' + (hours === 1 ? '' : 's') + ' and ' + (minutes) + ' minute' + (minutes === 1 ? '' : 's');
	} else if (minutes) {
		returnstr += (minutes) + ' minute' + (minutes === 1 ? '' : 's') + ' and ' + (seconds) + ' second' + (seconds === 1 ? '' : 's');
	} else if (seconds) {
		returnstr += (seconds) + ' second' + (seconds === 1 ? '' : 's');
	} else {
		returnstr += 'less than a second';
	}
	return returnstr;
};

/**
 * Wraps function in another function
 * @param  {function} func
 * @param  {function} wrapper
 * @return {function}
 */
module.exports.wrap = function helperWrap(func, wrapper) {
	return function wrap() {
		var args = [func];
		Array.prototype.push.apply(args, arguments);
		return wrapper.apply(this, args);
	};
};

/**
 * Produce a duplicate-free version of the array
 * @param  {[type]}  array    [description]
 * @param  {Boolean} isSorted [description]
 * @param  {[type]}  iterator [description]
 * @param  {[type]}  context  [description]
 * @return {[type]}           [description]
 */
module.exports.uniq = module.exports.unique = function helperUnique(array, isSorted, iterator, context) {
	if (typeof isSorted === 'function') {
		context = iterator;
		iterator = isSorted;
		isSorted = false;
	}
	var initial = iterator ? array.map(iterator, context) : array;
	var results = [];
	var seen = [];
	initial.forEach(function unique(value, index) {
		if (isSorted ? (!index || seen[seen.length - 1] !== value) : seen.indexOf(value) === -1) {
			seen.push(value);
			results.push(array[index]);
		}
	});
	return results;
};

/**
 * Exports functions passed in array
 * @param  {object} to   destinations object
 * @param  {object} from source object
 * @param  {array} list list of function names to export
 * @return {void} nothing
 */
module.exports.export = function helperExport(to, from, list) {
	list.forEach(function exportt(p) {
		if (typeof from[p] === 'function') {
			to[p] = from[p].bind(from);
		}
	});
	return to;
};