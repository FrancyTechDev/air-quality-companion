/**
 * Converts a timestamp to a formatted date string.
 * Handles timezone conversion.
 * @param {number|string|Date} timestamp - The timestamp to format.
 * @param {string} timezone - The timezone (e.g., 'UTC', 'Europe/Rome').
 * @returns {string} - The formatted date string.
 */
export function formatTimestamp(timestamp, timezone = 'UTC') {
    if (!timestamp) return 'Invalid Date';
    const date = new Date(timestamp);
    return date.toLocaleString('en-GB', { timeZone: timezone });
}

/**
 * Converts a timestamp to ISO format for file downloads.
 * @param {number|string|Date} timestamp - The timestamp to format.
 * @returns {string} - The ISO formatted date string.
 */
export function formatTimestampForFile(timestamp) {
    if (!timestamp) return '1970-01-01T00:00:00Z';
    const date = new Date(timestamp);
    return date.toISOString();
}
