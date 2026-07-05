// Store all loaded catalogue data globally
let allData = [];

// Load the JSON file from the assets/data folder
fetch('assets/data/katalog.json')
    .then(response => {

        // Log the HTTP response so we can check if the file was found
        console.log('JSON response:', response);

        // If the file was not loaded successfully, throw an error
        if (!response.ok) {
            throw new Error('JSON file could not be loaded');
        }

        // Convert the JSON response into JavaScript data
        return response.json();
    })
    .then(data => {

        // Log the loaded data to check if it is an array
        console.log('Loaded JSON data:', data);

        // Save the loaded data in a global variable
        allData = data;

        // Render the catalogue cards
        renderKatalog(allData);
    })
    .catch(error => {

        // Log the error in the browser console
        console.error('Error loading JSON:', error);

        // Show an error message on the page
        document.getElementById('katalog').innerHTML =
            '<div class="loading">Error loading data</div>';
    });


// Render catalogue items into the HTML page
function renderKatalog(items) {

    // Get the catalogue container from the HTML document
    const katalog = document.getElementById('katalog');

    // Check if the catalogue container exists
    console.log('Catalogue container:', katalog);

    // If the element does not exist, stop the function
    if (!katalog) {
        console.error('Element with id="katalog" was not found');
        return;
    }

    // Check if the data is really an array
    if (!Array.isArray(items)) {
        console.error('Expected an array, but got:', items);
        return;
    }

    // Log how many items will be rendered
    console.log('Number of catalogue items:', items.length);

    // This variable will collect all generated HTML
    let html = '';

    // Loop through every item in the JSON array
    for (let i = 0; i < items.length; i++) {

        // Get the current item from the array
        const item = items[i];

        // Log the current item for debugging
        console.log('Rendering item:', i, item);

        // Prepare the author text
        let authorText = item.Author;

        // Prepare an additional CSS class for unknown authors
        let authorClass = '';

        // If the author field contains "-", show a nicer text instead
        if (item.Author === '-') {
            authorText = 'Autor unbekannt';
            authorClass = 'unknown';
        }

        // Add one card to the HTML string
        html += `
            <div class="card">
                <div class="card-image">
                    <img src="${item['@image']}" alt="${item.station}">
                </div>
                <div class="card-content">
                    <div class="card-line1">${item.station}</div>
                    <div class="card-line2">${item.Lage || ''}</div>
                    <div class="card-line3">${item.Linie || ''}</div>
                </div>
            </div>
        `;
    }

    // Log the final generated HTML
    console.log('Generated HTML:', html);

    // Insert the generated HTML into the catalogue container
    katalog.innerHTML = html;
}