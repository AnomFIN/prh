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

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function displayResults(data) {
        if (data.companies && data.companies.length > 0) {
            const resultsTitle = document.createElement('h2');
            resultsTitle.textContent = 'Search Results';
            
            const companiesList = document.createElement('div');
            companiesList.className = 'companies-list';
            
            data.companies.forEach(company => {
                const card = document.createElement('div');
                card.className = 'company-card';
                
                const name = document.createElement('h3');
                name.textContent = company.name || 'N/A';
                
                const businessIdP = document.createElement('p');
                const businessIdStrong = document.createElement('strong');
                businessIdStrong.textContent = 'Business ID: ';
                businessIdP.appendChild(businessIdStrong);
                businessIdP.appendChild(document.createTextNode(company.businessId || 'N/A'));
                
                const statusP = document.createElement('p');
                const statusStrong = document.createElement('strong');
                statusStrong.textContent = 'Status: ';
                statusP.appendChild(statusStrong);
                statusP.appendChild(document.createTextNode(company.status || 'N/A'));
                
                card.appendChild(name);
                card.appendChild(businessIdP);
                card.appendChild(statusP);
                companiesList.appendChild(card);
            });
            
            resultsContainer.innerHTML = '';
            resultsContainer.appendChild(resultsTitle);
            resultsContainer.appendChild(companiesList);
        } else {
            resultsContainer.innerHTML = '<p class="no-results">No results found</p>';
        }
    }
});
