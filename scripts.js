let playerData = [];
let sortOrder = {};

function parseData() {
    const dataInput = document.getElementById('dataInput').value.trim();
    if (!dataInput) {
        showError('Input data cannot be empty.');
        return [];
    }
    const lines = dataInput.split('\n');
    return lines.map(line => {
        const parts = line.split('\t');
        if (parts.length < 3) {
            showError('Each line must contain at least three tab-separated values.');
            return null;
        }
        const nameParts = parts[1].split(', ');
        if (nameParts.length < 2) {
            showError('Player name must contain a comma separating last name and first name.');
            return null;
        }
        const fullName = nameParts[0] + nameParts[1].split('(')[0];
        const idMatch = parts[1].match(/\((\d+)\)/);
        if (!idMatch) {
            showError('Player ID must be enclosed in parentheses.');
            return null;
        }
        const wins = parseInt(parts[2], 10);
        const points = Math.floor(wins / 3) + 1;
        return { id: idMatch[1], name: fullName, points: points };
    }).filter(entry => entry !== null);
}
function addData() {
    const dateInput = document.getElementById('dateInput').value;
    if (!dateInput) {
        showError('Please select a date.');
        return;
    }
    const newData = parseData();
    if (newData.length === 0) return;

    // Check if the date already exists and set every value to 0 if it does
    const table = document.getElementById('dataTable');
    const tableHead = table.getElementsByTagName('thead')[0];
    const existingHeaders = Array.from(tableHead.getElementsByTagName('th')).map(th => th.textContent);
    if (existingHeaders.includes(dateInput)) {
        playerData.forEach(entry => {
            const existingPoint = entry.points.find(point => point.date === dateInput);
            if (existingPoint) {
                existingPoint.value = 0;
            } else {
                entry.points.push({ date: dateInput, value: 0 });
            }
        });
    }

    newData.forEach(newEntry => {
        const existingEntry = playerData.find(entry => entry.id === newEntry.id);
        if (existingEntry) {
            const existingPoint = existingEntry.points.find(point => point.date === dateInput);
            if (existingPoint) {
                existingPoint.value = newEntry.points;
            } else {
                existingEntry.points.push({ date: dateInput, value: newEntry.points });
            }
        } else {
            playerData.push({ ...newEntry, points: [{ date: dateInput, value: newEntry.points }] });
        }
    });
    updateTable();
    document.getElementById('dataInput').value = '';
    document.getElementById('dateInput').value = '';
    showError('');
    showSuccess(`Data for ${dateInput} added successfully!`);
}

function updateTable() {
    const table = document.getElementById('dataTable');
    const tableHead = table.getElementsByTagName('thead')[0];
    const tableBody = table.getElementsByTagName('tbody')[0];

    // Clear existing table body
    tableBody.innerHTML = '';

    // Determine unique dates for the header and sort them
    const uniqueDates = [...new Set(playerData.flatMap(entry => entry.points.map(p => p.date)))].sort((a, b) => new Date(a) - new Date(b));

    // Update table header
    let headerRow = '<tr><th onclick="sortTable(0)">Player ID</th><th onclick="sortTable(1)">Player Name</th><th onclick="sortTable(2)">Total Points</th>';
    uniqueDates.forEach((date, index) => {
        headerRow += `<th onclick="sortTable(${index + 3})">${date}</th>`;
    });
    headerRow += '</tr>';
    tableHead.innerHTML = headerRow;

    // Update table body
    playerData.forEach(entry => {
        const totalPoints = entry.points.reduce((sum, point) => sum + point.value, 0);
        let row = `<tr><td>${entry.id}</td><td>${entry.name.replace(/([a-z])([A-Z])/g, '$1 $2')}</td><td>${totalPoints}</td>`;
        uniqueDates.forEach(date => {
            const point = entry.points.find(p => p.date === date);
            row += `<td>${point ? point.value : 0}</td>`;
        });
        row += '</tr>';
        tableBody.innerHTML += row;
    });
}

function removeColumn(table, columnIndex) {
    const rows = table.getElementsByTagName('tr');
    for (let row of rows) {
        row.deleteCell(columnIndex);
    }
}

function sortTable(columnIndex) {
    const table = document.getElementById('dataTable');
    const tableBody = table.getElementsByTagName('tbody')[0];
    const rows = Array.from(tableBody.getElementsByTagName('tr'));

    const isNumericColumn = columnIndex === 0 || columnIndex === 2 || columnIndex > 2;
    const sortDirection = sortOrder[columnIndex] === 'asc' ? 'desc' : 'asc';
    sortOrder[columnIndex] = sortDirection;

    rows.sort((a, b) => {
        const aText = a.getElementsByTagName('td')[columnIndex].textContent;
        const bText = b.getElementsByTagName('td')[columnIndex].textContent;

        if (isNumericColumn) {
            return sortDirection === 'asc' ? aText - bText : bText - aText;
        } else {
            return sortDirection === 'asc' ? aText.localeCompare(bText) : bText.localeCompare(aText);
        }
    });

    tableBody.innerHTML = '';
    rows.forEach(row => tableBody.appendChild(row));
}
function saveAsCSV() {
    let csvContent = "data:text/csv;charset=utf-8,";
    const headers = ['Player ID', 'Player Name', 'Total Points', ...new Set(playerData.flatMap(entry => entry.points.map(p => p.date)))];
    csvContent += headers.join(',') + '\n';

    playerData.forEach(row => {
        const totalPoints = row.points.reduce((sum, point) => sum + point.value, 0);
        if (totalPoints > 0) {
            const rowData = [row.id, `"${row.name}"`, totalPoints, ...headers.slice(3).map(date => {
                const point = row.points.find(p => p.date === date);
                return point ? point.value : '';
            })];
            csvContent += rowData.join(',') + '\n';
        }
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "player_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function loadFromCSV() {
    document.getElementById('fileInput').click();
}
function handleFile(event) {
    const file = event.target.files[0];
    if (!file) {
        showError('No file selected.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim() !== '');
        const headers = lines[0].split(',');
        const dates = headers.slice(3);
        playerData = lines.slice(1).map(line => {
            const parts = line.split(',');
            const points = dates.map((date, index) => ({
                date,
                value: parts[index + 3] ? parseInt(parts[index + 3], 10) : 0
            }));
            return { id: parts[0], name: parts[1].replace(/"/g, ''), points: points };
        });
        updateTable();
        showSuccess('Data loaded successfully!');
    };
    reader.readAsText(file);

    // Display the file name
    document.getElementById('fileName').textContent = `Loaded file: ${file.name}`;
}

function showError(message) {
    document.getElementById('error').textContent = message;
}

function showSuccess(message) {
    document.getElementById('successMessage').textContent = message;
}

