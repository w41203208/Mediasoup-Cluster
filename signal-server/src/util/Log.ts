enum WEEK {
	MONDAY = '1',
	TUESDAY = '2',
	WEDNESDAY = '3',
	THURSDAY = '4',
	FRIDAY = '5',
	SATURDAY = '6',
	SUNDAY = '7',
}

enum Level {
	info = 'INFO',
	debug = 'DEBUG',
	warn = 'WARN',
	error = 'ERROR',
}

enum logger {
	debug = 'DEBUG',
	info = 'INFO',
	warn = 'WARN',
	error = 'ERROR',
}

interface LogFuncParams {
	text: string;
	color: string;
	label: string;
}
interface LogColor {
	debug: string;
	info: string;
	warn: string;
	error: string;
}

type LogFunc = (logParams: LogFuncParams, data: any) => void;

export class Log {
	static Instance: Log;
	static level: number = 0;

	static GetInstance() {
		if (this.Instance === undefined) {
			if (this.Instance === undefined) {
				this.Instance = new Log();
			}
		}
		return this.Instance;
	}
	static setLogLevel(l: string) {
		switch (l) {
			case Level.info:
				this.level = 0;
				break;
			case Level.debug:
				this.level = 1;
				break;
			case Level.warn:
				this.level = 2;
				break;
			case Level.error:
				this.level = 3;
				break;
		}
	}
	private _logColor: LogColor;

	_log: LogFunc;
	constructor() {
		this._logColor = {
			debug: '\x1b[33m',
			info: '\x1b[32m',
			warn: '\x1b[35m',
			error: '\x1b[31m',
		};

		this._log = function ({ text = '', color, label }: LogFuncParams, data: any) {
			const l = '[' + label + ']';
			const time = this.getTime(new Date());
			console.log(`${color}${l.padEnd(7)} [${time}]\x1b[0m | ${text}`, ...data);
		};
	}

	debug(t: string, ...data: any) {
		if (Log.level < 1) {
			return;
		}
		const label = logger.debug;
		const color = '\x1b[33m';
		this._log.call(this, { text: t, color: color, label: label }, data);
	}
	info(t: string, ...data: any) {
		if (Log.level < 0) {
			return;
		}
		const label = logger.info;
		const color = '\x1b[32m';
		this._log({ text: t, color: color, label: label }, data);
	}
	warn(t: string, ...data: any) {
		if (Log.level < 2) {
			return;
		}
		const label = logger.warn;
		const color = '\x1b[35m';
		this._log({ text: t, color: color, label: label }, data);
	}
	error(t: string, ...data: any) {
		if (Log.level < 3) {
			return;
		}
		const label = logger.error;
		const color = '\x1b[31m';
		this._log({ text: t, color: color, label: label }, data);
	}

	getTime(time: Date): string {
		let logInfo = '';

		const year = time.getFullYear();
		logInfo += year.toString() + '/';

		const month = time.getMonth() + 1;
		logInfo += this.formatTransform(month.toString()) + '/';

		const date = time.getDate();
		logInfo += this.formatTransform(date.toString());

		// const week = today.getDay();
		// logInfo.push(weekTransform(week.toString()));
		logInfo += '-';
		const hour = time.getHours() + 8 > 24 ? time.getHours() + 8 - 24 : time.getHours() + 8;
		logInfo += this.formatTransform(hour.toString()) + ':';

		const min = time.getMinutes();
		logInfo += this.formatTransform(min.toString()) + ':';

		const sec = time.getSeconds();
		logInfo += this.formatTransform(sec.toString());

		logInfo += ' ';

		const amOrPm = this.hourToMeridiem(hour);
		logInfo += amOrPm;

		// logInfo.push(hour.toString());

		return logInfo;
	}
	private formatTransform(s: string) {
		if (s.length === 1) {
			return '0' + s;
		} else {
			return s;
		}
	}
	private weekTransform(s: string) {
		switch (s) {
			case WEEK.MONDAY:
				return '星期一';
				break;
			case WEEK.TUESDAY:
				return '星期二';
				break;
			case WEEK.WEDNESDAY:
				return '星期三';
				break;
			case WEEK.THURSDAY:
				return '星期四';
				break;
			case WEEK.FRIDAY:
				return '星期五';
				break;
			case WEEK.SATURDAY:
				return '星期六';
				break;
			default:
				return '星期日';
				break;
		}
	}
	private hourToMeridiem(s: number): string {
		return s > 12 ? 'PM' : 'AM';
	}
}
