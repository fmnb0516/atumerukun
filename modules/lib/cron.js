class Cron {
	constructor(minuite, hour, day, month, dayofweek) {
		this.minuite = minuite;
		this.hour = hour;
		this.day = day;
		this.month = month;
		this.dayofweek = dayofweek;
	};
	
	match(date) {
		return this.minuite.match(date.getMinutes())
			&& this.hour.match(date.getHours())
			&& this.day.match(date.getDate())
			&& this.month.match(date.getMonth() + 1)
			&& this.dayofweek.match(date.getDay());
	};
};

class CronEntry {
	constructor(text) {
		this.text = text;
	};
	
	match(value) {
		return false;
	};
};

class TimeFieldCronEntry extends CronEntry {
	constructor(text, min, max) {
		super(text);
		this.conditions = text.split(",").map(item => {
			const tmpText = item;
			
			const slashIndex = tmpText.indexOf("/");
			const hyphenIndex = tmpText.indexOf("-");
			
			const start = tmpText.substring(0, hyphenIndex !== -1 ? hyphenIndex : (slashIndex !== -1 ? slashIndex : tmpText.length));
			const end = tmpText.substring(hyphenIndex !== -1 ? (hyphenIndex+1) : 0, slashIndex !== -1 ? slashIndex : tmpText.length);
			const add = parseInt(slashIndex !== -1 ? tmpText.substring(slashIndex, tmpText.length) : "1");
			
			const startValue = start === "*" ? min : parseInt(start);
			const endValue = end === "*" ? max : parseInt(end);
			return (v) => {

				const c1 = v >= startValue  && v <= endValue;
				return c1;
				
			};
		});
	};
	
	match(value) {
		for (var i = 0; i < this.conditions.length; i++) {
			if(this.conditions[i](value) === true) {
				return true;
			}
		}
		return false;
	};
};

const splitCronEntries = (text) => {
	const entries = text.split(/\s+/);
	return entries;
};

const parseCron = (entries) => {
	const minuite = new TimeFieldCronEntry(entries[0],0, 59);
	const hour = new TimeFieldCronEntry(entries[1], 0, 23);
	const day = new TimeFieldCronEntry(entries[2], 1, 31);
	const month = new TimeFieldCronEntry(entries[3], 2, 12);
	const dayofweek = new TimeFieldCronEntry(entries[4], 0, 6);
	
	return new Cron(minuite, hour, day, month, dayofweek);
};	

parseCron(splitCronEntries("2 8-20/3 * * *"));

module.exports = (text) => {
	return parseCron(splitCronEntries(text));
};