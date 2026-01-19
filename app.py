from flask import Flask, render_template, request, jsonify, Response
import requests
import re

app = Flask(__name__)

# API Configuration
YTJ_BASE_URL = "https://avoindata.prh.fi/bis/v1"
REGISTERED_NOTICES_BASE_URL = "https://avoindata.prh.fi/tr-kai/v1"
XBRL_BASE_URL = "https://xbrl.prh.fi/api"

# Mock data for demonstration (when APIs are unavailable)
MOCK_DATA = {
    "0112038-9": {  # Nokia
        "ytj": {
            "results": [{
                "businessId": "0112038-9",
                "name": "Nokia Oyj",
                "registrationDate": "1967-05-12",
                "companyForm": "Osakeyhtiö",
                "detailsUri": None,
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
                },
                {
                    "registrationDate": "2022-12-10",
                    "entryCode": "M01",
                    "description": "Muutos yhtiöjärjestyksessä",
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
        "xml": '''<?xml version="1.0" encoding="UTF-8"?>
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
    <!-- Sample financial data -->
    <Revenue contextRef="current" unitRef="EUR" decimals="0">23000000000</Revenue>
    <ProfitLoss contextRef="current" unitRef="EUR" decimals="0">1500000000</ProfitLoss>
    <Assets contextRef="current" unitRef="EUR" decimals="0">45000000000</Assets>
</xbrl>'''
    }
}

# Finnish Business ID pattern (Y-tunnus): 1234567-8
BUSINESS_ID_PATTERN = r'^\d{7}-\d$'

class APICallCounter:
    """Track API calls made during a search"""
    def __init__(self):
        self.count = 0
    
    def increment(self):
        self.count += 1
        return self.count
    
    def reset(self):
        self.count = 0


def fetch_ytj_data(business_id):
    """Fetch company data from YTJ API"""
    try:
        url = f"{YTJ_BASE_URL}/{business_id}"
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            return response.json()
    except (requests.RequestException, requests.Timeout, ConnectionError) as e:
        print(f"Error fetching YTJ data: {e}")
    
    # Fallback to mock data
    if business_id in MOCK_DATA:
        return MOCK_DATA[business_id]["ytj"]
    return None


def fetch_registered_notices(business_id):
    """Fetch registered notices from PRH API"""
    try:
        url = f"{REGISTERED_NOTICES_BASE_URL}/registerednotices/{business_id}"
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            return response.json()
    except (requests.RequestException, requests.Timeout, ConnectionError) as e:
        print(f"Error fetching registered notices: {e}")
    
    # Fallback to mock data
    if business_id in MOCK_DATA:
        return MOCK_DATA[business_id]["registered"]
    return None


def fetch_financial_periods(business_id):
    """Fetch financial periods from XBRL API"""
    try:
        url = f"{XBRL_BASE_URL}/financials/{business_id}"
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            return response.json()
    except (requests.RequestException, requests.Timeout, ConnectionError) as e:
        print(f"Error fetching financial periods: {e}")
    
    # Fallback to mock data
    if business_id in MOCK_DATA:
        return MOCK_DATA[business_id]["xbrl"]
    return None


def fetch_financial_xml(business_id, financial_date):
    """Fetch specific financial XML from XBRL API"""
    try:
        url = f"{XBRL_BASE_URL}/financial/{business_id}/{financial_date}"
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            return response.text
    except (requests.RequestException, requests.Timeout, ConnectionError) as e:
        print(f"Error fetching financial XML: {e}")
    
    # Fallback to mock data
    if business_id in MOCK_DATA:
        return MOCK_DATA[business_id]["xml"]
    return None


def parse_decision_makers(registered_notices):
    """Try to parse decision makers from registered notices"""
    decision_makers = []
    
    if not registered_notices or 'registeredEntries' not in registered_notices:
        return None
    
    # Look for entries that might contain decision maker information
    for entry in registered_notices.get('registeredEntries', []):
        description = entry.get('description', '').lower()
        authority = entry.get('authority', '')
        
        # Check for keywords indicating decision makers
        if any(keyword in description for keyword in ['hallitus', 'toimitusjohtaja', 'johto', 'director', 'board']):
            decision_makers.append({
                'date': entry.get('registrationDate', 'N/A'),
                'type': entry.get('entryCode', 'N/A'),
                'description': entry.get('description', 'N/A'),
                'authority': authority
            })
    
    return decision_makers if decision_makers else None


def extract_company_basics(ytj_data):
    """Extract basic company information from YTJ data"""
    if not ytj_data or 'results' not in ytj_data or not ytj_data['results']:
        return None
    
    company = ytj_data['results'][0]
    
    basics = {
        'businessId': company.get('businessId', 'N/A'),
        'name': company.get('name', 'N/A'),
        'registrationDate': company.get('registrationDate', 'N/A'),
        'companyForm': company.get('companyForm', 'N/A'),
        'detailsUri': company.get('detailsUri', None)
    }
    
    return basics


def extract_all_names(ytj_data):
    """Extract all company names from YTJ data"""
    if not ytj_data or 'results' not in ytj_data or not ytj_data['results']:
        return []
    
    company = ytj_data['results'][0]
    names = []
    
    # Get current name
    current_name = company.get('name')
    if current_name:
        names.append({'name': current_name, 'current': True})
    
    # Get auxiliary names if available
    if 'auxiliaryNames' in company:
        for aux_name in company['auxiliaryNames']:
            names.append({
                'name': aux_name.get('name', 'N/A'),
                'language': aux_name.get('language', 'N/A'),
                'current': False
            })
    
    return names


def extract_website(ytj_data):
    """Extract website URL from YTJ data"""
    if not ytj_data or 'results' not in ytj_data or not ytj_data['results']:
        return None
    
    company = ytj_data['results'][0]
    
    # Look for website in contact details
    if 'contactDetails' in company:
        for contact in company['contactDetails']:
            if contact.get('type') == 'Kotisivun www-osoite':
                return contact.get('value')
    
    return None


def search_company_by_name(query):
    """Search for a company by name using YTJ API"""
    # Check mock data first
    for bid, data in MOCK_DATA.items():
        if query.lower() in data["ytj"]["results"][0]["name"].lower():
            return bid
    
    try:
        url = f"{YTJ_BASE_URL}?totalResults=true&maxResults=1&resultsFrom=0&name={query}"
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get('results') and len(data['results']) > 0:
                return data['results'][0].get('businessId')
    except (requests.RequestException, requests.Timeout, ConnectionError) as e:
        print(f"Error searching company: {e}")
    
    return None


@app.route('/')
def index():
    """Render the main page"""
    return render_template('index.html')


@app.route('/api/search', methods=['POST'])
def api_search():
    """Handle company search with field selection"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid request'}), 400
    
    query = data.get('q', '').strip()
    fields = data.get('fields', [])
    auto_load_latest = data.get('autoLoadLatest', True)
    
    if not query:
        return jsonify({'error': 'Query is required'}), 400
    
    # Initialize API call counter
    counter = APICallCounter()
    
    # Determine if query is business ID or name
    business_id = None
    if re.match(BUSINESS_ID_PATTERN, query):
        business_id = query
    else:
        # Search by name
        counter.increment()
        business_id = search_company_by_name(query)
    
    if not business_id:
        return jsonify({
            'error': 'Company not found',
            'calls_count': counter.count
        }), 404
    
    result = {
        'businessId': business_id,
        'calls_count': 0
    }
    
    # Fetch YTJ data if any related fields are requested
    ytj_data = None
    if any(field in fields for field in ['basics', 'website', 'names']) or not fields:
        counter.increment()
        ytj_data = fetch_ytj_data(business_id)
        
        if ytj_data:
            result['raw_ytj'] = ytj_data if 'rawJson' in fields else None
            
            # Extract basics if requested
            if 'basics' in fields or not fields:
                result['basics'] = extract_company_basics(ytj_data)
            
            # Extract names if requested
            if 'names' in fields:
                result['names'] = extract_all_names(ytj_data)
            
            # Extract website if requested
            if 'website' in fields:
                website = extract_website(ytj_data)
                if website:
                    result['website'] = {'url': website}
    
    # Fetch decision makers and/or registered entries
    if 'decisionMakers' in fields or 'registeredEntries' in fields:
        counter.increment()
        registered_notices = fetch_registered_notices(business_id)
        
        if registered_notices:
            result['raw_registered'] = registered_notices if 'rawJson' in fields else None
            
            if 'decisionMakers' in fields:
                decision_makers = parse_decision_makers(registered_notices)
                if decision_makers:
                    result['decisionMakers'] = decision_makers
                else:
                    result['decisionMakers'] = 'not_available'
            
            if 'registeredEntries' in fields:
                entries = registered_notices.get('registeredEntries', [])
                result['registeredEntries'] = entries[:20]  # Limit to 20 most recent
    
    # Fetch financial periods
    if 'financialPeriods' in fields:
        counter.increment()
        financial_data = fetch_financial_periods(business_id)
        if financial_data:
            result['raw_xbrl'] = financial_data if 'rawJson' in fields else None
            
            financials = financial_data.get('financials', [])
            if financials:
                # Sort by date to find latest
                sorted_financials = sorted(
                    financials,
                    key=lambda x: x.get('financialDate', ''),
                    reverse=True
                )
                result['financialPeriods'] = sorted_financials
                
                # Get latest financial date
                if sorted_financials:
                    result['latestFinancialDate'] = sorted_financials[0].get('financialDate')
                    
                    # Auto-fetch latest financial XML if requested
                    if 'latestFinancialXml' in fields and auto_load_latest:
                        latest_date = result['latestFinancialDate']
                        counter.increment()
                        xml_content = fetch_financial_xml(business_id, latest_date)
                        if xml_content:
                            result['latestFinancialXml'] = xml_content
    
    result['calls_count'] = counter.count
    
    return jsonify(result)


@app.route('/api/financial/<business_id>/<financial_date>', methods=['GET'])
def api_get_financial(business_id, financial_date):
    """Fetch specific financial XML"""
    xml_content = fetch_financial_xml(business_id, financial_date)
    
    if xml_content:
        return Response(xml_content, mimetype='application/xml')
    else:
        return jsonify({'error': 'Financial data not found'}), 404


if __name__ == '__main__':
    import os
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(debug=debug_mode, host='0.0.0.0', port=5000)
