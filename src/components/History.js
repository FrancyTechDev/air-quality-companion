import React from 'react';
import { formatTimestamp } from '../utils/dateUtils';

function History({ data }) {
    const processedData = processHistoryData(data);

    return (
        <div>
            <h2>History</h2>
            <ul>
                {processedData.map(entry => (
                    <li key={entry.id}>
                        {entry.value} - {entry.formattedTime}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function processHistoryData(data) {
    return data.map(entry => ({
        ...entry,
        formattedTime: formatTimestamp(entry.timestamp, 'Europe/Rome'),
    }));
}

export default History;