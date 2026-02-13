// API Configuration for direct browser calls
const YTJ_BASE_URL = "https://avoindata.prh.fi/bis/v1";
const REGISTERED_NOTICES_BASE_URL = "https://avoindata.prh.fi/tr-kai/v1";
const XBRL_BASE_URL = "https://xbrl.prh.fi/api";
const SEARCH_MAX_RESULTS = 10;

// Finnish Business ID pattern (Y-tunnus): 1234567-8
const BUSINESS_ID_PATTERN = /^\d{7}-\d$/;

// Mock data for demonstration (when APIs are unavailable or CORS blocked)
const MOCK_DATA = {
    "0112038-9": {  // Nokia
        "ytj": {
            "results": [{
                "businessId": "0112038-9",
                "name": "Nokia Oyj",
                "registrationDate": "1967-05-12",
                "companyForm": "Osakeyhtiö",
                "detailsUri": null,
                "contactDetails": [{
                    "type": "Kotisivun www-osoite",
                    "value": "www.nokia.com"
                }],
                "auxiliaryNames": [
                    {"name": "Nokia Corporation", "language": "EN"},
                    {"name": "Nokia Abp", "language": "SV"}
                ]
            }]
        },
        "registered": {
            "registeredEntries": [
                {
                    "registrationDate": "2023-03-15",
                    "entryCode": "H01",
                    "description": "Hallituksen puheenjohtaja: Smith John, syntymäaika 15.05.1965",
                    "authority": "PRH"
                },
                {
                    "registrationDate": "2023-03-15",
                    "entryCode": "T01",
                    "description": "Toimitusjohtaja: Johnson Anna, syntymäaika 22.08.1970",
                    "authority": "PRH"
                }
            ]
        },
        "xbrl": {
            "financials": [
                {"financialDate": "2023-12-31", "language": "fi"},
                {"financialDate": "2022-12-31", "language": "fi"},
                {"financialDate": "2021-12-31", "language": "fi"}
            ]
        },
        "xml": `<?xml version="1.0" encoding="UTF-8"?>
<xbrl xmlns="http://www.xbrl.org/2003/instance">
    <context id="current">
        <entity>
            <identifier scheme="http://www.ytj.fi">0112038-9</identifier>
        </entity>
        <period>
            <startDate>2023-01-01</startDate>
            <endDate>2023-12-31</endDate>
        </period>
    </context>
    <unit id="EUR">
        <measure>iso4217:EUR</measure>
    </unit>
    <Revenue contextRef="current" unitRef="EUR" decimals="0">23000000000</Revenue>
    <ProfitLoss contextRef="current" unitRef="EUR" decimals="0">1500000000</ProfitLoss>
    <Assets contextRef="current" unitRef="EUR" decimals="0">45000000000</Assets>
</xbrl>`
    }
};

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
    
    // Enter key in search input
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
});

function updateFields() {
    const fieldCheckboxes = document.querySelectorAll('input[name="field"]:checked');
    state.fields = Array.from(fieldCheckboxes).map(cb => cb.value);
}

// API helper functions with CORS fallback
async function fetchWithFallback(url, mockKey, mockSubKey) {
    try {
        const response = await fetch(url, { 
            mode: 'cors',
            headers: {
                'Accept': 'application/json'
            }
        });
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.warn(`CORS or network error for ${url}, using mock data:`, error);
    }
    
    // Fallback to mock data
    if (mockKey && MOCK_DATA[mockKey] && mockSubKey) {
        return MOCK_DATA[mockKey][mockSubKey];
    }
    return null;
}

async function fetchYTJData(businessId) {
    const url = `${YTJ_BASE_URL}/${businessId}`;
    return await fetchWithFallback(url, businessId, 'ytj');
}

async function fetchRegisteredNotices(businessId) {
    const url = `${REGISTERED_NOTICES_BASE_URL}/registerednotices/${businessId}`;
    return await fetchWithFallback(url, businessId, 'registered');
}

async function fetchFinancialPeriods(businessId) {
    const url = `${XBRL_BASE_URL}/financials/${businessId}`;
    return await fetchWithFallback(url, businessId, 'xbrl');
}

async function fetchFinancialXML(businessId, financialDate) {
    try {
        const url = `${XBRL_BASE_URL}/financial/${businessId}/${financialDate}`;
        const response = await fetch(url, { mode: 'cors' });
        if (response.ok) {
            return await response.text();
        }
    } catch (error) {
        console.warn(`CORS or network error for financial XML, using mock data:`, error);
    }
    
    // Fallback to mock data
    if (MOCK_DATA[businessId]) {
        return MOCK_DATA[businessId].xml;
    }
    return null;
}

async function searchCompanyByName(query) {
    // Check mock data first
    for (const [bid, data] of Object.entries(MOCK_DATA)) {
        if (query.toLowerCase() === data.ytj.results[0].name.toLowerCase() ||
            data.ytj.results[0].name.toLowerCase().includes(query.toLowerCase())) {
            return bid;
        }
    }
    
    try {
        const encodedQuery = encodeURIComponent(query);
        const url = `${YTJ_BASE_URL}?totalResults=true&maxResults=${SEARCH_MAX_RESULTS}&resultsFrom=0&name=${encodedQuery}`;
        const response = await fetch(url, { 
            mode: 'cors',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                const results = data.results;
                const queryLower = query.toLowerCase();
                
                // Find best match: exact > starts with > first result
                for (const result of results) {
                    if (result.name && result.name.toLowerCase() === queryLower) {
                        return result.businessId;
                    }
                }
                
                for (const result of results) {
                    if (result.name && result.name.toLowerCase().startsWith(queryLower)) {
                        return result.businessId;
                    }
                }
                
                return results[0].businessId;
            }
        }
    } catch (error) {
        console.warn('CORS or network error searching company, checking mock data:', error);
    }
    
    return null;
}

function parseDecisionMakers(registeredNotices) {
    const decisionMakers = [];
    
    if (!registeredNotices || !registeredNotices.registeredEntries) {
        return null;
    }
    
    for (const entry of registeredNotices.registeredEntries) {
        const description = (entry.description || '').toLowerCase();
        
        if (['hallitus', 'toimitusjohtaja', 'johto', 'director', 'board'].some(kw => description.includes(kw))) {
            decisionMakers.push({
                'date': entry.registrationDate || 'N/A',
                'type': entry.entryCode || 'N/A',
                'description': entry.description || 'N/A',
                'authority': entry.authority || ''
            });
        }
    }
    
    return decisionMakers.length > 0 ? decisionMakers : null;
}

function extractCompanyBasics(ytjData) {
    if (!ytjData || !ytjData.results || !ytjData.results[0]) {
        return null;
    }
    
    const company = ytjData.results[0];
    return {
        'businessId': company.businessId || 'N/A',
        'name': company.name || 'N/A',
        'registrationDate': company.registrationDate || 'N/A',
        'companyForm': company.companyForm || 'N/A',
        'detailsUri': company.detailsUri || null
    };
}

function extractAllNames(ytjData) {
    if (!ytjData || !ytjData.results || !ytjData.results[0]) {
        return [];
    }
    
    const company = ytjData.results[0];
    const names = [];
    
    if (company.name) {
        names.push({ 'name': company.name, 'current': true });
    }
    
    if (company.auxiliaryNames) {
        for (const auxName of company.auxiliaryNames) {
            names.push({
                'name': auxName.name || 'N/A',
                'language': auxName.language || 'N/A',
                'current': false
            });
        }
    }
    
    return names;
}

function extractWebsite(ytjData) {
    if (!ytjData || !ytjData.results || !ytjData.results[0]) {
        return null;
    }
    
    const company = ytjData.results[0];
    
    if (company.contactDetails) {
        for (const contact of company.contactDetails) {
            if (contact.type === 'Kotisivun www-osoite') {
                return contact.value;
            }
        }
    }
    
    return null;
}

async function performSearch() {
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
    
    try {
        // Initialize API call counter
        let callsCount = 0;
        
        // Determine if query is business ID or name
        let businessId = null;
        if (BUSINESS_ID_PATTERN.test(query)) {
            businessId = query;
        } else {
            businessId = await searchCompanyByName(query);
        }
        
        if (!businessId) {
            throw new Error('Company not found');
        }
        
        const result = {
            businessId: businessId,
            calls_count: 0
        };
        
        // Fetch YTJ data if any related fields are requested
        if (state.fields.some(f => ['basics', 'website', 'names'].includes(f)) || state.fields.length === 0) {
            callsCount++;
            const ytjData = await fetchYTJData(businessId);
            
            // YTJ data is required for these fields; treat missing data as an error
            if (!ytjData) {
                throw new Error('Required YTJ data is unavailable');
            }
            
            if (state.fields.includes('rawJson')) {
                result.raw_ytj = ytjData;
            }
            
            if (state.fields.includes('basics') || state.fields.length === 0) {
                result.basics = extractCompanyBasics(ytjData);
            }
            
            if (state.fields.includes('names')) {
                result.names = extractAllNames(ytjData);
            }
            
            if (state.fields.includes('website')) {
                const website = extractWebsite(ytjData);
                if (website) {
                    result.website = { url: website };
                }
            }
        }
        
        // Fetch decision makers and/or registered entries
        if (state.fields.includes('decisionMakers') || state.fields.includes('registeredEntries')) {
            callsCount++;
            const registeredNotices = await fetchRegisteredNotices(businessId);
            
            if (registeredNotices) {
                if (state.fields.includes('rawJson')) {
                    result.raw_registered = registeredNotices;
                }
                
                if (state.fields.includes('decisionMakers')) {
                    const decisionMakers = parseDecisionMakers(registeredNotices);
                    result.decisionMakers = decisionMakers || 'not_available';
                }
                
                if (state.fields.includes('registeredEntries')) {
                    const entries = registeredNotices.registeredEntries || [];
                    result.registeredEntries = entries.slice(0, 20);
                }
            }
        }
        
        // Fetch financial periods
        if (state.fields.includes('financialPeriods')) {
            callsCount++;
            const financialData = await fetchFinancialPeriods(businessId);
            
            if (financialData) {
                if (state.fields.includes('rawJson')) {
                    result.raw_xbrl = financialData;
                }
                
                const financials = financialData.financials || [];
                if (financials.length > 0) {
                    const sortedFinancials = financials.sort((a, b) => 
                        (b.financialDate || '').localeCompare(a.financialDate || '')
                    );
                    result.financialPeriods = sortedFinancials;
                    result.latestFinancialDate = sortedFinancials[0].financialDate;
                    
                    // Auto-fetch latest financial XML if requested
                    if (state.fields.includes('latestFinancialXml') && state.autoLoadLatest && result.latestFinancialDate) {
                        callsCount++;
                        const xmlContent = await fetchFinancialXML(businessId, result.latestFinancialDate);
                        if (xmlContent) {
                            result.latestFinancialXml = xmlContent;
                        }
                    }
                }
            }
        }
        
        result.calls_count = callsCount;
        
        state.loading = false;
        state.company = result;
        state.apiCallsCount = result.calls_count;
        
        if (result.financialPeriods) {
            state.financialPeriods = result.financialPeriods;
            state.selectedFinancialDate = result.latestFinancialDate;
        }
        
        if (result.latestFinancialXml) {
            state.xml = result.latestFinancialXml;
        }
        
        displayResults();
    } catch (error) {
        state.loading = false;
        state.error = error.message;
        showError(error.message);
    }
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
    
    // Registered Entries
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

async function fetchSpecificFinancial(businessId, financialDate) {
    if (!businessId || !financialDate) return;
    
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'loading';
    loadingMsg.textContent = 'Fetching financial XML...';
    resultsContainer.appendChild(loadingMsg);
    
    try {
        const xmlContent = await fetchFinancialXML(businessId, financialDate);
        
        if (loadingMsg && loadingMsg.parentNode) {
            loadingMsg.parentNode.removeChild(loadingMsg);
        }
        
        if (!xmlContent) {
            throw new Error('Financial data not found');
        }
        
        state.xml = xmlContent;
        state.selectedFinancialDate = financialDate;
        
        // Remove existing XML section
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
    } catch (error) {
        if (loadingMsg && loadingMsg.parentNode) {
            loadingMsg.parentNode.removeChild(loadingMsg);
        }
        showError('Error fetching financial data: ' + error.message);
    }
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
