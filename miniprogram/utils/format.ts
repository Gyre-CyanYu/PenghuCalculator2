interface TimePart {
	unit: 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second';
	value: string;
	sep: '' | '/' | ' ' | ':';
}

function formatTime(dbTime: string, minTimeUnit: TimePart['unit'] = 'minute') {
	const time: Date = new Date(dbTime);
	
	const parts: TimePart[] = [
		{ unit: 'year', value: time.getFullYear().toString(), sep: '' },
		{ unit: 'month', value: (time.getMonth() + 1).toString().padStart(2, '0'), sep: '/' },
		{ unit: 'day', value: time.getDate().toString().padStart(2, '0'), sep: '/' },
		{ unit: 'hour', value: time.getHours().toString().padStart(2, '0'), sep: ' ' },
		{ unit: 'minute', value: time.getMinutes().toString().padStart(2, '0'), sep: ':' },
		{ unit: 'second', value: time.getSeconds().toString().padStart(2, '0'), sep: ':' }
	];
	
	const endIndex: number = parts.findIndex((part: TimePart) => part.unit === minTimeUnit);    
	const formatedTime: string = parts.slice(0, endIndex + 1).map((part: TimePart) => part.sep + part.value).join('');

	return formatedTime;
}

export default { formatTime };