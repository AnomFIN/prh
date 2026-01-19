document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const resultsContainer = document.getElementById('results');

    // Handle search button click
    searchButton.addEventListener('click', performSearch);

    // Handle Enter key in search input
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    function performSearch() {
        const query = searchInput.value.trim();
        
        if (!query) {
            resultsContainer.innerHTML = '<p class="error">Please enter a search query</p>';
            return;
        }

        // Show loading state
        resultsContainer.innerHTML = '<p class="loading">Searching...</p>';

        // Send search request to backend
        fetch('/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: query })
        })
        .then(response => response.json())
        .then(data => {
            displayResults(data);
        })
        .catch(error => {
            console.error('Error:', error);
            resultsContainer.innerHTML = '<p class="error">An error occurred while searching</p>';
        });
    }

    function displayResults(data) {
        if (data.companies && data.companies.length > 0) {
            let html = '<h2>Search Results</h2>';
            html += '<div class="companies-list">';
            
            data.companies.forEach(company => {
                html += `
                    <div class="company-card">
                        <h3>${company.name}</h3>
                        <p><strong>Business ID:</strong> ${company.businessId || 'N/A'}</p>
                        <p><strong>Status:</strong> ${company.status || 'N/A'}</p>
                    </div>
                `;
            });
            
            html += '</div>';
            resultsContainer.innerHTML = html;
        } else {
            resultsContainer.innerHTML = '<p class="no-results">No results found</p>';
        }
    }
});
