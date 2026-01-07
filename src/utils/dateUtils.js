/**
 * Converts a timestamp to a formatted date string.
 * @param {number|string|Date} timestamp - The timestamp to format.
 * @param {string} timezone - The timezone (e.g., 'UTC', 'Europe/Rome').
 * @returns {string} - The formatted date string.
 */
export function formatTimestamp(timestamp, timezone = 'UTC') {
    const date = new Date(timestamp);
    return date.toLocaleString('en-GB', { timeZone: timezone });
}
