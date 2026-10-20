const americanDate = new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
});
const relativeDate = new Intl.RelativeTimeFormat('en-US', {numeric:'always'});
const calendarDay = (value: string) => Date.parse(`${value}T00:00:00Z`);
// Logs are calendar dates, not instants. UTC arithmetic avoids local/DST shifts.
// Approximate elapsed units: days below 7, weeks below 30, months below 365.
export function displayDate(value: string, today: string) {
    const days = Math.round((calendarDay(value) - calendarDay(today)) / 86400000);
    const age = Math.abs(days);
    const [size, unit]: [number, Intl.RelativeTimeFormatUnit] = age >= 365 ? [365, 'year']
        : age >= 30 ? [30, 'month'] : age >= 7 ? [7, 'week'] : [1, 'day'];
    return {
        absolute: americanDate.format(calendarDay(value)),
        relative: days === 0 ? 'Today' : days === -1 ? 'Yesterday' : days === 1 ? 'Tomorrow'
            : relativeDate.format(Math.trunc(days / size), unit),
    };
}
