// Application State
const state = {
    query: '',
    fields: ['basics', 'website', 'names', 'decisionMakers', 'registeredEntries', 'financialPeriods', 'latestFinancialXml'],
    autoLoadLatest: true,
    company: null,
    financialPeriods: [],
    selectedFinancialDate: null,
    xml: null,
    loading: false,
    error: null,
    apiCallsCount: 0
};

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// DOM Elements
let searchInput, searchButton, resultsContainer, apiCounter, apiCountValue, autoLoadCheckbox;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize DOM elements
    searchInput = document.getElementById('searchInput');
    searchButton = document.getElementById('searchButton');
    resultsContainer = document.getElementById('results');
    apiCounter = document.getElementById('apiCounter');
    apiCountValue = document.getElementById('apiCountValue');
    autoLoadCheckbox = document.getElementById('autoLoadLatest');
    
    // Initialize field checkboxes
    const fieldCheckboxes = document.querySelectorAll('input[name="field"]');
    fieldCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateFields);
    });
    
    // Auto-load checkbox
    if (autoLoadCheckbox) {
        autoLoadCheckbox.addEventListener('change', function() {
            state.autoLoadLatest = this.checked;
        });
    }
    
    // Search button click
    searchButton.addEventListener('click', performSearch);
    
    // Enter key in search input (with debounce)
    const debouncedSearch = debounce(performSearch, 300);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            debouncedSearch();
        }
    });
    
    // Debounced input for type-ahead search (optional)
    searchInput.addEventListener('input', function() {
        // Only auto-search if query is not empty and has reasonable length
        const query = searchInput.value.trim();
        if (query.length >= 3) {
            debouncedSearch();
        }
    });
});

function updateFields() {
    const fieldCheckboxes = document.querySelectorAll('input[name="field"]:checked');
    state.fields = Array.from(fieldCheckboxes).map(cb => cb.value);
}

function performSearch() {
    const query = searchInput.value.trim();
    
    if (!query) {
        showError('Please enter a company name or Business ID');
        return;
    }
    
    state.query = query;
    state.loading = true;
    state.error = null;
    
    // Show loading state
    resultsContainer.innerHTML = '<div class="loading"><div class="spinner"></div><p>Searching...</p></div>';
    
    // Update fields from checkboxes
    updateFields();
    
    // Send search request
    fetch('/api/search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            q: state.query,
            fields: state.fields,
            autoLoadLatest: state.autoLoadLatest
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Search failed');
            });
        }
        return response.json();
    })
    .then(data => {
        state.loading = false;
        state.company = data;
        state.apiCallsCount = data.calls_count || 0;
        
        if (data.financialPeriods) {
            state.financialPeriods = data.financialPeriods;
            state.selectedFinancialDate = data.latestFinancialDate;
        }
        
        if (data.latestFinancialXml) {
            state.xml = data.latestFinancialXml;
        }
        
        displayResults();
    })
    .catch(error => {
        state.loading = false;
        state.error = error.message;
        showError(error.message);
    });
}

function showError(message) {
    resultsContainer.innerHTML = `<div class="error-message">
        <p>❌ ${escapeHtml(message)}</p>
    </div>`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function displayResults() {
    const data = state.company;
    
    resultsContainer.innerHTML = '';
    
    // Show API counter
    if (apiCounter) {
        apiCounter.style.display = 'block';
        apiCountValue.textContent = state.apiCallsCount;
    }
    
    // Company Basics
    if (data.basics) {
        const basicsSection = createSection('Company Basics', () => {
            const content = document.createElement('div');
            content.className = 'data-grid';
            
            content.appendChild(createDataRow('Business ID', data.basics.businessId));
            content.appendChild(createDataRow('Official Name', data.basics.name));
            content.appendChild(createDataRow('Company Form', data.basics.companyForm));
            content.appendChild(createDataRow('Registration Date', data.basics.registrationDate));
            
            return content;
        });
        resultsContainer.appendChild(basicsSection);
    }
    
    // Website
    if (data.website && data.website.url) {
        const websiteSection = createSection('Website', () => {
            const content = document.createElement('div');
            const link = document.createElement('a');
            link.href = data.website.url.startsWith('http') ? data.website.url : 'http://' + data.website.url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = data.website.url;
            link.className = 'website-link';
            content.appendChild(link);
            return content;
        });
        resultsContainer.appendChild(websiteSection);
    }
    
    // All Names
    if (data.names && data.names.length > 0) {
        const namesSection = createSection('Names History', () => {
            const content = document.createElement('div');
            content.className = 'names-list';
            
            data.names.forEach(nameObj => {
                const nameItem = document.createElement('div');
                nameItem.className = 'name-item';
                if (nameObj.current) {
                    nameItem.classList.add('current');
                }
                
                const nameText = document.createElement('span');
                nameText.textContent = nameObj.name;
                nameItem.appendChild(nameText);
                
                if (nameObj.current) {
                    const badge = document.createElement('span');
                    badge.className = 'badge';
                    badge.textContent = 'Current';
                    nameItem.appendChild(badge);
                }
                
                if (nameObj.language) {
                    const lang = document.createElement('span');
                    lang.className = 'language';
                    lang.textContent = nameObj.language;
                    nameItem.appendChild(lang);
                }
                
                content.appendChild(nameItem);
            });
            
            return content;
        });
        resultsContainer.appendChild(namesSection);
    }
    
    // Decision Makers
    if (data.decisionMakers) {
        if (data.decisionMakers === 'not_available') {
            const dmSection = createSection('Decision Makers', () => {
                const content = document.createElement('div');
                content.className = 'not-available';
                content.textContent = 'Ei saatavilla suoraan (Decision makers not directly available)';
                return content;
            });
            resultsContainer.appendChild(dmSection);
        } else if (Array.isArray(data.decisionMakers) && data.decisionMakers.length > 0) {
            const dmSection = createSection('Decision Makers', () => {
                const content = document.createElement('div');
                content.className = 'decision-makers-list';
                
                data.decisionMakers.forEach(dm => {
                    const dmItem = document.createElement('div');
                    dmItem.className = 'dm-item';
                    
                    const date = document.createElement('div');
                    date.className = 'dm-date';
                    date.textContent = dm.date;
                    dmItem.appendChild(date);
                    
                    const type = document.createElement('div');
                    type.className = 'dm-type';
                    type.textContent = dm.type;
                    dmItem.appendChild(type);
                    
                    const desc = document.createElement('div');
                    desc.className = 'dm-description';
                    desc.textContent = dm.description;
                    dmItem.appendChild(desc);
                    
                    content.appendChild(dmItem);
                });
                
                return content;
            });
            resultsContainer.appendChild(dmSection);
        }
    }
    
    // Registered Entries (fallback or requested separately)
    if (data.registeredEntries && Array.isArray(data.registeredEntries) && data.registeredEntries.length > 0) {
        const entriesSection = createSection('Registered Entries', () => {
            const content = document.createElement('div');
            content.className = 'entries-list';
            
            data.registeredEntries.slice(0, 10).forEach(entry => {
                const entryItem = document.createElement('div');
                entryItem.className = 'entry-item';
                
                const header = document.createElement('div');
                header.className = 'entry-header';
                
                const date = document.createElement('span');
                date.className = 'entry-date';
                date.textContent = entry.registrationDate || 'N/A';
                header.appendChild(date);
                
                const code = document.createElement('span');
                code.className = 'entry-code';
                code.textContent = entry.entryCode || 'N/A';
                header.appendChild(code);
                
                entryItem.appendChild(header);
                
                if (entry.description) {
                    const desc = document.createElement('div');
                    desc.className = 'entry-description';
                    desc.textContent = entry.description;
                    entryItem.appendChild(desc);
                }
                
                content.appendChild(entryItem);
            });
            
            return content;
        });
        resultsContainer.appendChild(entriesSection);
    }
    
    // Financial Periods
    if (data.financialPeriods && data.financialPeriods.length > 0) {
        const finSection = createSection('Financial Periods', () => {
            const content = document.createElement('div');
            content.className = 'financial-section';
            
            const select = document.createElement('select');
            select.id = 'financialPeriodSelect';
            select.className = 'financial-select';
            
            data.financialPeriods.forEach(period => {
                const option = document.createElement('option');
                option.value = period.financialDate;
                option.textContent = `${period.financialDate} - ${period.language || 'Unknown'}`;
                if (period.financialDate === data.latestFinancialDate) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
            
            content.appendChild(select);
            
            const fetchBtn = document.createElement('button');
            fetchBtn.textContent = 'Fetch Selected Period XML';
            fetchBtn.className = 'btn-secondary';
            fetchBtn.onclick = () => fetchSpecificFinancial(data.businessId, select.value);
            content.appendChild(fetchBtn);
            
            return content;
        });
        resultsContainer.appendChild(finSection);
    }
    
    // Latest Financial XML
    if (data.latestFinancialXml) {
        const xmlSection = createSection('Latest Financial XML', () => {
            const content = document.createElement('div');
            content.className = 'xml-viewer-container';
            
            const toolbar = document.createElement('div');
            toolbar.className = 'xml-toolbar';
            
            const downloadBtn = document.createElement('button');
            downloadBtn.textContent = '📥 Download XML';
            downloadBtn.className = 'btn-secondary';
            downloadBtn.onclick = () => downloadXML(data.latestFinancialXml, data.businessId, data.latestFinancialDate);
            toolbar.appendChild(downloadBtn);
            
            content.appendChild(toolbar);
            
            const viewer = document.createElement('pre');
            viewer.className = 'xml-viewer';
            viewer.textContent = data.latestFinancialXml.substring(0, 5000) + (data.latestFinancialXml.length > 5000 ? '\n\n... (truncated, download full XML)' : '');
            content.appendChild(viewer);
            
            return content;
        });
        resultsContainer.appendChild(xmlSection);
    }
    
    // Raw JSON Debug
    if (state.fields.includes('rawJson')) {
        const rawSection = createSection('Raw JSON Debug', () => {
            const content = document.createElement('div');
            content.className = 'raw-json';
            
            if (data.raw_ytj) {
                const ytjPre = document.createElement('pre');
                ytjPre.textContent = 'YTJ Response:\n' + JSON.stringify(data.raw_ytj, null, 2);
                content.appendChild(ytjPre);
            }
            
            if (data.raw_registered) {
                const regPre = document.createElement('pre');
                regPre.textContent = 'Registered Notices Response:\n' + JSON.stringify(data.raw_registered, null, 2);
                content.appendChild(regPre);
            }
            
            if (data.raw_xbrl) {
                const xbrlPre = document.createElement('pre');
                xbrlPre.textContent = 'XBRL Response:\n' + JSON.stringify(data.raw_xbrl, null, 2);
                content.appendChild(xbrlPre);
            }
            
            return content;
        }, true);
        resultsContainer.appendChild(rawSection);
    }
}

function createSection(title, contentBuilder, startCollapsed = false) {
    const section = document.createElement('details');
    section.className = 'result-section';
    if (!startCollapsed) {
        section.open = true;
    }
    
    const summary = document.createElement('summary');
    summary.textContent = title;
    section.appendChild(summary);
    
    const content = contentBuilder();
    section.appendChild(content);
    
    return section;
}

function createDataRow(label, value) {
    const row = document.createElement('div');
    row.className = 'data-row';
    
    const labelEl = document.createElement('div');
    labelEl.className = 'data-label';
    labelEl.textContent = label + ':';
    row.appendChild(labelEl);
    
    const valueEl = document.createElement('div');
    valueEl.className = 'data-value';
    valueEl.textContent = value || 'N/A';
    row.appendChild(valueEl);
    
    return row;
}

function fetchSpecificFinancial(businessId, financialDate) {
    if (!businessId || !financialDate) return;
    
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'loading';
    loadingMsg.textContent = 'Fetching financial XML...';
    resultsContainer.appendChild(loadingMsg);
    
    fetch(`/api/financial/${businessId}/${financialDate}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch financial data');
            return response.text();
        })
        .then(xmlContent => {
            if (loadingMsg && loadingMsg.parentNode) {
                loadingMsg.parentNode.removeChild(loadingMsg);
            }
            state.xml = xmlContent;
            state.selectedFinancialDate = financialDate;
            
            // Add or update XML viewer
            const existingXmlSection = Array.from(document.querySelectorAll('.result-section')).find(
                section => section.querySelector('.xml-viewer-container')
            );
            if (existingXmlSection) {
                existingXmlSection.remove();
            }
            
            const xmlSection = createSection(`Financial XML (${financialDate})`, () => {
                const content = document.createElement('div');
                content.className = 'xml-viewer-container';
                
                const toolbar = document.createElement('div');
                toolbar.className = 'xml-toolbar';
                
                const downloadBtn = document.createElement('button');
                downloadBtn.textContent = '📥 Download XML';
                downloadBtn.className = 'btn-secondary';
                downloadBtn.onclick = () => downloadXML(xmlContent, businessId, financialDate);
                toolbar.appendChild(downloadBtn);
                
                content.appendChild(toolbar);
                
                const viewer = document.createElement('pre');
                viewer.className = 'xml-viewer';
                viewer.textContent = xmlContent.substring(0, 5000) + (xmlContent.length > 5000 ? '\n\n... (truncated, download full XML)' : '');
                content.appendChild(viewer);
                
                return content;
            });
            resultsContainer.appendChild(xmlSection);
        })
        .catch(error => {
            if (loadingMsg && loadingMsg.parentNode) {
                loadingMsg.parentNode.removeChild(loadingMsg);
            }
            showError('Error fetching financial data: ' + error.message);
        });
}

function downloadXML(xmlContent, businessId, financialDate) {
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${businessId}_${financialDate}_financial.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
