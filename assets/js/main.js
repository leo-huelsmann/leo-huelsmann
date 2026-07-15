let originalData = [];
let carouselData = [];
let currentIndex = 0;

// Menu State
let isMenuOpen = false;
let currentSort = { field: null, asc: true }; 
let currentFilters = {};
let activeDropdown = null;
let filterOptions = {
    stadt: new Set(),
    anfangsbuchstabe: new Set(),
    linie: new Set(),
    umstieg: new Set(),
    stadtteil: new Set(),
    sterne: new Set()
};

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
        originalData = data;
        carouselData = [...data];
        
        // Extract filter options
        data.forEach(item => {
            if (item.stadt) filterOptions.stadt.add(item.stadt);
            if (item.station) filterOptions.anfangsbuchstabe.add(item.station.charAt(0).toUpperCase());
            if (item.linie) {
                item.linie.split('/').forEach(l => filterOptions.linie.add(l.trim()));
            }
            if (item['Umsteigemöglichkeit']) {
                item['Umsteigemöglichkeit'].split('/').forEach(u => {
                    let cleaned = u.trim().replace('#', '');
                    if (cleaned) filterOptions.umstieg.add(cleaned);
                });
            }
            if (item.stadtteil) filterOptions.stadtteil.add(item.stadtteil);
            if (item.sterne) filterOptions.sterne.add(item.sterne);
        });

        // Convert sets to sorted arrays
        for (let key in filterOptions) {
            filterOptions[key] = Array.from(filterOptions[key]).sort();
        }
        
        renderCarousel(carouselData);
        setupMenu();
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
        if (linie || umstieg) leftColHTML += `<div style="height: 8px;"></div>`; // separator
        if (lage) leftColHTML += `<div>${lage.replace('#', '')}</div>`;
        if (lage) leftColHTML += `<div style="height: 8px;"></div>`; // separator
        if (extra && extra !== '#extra') leftColHTML += `<div>${extra.replace('#', '')}</div>`;

        html += `
            <div class="slide">
                <div class="header slide-placeholder">
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
                
                <div class="footer slide-placeholder">
                    <div class="footer-left">
                        <div class="footer-left-top uppercase">
                            ${leftColHTML}
                        </div>
                        <div class="uppercase">${seite && seite !== '#seite' ? 'seite ' + seite : ''}</div>
                    </div>
                    <div class="footer-right">
                        <div class="block-text">
                            ${geschichte}${geschichte ? '<br>' : ''}${sterne} „${review}“ – ${name}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    carousel.innerHTML = html;
    adjustLayoutWidths();
    updateFixedText(0);
    updateArrowVisibility(0);
}

function adjustLayoutWidths() {
    const carousel = document.getElementById('carousel');
    if (!carousel) return;
    const slideWidth = carousel.clientWidth;
    const scrollPosition = carousel.scrollLeft;
    const index = Math.round(scrollPosition / slideWidth);

    const slides = document.querySelectorAll('.slide');
    const activeSlide = slides[index];
    if (!activeSlide) return;

    const img = activeSlide.querySelector('.main-image');
    const fixedHeader = document.getElementById('fixed-header');
    const fixedFooter = document.getElementById('fixed-footer');
    const leftArrow = document.getElementById('nav-arrow-left');
    const rightArrow = document.getElementById('nav-arrow-right');
    if (img && fixedHeader && fixedFooter) {
        const applyWidth = () => {
            const rect = img.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;
            const top = rect.top;
            if (width > 0) {
                const leftPos = (window.innerWidth - width) / 2;
                fixedHeader.style.width = `${width}px`;
                fixedHeader.style.left = `${leftPos}px`;

                fixedFooter.style.width = `${width}px`;
                fixedFooter.style.left = `${leftPos}px`;

                if (leftArrow && rightArrow) {
                    const arrowTop = top + height / 2;
                    leftArrow.style.top = `${arrowTop}px`;
                    leftArrow.style.left = `${leftPos - 10}px`;

                    rightArrow.style.top = `${arrowTop}px`;
                    rightArrow.style.left = `${leftPos + width + 10}px`;
                }
            }
        };

        if (img.complete) {
            applyWidth();
        } else {
            img.onload = applyWidth;
        }
    }
}

function typewrite(element, text, duration = 400) {
    if (!element) return;
    
    if (element.typewriterRequest) {
        cancelAnimationFrame(element.typewriterRequest);
    }
    
    element.innerHTML = '';
    if (!text) return;
    
    const startTime = performance.now();
    
    function animate(currentTime) {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        
        const charCount = Math.floor(progress * text.length);
        
        let renderedText = '';
        let i = 0;
        let count = 0;
        
        while (i < text.length && count < charCount) {
            if (text[i] === '<') {
                const closeIndex = text.indexOf('>', i);
                if (closeIndex !== -1) {
                    renderedText += text.substring(i, closeIndex + 1);
                    i = closeIndex + 1;
                    continue;
                }
            }
            renderedText += text[i];
            i++;
            count++;
        }
        
        element.innerHTML = renderedText;
        
        if (progress < 1) {
            element.typewriterRequest = requestAnimationFrame(animate);
        } else {
            element.typewriterRequest = null;
        }
    }
    
    element.typewriterRequest = requestAnimationFrame(animate);
}

function updateFixedText(index) {
    if (!carouselData || carouselData.length === 0 || index >= carouselData.length) return;
    const item = carouselData[index];
    
    const D_SHORT = 500;
    const D_LONG = 800;
    
    typewrite(document.getElementById('fh-stadt'), item.stadt || '', D_SHORT);
    typewrite(document.getElementById('fh-station'), item.station || '', D_SHORT);
    
    typewrite(document.getElementById('fh-stadtteil'), item.stadtteil || '', D_SHORT);
    let coords = item.Koordinaten || '';
    coords = coords.replace(/ N /, ' N<br>');
    typewrite(document.getElementById('fh-coords'), coords, D_SHORT);
    typewrite(document.getElementById('fh-eröffnung'), item['Eröffnung'] || '', D_SHORT);
    
    const linie = item.linie || '';
    const umstieg = item['Umsteigemöglichkeit'] || '';
    const lage = item.lage || '';
    const extra = item.extra || '';
    
    let leftColHTML = '';
    if (linie) leftColHTML += `<div id="ff-linie">&nbsp;</div>`;
    if (umstieg) leftColHTML += `<div id="ff-umstieg">&nbsp;</div>`;
    if (linie || umstieg) leftColHTML += `<div style="height: 8px;"></div>`;
    if (lage) leftColHTML += `<div id="ff-lage">&nbsp;</div>`;
    if (lage) leftColHTML += `<div style="height: 8px;"></div>`;
    if (extra && extra !== '#extra') leftColHTML += `<div id="ff-extra">&nbsp;</div>`;
    
    document.getElementById('ff-left-top').innerHTML = leftColHTML;
    
    if (linie) typewrite(document.getElementById('ff-linie'), linie, D_SHORT);
    if (umstieg) typewrite(document.getElementById('ff-umstieg'), umstieg, D_SHORT);
    if (lage) typewrite(document.getElementById('ff-lage'), lage.replace('#', ''), D_SHORT);
    if (extra && extra !== '#extra') typewrite(document.getElementById('ff-extra'), extra.replace('#', ''), D_SHORT);
    
    const seite = item.seite || '';
    const seiteText = seite && seite !== '#seite' ? 'seite ' + seite : '';
    
    typewrite(document.getElementById('ff-seite'), seiteText, D_SHORT);
    
    const geschichte = item.geschichte || '';
    const sterne = item.sterne || '';
    const review = item.review || '';
    const name = item.name || '';
    const reviewText = `${geschichte}${geschichte ? '<br>' : ''}${sterne} „${review}“ – ${name}`;
    
    typewrite(document.getElementById('ff-review'), reviewText, D_LONG);
}

function updateArrowVisibility(index) {
    const leftArrow = document.getElementById('nav-arrow-left');
    const rightArrow = document.getElementById('nav-arrow-right');
    if (leftArrow && rightArrow) {
        if (index === 0) {
            leftArrow.style.visibility = 'hidden';
        } else {
            leftArrow.style.visibility = 'visible';
        }
        
        if (index === carouselData.length - 1) {
            rightArrow.style.visibility = 'hidden';
        } else {
            rightArrow.style.visibility = 'visible';
        }
    }
}

function scrollToSlide(index) {
    const carousel = document.getElementById('carousel');
    if (!carousel) return;
    const slideWidth = carousel.clientWidth;
    carousel.scrollTo({
        left: index * slideWidth,
        behavior: 'smooth'
    });
}

const carousel = document.getElementById('carousel');
if (carousel) {
    carousel.addEventListener('scroll', () => {
        const slideWidth = carousel.clientWidth;
        const scrollPosition = carousel.scrollLeft;
        const newIndex = Math.round(scrollPosition / slideWidth);
        if (newIndex !== currentIndex && newIndex >= 0 && newIndex < carouselData.length) {
            currentIndex = newIndex;
            updateFixedText(currentIndex);
            adjustLayoutWidths();
            updateArrowVisibility(currentIndex);
        }
    });
}

const leftArrow = document.getElementById('nav-arrow-left');
const rightArrow = document.getElementById('nav-arrow-right');

if (leftArrow) {
    leftArrow.addEventListener('click', () => {
        if (currentIndex > 0) {
            scrollToSlide(currentIndex - 1);
        }
    });
}

if (rightArrow) {
    rightArrow.addEventListener('click', () => {
        if (currentIndex < carouselData.length - 1) {
            scrollToSlide(currentIndex + 1);
        }
    });
}

window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) {
            scrollToSlide(currentIndex - 1);
        }
    } else if (e.key === 'ArrowRight') {
        if (currentIndex < carouselData.length - 1) {
            scrollToSlide(currentIndex + 1);
        }
    }
});

window.addEventListener('resize', adjustLayoutWidths);
window.addEventListener('load', adjustLayoutWidths);

// --- Menu Logic ---
function setupMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const menuOverlay = document.getElementById('menu-overlay');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            isMenuOpen = !isMenuOpen;
            if (isMenuOpen) {
                menuOverlay.style.display = 'flex';
                renderMenu(true);
            } else {
                menuOverlay.style.display = 'none';
                menuOverlay.innerHTML = '';
            }
        });
    }

    // Event delegation for menu clicks
    if (menuOverlay) {
        menuOverlay.addEventListener('click', (e) => {
            // Dropdown Toggle
            if (e.target.hasAttribute('data-toggle-dropdown')) {
                const key = e.target.getAttribute('data-toggle-dropdown');
                activeDropdown = (activeDropdown === key) ? null : key;
                renderMenu(false); // Re-render without animation
            }
            
            // Sort direction toggle
            if (e.target.hasAttribute('data-action') && e.target.getAttribute('data-action') === 'toggle-sort-dir') {
                currentSort.asc = !currentSort.asc;
                applyFiltersAndSort();
                renderMenu(false);
            }

            // Set Sorting Field
            if (e.target.hasAttribute('data-sort')) {
                const field = e.target.getAttribute('data-sort');
                if (currentSort.field === field) {
                    // Toggle asc/desc if already selected
                    currentSort.asc = !currentSort.asc;
                } else {
                    currentSort.field = field;
                    currentSort.asc = true;
                }
                applyFiltersAndSort();
                renderMenu(false);
            }

            // Set Filter
            if (e.target.hasAttribute('data-filter-key') && e.target.hasAttribute('data-filter-val')) {
                const key = e.target.getAttribute('data-filter-key');
                const val = e.target.getAttribute('data-filter-val');
                
                // Toggle filter
                if (currentFilters[key] === val) {
                    delete currentFilters[key]; // clear it
                } else {
                    currentFilters[key] = val;
                }
                
                applyFiltersAndSort();
                renderMenu(false);
            }
            
            // Clear specific filter
            if (e.target.hasAttribute('data-clear-filter')) {
                const key = e.target.getAttribute('data-clear-filter');
                delete currentFilters[key];
                applyFiltersAndSort();
                renderMenu(false);
            }
        });
    }
}

function renderMenu(animate = false) {
    const menuOverlay = document.getElementById('menu-overlay');
    if (!menuOverlay) return;

    let html = '';

    // Sortierung Section
    const sortArrow = currentSort.asc ? '^' : 'v';
    html += `<div class="menu-section-title"><span class="sort-arrow" data-action="toggle-sort-dir">${sortArrow}</span> Sortierung:</div>`;
    
    html += `<div class="dropdown-container">`;
    const sortOptions = [
        { field: 'stadt', label: 'Stadt' },
        { field: 'lage', label: 'Lage' },
        { field: 'hue', label: 'Hue' },
        { field: 'kelvin', label: 'Temperatur' },
        { field: 'val', label: 'Helligkeit' },
        { field: 'sat', label: 'Sättigung' }
    ];
    
    sortOptions.forEach(opt => {
        const isActive = currentSort.field === opt.field ? 'active' : '';
        html += `<div class="menu-item ${isActive}" data-sort="${opt.field}">${opt.label}</div>`;
    });
    html += `</div><div style="height: 10px;"></div>`;

    // Filter Section
    html += `<div class="menu-section-title">Filter:</div>`;
    html += `<div class="dropdown-container">`;
    
    const filterCategories = [
        { key: 'stadt', label: 'Stadt' },
        { key: 'anfangsbuchstabe', label: 'Buchstabe' },
        { key: 'linie', label: 'Linie' },
        { key: 'umstieg', label: 'Umstieg' },
        { key: 'stadtteil', label: 'Stadtteil' },
        { key: 'sterne', label: 'Sterne' }
    ];
    
    filterCategories.forEach(cat => {
        const isActive = currentFilters[cat.key] ? 'active' : '';
        const arrow = activeDropdown === cat.key ? 'v' : '>';
        
        html += `<div class="menu-item ${isActive}" data-toggle-dropdown="${cat.key}">${cat.label} ${currentFilters[cat.key] ? '(' + currentFilters[cat.key] + ')' : ''}</div>`;
        
        // Show dropdown items if active
        if (activeDropdown === cat.key) {
            html += `<div class="dropdown-container" style="margin-left: 10px; border-left: 1px solid yellow;">`;
            
            // Add a "clear" option if currently filtered
            if (currentFilters[cat.key]) {
                html += `<div class="menu-item" data-clear-filter="${cat.key}"><em>- Alle anzeigen -</em></div>`;
            }
            
            filterOptions[cat.key].forEach(val => {
                const isSelected = currentFilters[cat.key] === val ? 'active' : '';
                html += `<div class="menu-item ${isSelected}" data-filter-key="${cat.key}" data-filter-val="${val}">${val}</div>`;
            });
            html += `</div>`;
        }
    });
    
    html += `</div>`; // end dropdown-container

    if (animate) {
        typewrite(menuOverlay, html, 600);
    } else {
        menuOverlay.innerHTML = html;
    }
}

function applyFiltersAndSort() {
    let result = [...originalData];

    // Apply Filters
    for (let key in currentFilters) {
        const val = currentFilters[key];
        if (!val) continue;
        
        result = result.filter(item => {
            if (key === 'anfangsbuchstabe') return item.station && item.station.charAt(0).toUpperCase() === val;
            if (key === 'linie') return item.linie && item.linie.includes(val);
            if (key === 'umstieg') return item['Umsteigemöglichkeit'] && item['Umsteigemöglichkeit'].includes(val);
            return item[key] == val;
        });
    }

    // Apply Sorting
    if (currentSort.field) {
        result.sort((a, b) => {
            let valA, valB;
            switch(currentSort.field) {
                case 'hue': 
                    valA = parseInt(a.Schnitt_Hue || 0); 
                    valB = parseInt(b.Schnitt_Hue || 0); 
                    return currentSort.asc ? valA - valB : valB - valA;
                case 'kelvin': 
                    valA = parseInt(a.Farbtemperatur_Kelvin || 0); 
                    valB = parseInt(b.Farbtemperatur_Kelvin || 0); 
                    return currentSort.asc ? valA - valB : valB - valA;
                case 'val': 
                    valA = parseInt(a.Schnitt_Val || 0); 
                    valB = parseInt(b.Schnitt_Val || 0); 
                    return currentSort.asc ? valA - valB : valB - valA;
                case 'sat': 
                    valA = parseInt(a.Schnitt_Sat || 0); 
                    valB = parseInt(b.Schnitt_Sat || 0); 
                    return currentSort.asc ? valA - valB : valB - valA;
                default: 
                    valA = a[currentSort.field] || '';
                    valB = b[currentSort.field] || '';
                    return currentSort.asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
        });
    }

    carouselData = result;
    currentIndex = 0; // reset to first slide after filtering/sorting
    renderCarousel(carouselData);
    
    // Jump to the first slide
    const carouselEl = document.getElementById('carousel');
    if (carouselEl) {
        carouselEl.scrollLeft = 0;
    }
}