// Load the CSV file from the root folder
fetch('ubahn.csv')
    .then(response => {
        if (!response.ok) throw new Error('CSV file could not be loaded');
        return response.arrayBuffer();
    })
    .then(buffer => {
        // Decode UTF-16LE
        const decoder = new TextDecoder('utf-16le');
        let text = decoder.decode(buffer);
        
        // Remove BOM if present
        if (text.charCodeAt(0) === 0xFEFF) {
            text = text.slice(1);
        }
        
        const data = parseCSV(text);
        renderCarousel(data);
    })
    .catch(error => {
        console.error('Error loading CSV:', error);
        document.getElementById('carousel').innerHTML = '<div style="padding: 40px;">Error loading data</div>';
    });

// Simple CSV Parser handling quotes and semicolons
function parseCSV(text) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                currentCell += '"';
                i++; // Skip the escaped quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ';' && !inQuotes) {
            currentRow.push(currentCell);
            currentCell = '';
        } else if (char === '\n' && !inQuotes) {
            currentRow.push(currentCell);
            rows.push(currentRow);
            currentRow = [];
            currentCell = '';
        } else if (char === '\r' && !inQuotes) {
            // ignore carriage returns
        } else {
            currentCell += char;
        }
    }
    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell);
        rows.push(currentRow);
    }

    // Convert array of arrays to array of objects
    if (rows.length < 2) return [];
    
    const headers = rows[0].map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length === 0 || (row.length === 1 && row[0].trim() === '')) continue;
        
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = row[j] ? row[j].trim() : '';
        }
        data.push(obj);
    }
    
    return data;
}

// Render the carousel slides
function renderCarousel(data) {
    const carousel = document.getElementById('carousel');
    if (!carousel) return;

    let html = '';

    data.forEach(item => {
        if (!item.station || item.station === '') return;

        // Format coordinates
        let coords = item.Koordinaten || '';
        coords = coords.replace(/ N /, ' N<br>');

        // Extract required fields
        const stadt = item.stadt || '';
        const station = item.station || '';
        const stadtteil = item.stadtteil || '';
        const eroffnung = item['Eröffnung'] || '';
        const image = item['@image'] || '';
        const linie = item.linie || '';
        const umstieg = item['Umsteigemöglichkeit'] || '';
        const lage = item.lage || '';
        const extra = item.extra || '';
        const seite = item.seite || '';
        const geschichte = item.geschichte || '';
        const sterne = item.sterne || '';
        const review = item.review || '';
        const name = item.name || '';

        // Build left column content (linie, umstieg, lage, extra) handling empty values
        let leftColHTML = '';
        if (linie) leftColHTML += `<div>${linie}</div>`;
        if (umstieg) leftColHTML += `<div>${umstieg}</div>`;
        if (linie || umstieg) leftColHTML += `<div style="height: 15px;"></div>`; // separator
        if (lage) leftColHTML += `<div>${lage.replace('#', '')}</div>`;
        if (lage) leftColHTML += `<div style="height: 15px;"></div>`; // separator
        if (extra && extra !== '#extra') leftColHTML += `<div>${extra.replace('#', '')}</div>`;

        html += `
            <div class="slide">
                <div class="header">
                    <div class="header-left">
                        <div>${stadt}</div>
                        <div>${station}</div>
                    </div>
                    <div class="header-right">
                        <div>${stadtteil}</div>
                        <div>${coords}</div>
                        <div>${eroffnung}</div>
                    </div>
                </div>
                
                <div class="image-container">
                    <img class="main-image" src="${image}" alt="${station}" loading="lazy">
                </div>
                
                <div class="footer">
                    <div class="footer-left">
                        <div class="footer-left-top uppercase">
                            ${leftColHTML}
                        </div>
                        <div>${seite !== '#seite' ? seite : ''}</div>
                    </div>
                    <div class="footer-right">
                        <div class="block-text">
                            ${geschichte} ${sterne} „${review}“ – ${name}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    carousel.innerHTML = html;
}