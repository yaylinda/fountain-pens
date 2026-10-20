const americanDate = new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
});
const calendarDay = (value: string) => Date.parse(`${value}T00:00:00Z`);
// Logs are calendar dates, not instants. UTC arithmetic avoids local/DST shifts.
export function displayDate(value: string, today: string) {
    const days = Math.round((calendarDay(today) - calendarDay(value)) / 86400000);
    return {
        absolute: americanDate.format(calendarDay(value)),
        relative: days === 0 ? 'Today' : days === 1 ? 'Yesterday' : days === -1 ? 'Tomorrow'
            : days > 1 ? `${days} days ago` : `In ${-days} days`,
    };
}
