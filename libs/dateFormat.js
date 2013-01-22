/**
 * date helper
 * @param {Date} d Date instance or nothing
 * @param {string} format Format with (YYYY-MM-DD HH:MM:SS TZ) placeholders
 * @return {string}   returns date in defined format
 */
module.exports = function dateFormat(d, format) {
	if(typeof d == "undefined" || !d) {
		d = new Date();
	}
	if(typeof(format) !== "string") {
		format = "YYYY-MM-DD HH:MM:SS";
	}
	if(format.toLowerCase() === "utc") {
		return d.toUTCString();
	} else if(format.toLowerCase() === "locale") {
		return d.toLocaleString();
	}

	var year = d.getFullYear(),
		month = (d.getMonth() + 1),
		day = d.getDate(),
		hour = d.getHours(),
		minute = d.getMinutes(),
		second = d.getSeconds(),
		tz = -(d.getTimezoneOffset() / 60);
	if(month < 10) month = "0" + month;
	if(day < 10) day = "0" + day;
	if(hour < 10) hour = "0" + hour;
	if(minute < 10) minute = "0" + minute;
	if(second < 10) second = "0" + second;
	if(tz === 0) tz = "UTC";
	else if(tz > 0) tz = "UTC+" + tz;
	else tz = "UTC" + tz;
	return format.replace("YYYY", year).replace("YY", year.toString().substr(-2)).replace("MM", month).replace("DD", day).replace("HH", hour).replace("MM", minute).replace("SS", second).replace("TZ", tz);
};