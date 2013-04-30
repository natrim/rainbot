/* jslint node: true */
/* global BOT_DIR, LIBS_DIR, MODULES_DIR */
'use strict';

/**
 * date helper
 * @param {Date} d Date instance or nothing
 * @param {string} format Format with (YYYY-MM-DD HH:II:SS TZ) placeholders
 * @return {string}   returns date in defined format
 */
module.exports.dateFormat = module.exports.formatDate = module.exports.formattedDate = function(d, format) {
	if (typeof d === 'undefined' || !d) {
		d = new Date();
	}
	if (typeof(format) !== 'string') {
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
	if (month < 10) month = '0' + month;
	if (day < 10) day = '0' + day;
	if (hour < 10) hour = '0' + hour;
	if (minute < 10) minute = '0' + minute;
	if (second < 10) second = '0' + second;
	if (tz === 0) tz = 'UTC';
	else if (tz > 0) tz = 'UTC+' + tz;
	else tz = 'UTC' + tz;
	return format.replace('YYYY', year).replace('YY', year.toString().substr(-2)).replace('MM', month).replace('DD', day).replace('HH', hour).replace('II', minute).replace('SS', second).replace('TZ', tz);
};

/**
 * Wraps function in another function
 * @param  {function} func
 * @param  {function} wrapper
 * @return {function}
 */
module.exports.wrap = function(func, wrapper) {
	return function() {
		var args = [func];
		Array.prototype.push.apply(args, arguments);
		return wrapper.apply(this, args);
	};
};

/**
 * Exports functions passed in array
 * @param  {object} to   destinations object
 * @param  {object} from source object
 * @param  {array} list list of function names to export
 * @return {void} nothing
 */
module.exports.export = function(to, from, list) {
	list.forEach(function(p) {
		if (typeof from[p] === 'function') to[p] = from[p].bind(from);
	});
	return to;
};