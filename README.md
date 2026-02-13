# PRH - Finnish Company Finder

Complete AI-powered search application for Finnish company data from PRH (Patentti- ja rekisterihallitus) APIs.

## 🌐 Live Demo

**GitHub Pages Version:** [https://anomfin.github.io/prh/](https://anomfin.github.io/prh/)

The GitHub Pages version is a static, client-side only version that attempts to call PRH APIs directly from your browser. Due to CORS policies, some API calls may be blocked, so mock data is provided for demonstration purposes. For full functionality, please use the Flask application below.

## Features

### Data Sources
- **YTJ (Business Information System)**: Company basics, names, website, addresses
- **Registered Notices**: Decision makers, registration entries
- **XBRL Financial Data**: Financial periods and detailed XML statements

### Capabilities
- ✅ Search by company name or Business ID (Y-tunnus)
- ✅ Selectable data fields to minimize API calls
- ✅ Auto-load latest financial statements
- ✅ Parse decision makers from registered notices
- ✅ Download financial XML files
- ✅ View raw JSON responses for debugging
- ✅ Track API calls per search
- ✅ Responsive modern UI

## Project Structure

```
prh/
├── app.py                 # Flask backend with API integration
├── requirements.txt       # Python dependencies
├── run_windows.bat        # Windows automated setup & launcher
├── templates/
│   └── index.html        # Main application page
├── static/
│   ├── app.js            # Frontend state management & UI
│   └── style.css         # Comprehensive styling
├── docs/                 # GitHub Pages static version
│   ├── index.html        # Standalone HTML (no Flask templating)
│   ├── app.js            # Client-side API calls with CORS handling
│   └── style.css         # Styling
└── README.md             # This file
```

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Internet connection (for API access)

## Installation & Setup

### Windows

#### Option 1: Automated Setup (Recommended)
Simply double-click `run_windows.bat`. It will:
1. Check Python installation
2. Create virtual environment (if needed)
3. Activate virtual environment
4. Install/upgrade all dependencies
5. Start the Flask application

#### Option 2: Manual Setup
```cmd
# Create virtual environment
python -m venv .venv

# Activate virtual environment
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the application
python app.py
```

### Linux / macOS

```bash
# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the application
python app.py
```

## Usage

1. **Start the application** (see installation above)
2. **Open your browser** and navigate to `http://localhost:5000`
3. **Select data fields** you want to fetch (checkboxes)
4. **Enter company name** or Business ID (format: 1234567-8)
5. **Click Search** or press Enter
6. **View results** organized by section
7. **Download XML** financial statements if needed

### Field Options

- **Company Basics** *(always included)*: Official name, Business ID, company form, registration date
- **Website**: Company website URL as clickable link
- **Names History**: All registered names including current and auxiliary names
- **Decision Makers**: Parsed board members and management (when available)
- **Registered Entries**: Raw registration notices and entries
- **Financial Periods List**: All available financial statement periods
- **Latest Financial XML**: Automatically fetched newest financial statement
- **Raw JSON Debug**: View complete API responses for troubleshooting

### Tips

- **Auto-load toggle**: Enable/disable automatic loading of latest financial XML
- **Financial period selector**: Choose specific period and fetch its XML
- **API counter**: Monitor how many API calls each search requires
- **Collapsible sections**: Click section headers to expand/collapse

## API Endpoints

### POST /api/search
Search for company and fetch selected data fields.

**Request Body:**
```json
{
  "q": "Nokia",
  "fields": ["basics", "website", "names", "decisionMakers", "registeredEntries", "financialPeriods", "latestFinancialXml"],
  "autoLoadLatest": true
}
```

**Response:**
```json
{
  "businessId": "0123456-7",
  "basics": { "businessId": "...", "name": "..." },
  "website": { "url": "..." },
  "names": [...],
  "decisionMakers": [...],
  "registeredEntries": [...],
  "financialPeriods": [...],
  "latestFinancialDate": "2023-12-31",
  "latestFinancialXml": "<?xml...",
  "calls_count": 4
}
```

### GET /api/financial/{businessId}/{financialDate}
Fetch specific financial XML for a company and date.

**Example:** `/api/financial/0123456-7/2023-12-31`

**Response:** XML content with `application/xml` content type

## Development

### Dependencies
- **Flask 3.0.0**: Web framework
- **Werkzeug 3.0.1**: WSGI utilities
- **requests 2.31.0**: HTTP library for API calls

### Environment Variables
- `FLASK_DEBUG`: Set to `true` to enable debug mode (default: `false`)

### Debug Mode
```bash
# Linux/Mac
FLASK_DEBUG=true python app.py

# Windows CMD
set FLASK_DEBUG=true
python app.py

# Windows PowerShell
$env:FLASK_DEBUG="true"
python app.py
```

## Architecture

### Frontend State Management
The application uses vanilla JavaScript with centralized state management:

```javascript
state = {
    query: '',           // Current search query
    fields: [],          // Selected data fields
    autoLoadLatest: true,// Auto-fetch latest financial
    company: null,       // Current company data
    financialPeriods: [],// Available periods
    selectedFinancialDate: null,
    xml: null,           // Current XML content
    loading: false,
    error: null,
    apiCallsCount: 0
}
```

### Backend Architecture
- **API Call Counter**: Tracks external API calls per request
- **Field Selection**: Only fetches requested data to minimize calls
- **Decision Maker Parser**: Attempts to extract decision makers from registered notices
- **Error Handling**: Graceful degradation when data unavailable

## Security

- Input validation on all endpoints
- XSS prevention via DOM methods
- Configurable debug mode (disabled in production)
- No API keys required (public PRH APIs)

## Troubleshooting

### Common Issues

**"Company not found"**
- Verify the company name spelling
- Try using the Business ID (Y-tunnus) instead
- Check if the company is registered in Finland

**"Decision makers not directly available"**
- Some companies don't have parseable decision maker data
- Check the "Registered Entries" section for raw data

**Financial data missing**
- Not all companies have financial statements in XBRL format
- Try a larger public company (e.g., "Nokia" with ID 0112038-9)

**Port 5000 already in use**
- Change the port in `app.py`: `app.run(..., port=5001)`
- Or stop other applications using port 5000

## API Rate Limits

PRH public APIs have rate limits. The application includes:
- API call counter to monitor usage
- Field selection to minimize calls
- Auto-load toggle to control when financial XML is fetched

## Example Companies

Try these well-known Finnish companies:

- **Nokia**: Business ID `0112038-9`
- **Rovio Entertainment**: Search by name
- **Supercell**: Search by name

## Deployment

### GitHub Pages (Static Version)

The static version is automatically deployed to GitHub Pages via GitHub Actions whenever changes are pushed to the `main` branch.

**Setup:**
1. Ensure GitHub Pages is enabled in repository settings
2. Set the source to "GitHub Actions"
3. The workflow in `.github/workflows/deploy-pages.yml` handles the deployment
4. The site is served from the `docs/` directory

**Limitations:**
- CORS policies may block direct API calls to PRH endpoints
- Mock data is provided as a fallback for demonstration
- For full functionality, use the Flask application

### Flask Application (Full Functionality)

For production deployment of the full Flask application:
1. Use a WSGI server like Gunicorn
2. Configure environment variables appropriately
3. Consider using a reverse proxy (nginx/Apache)
4. See deployment guides for Flask applications

## License

See LICENSE file for details.

## Contributing

This is a demonstration project showing integration with PRH public APIs.

## Acknowledgments

- Data provided by [PRH Open Data APIs](https://www.prh.fi/en/avoindata.html)
- YTJ, Registered Notices, and XBRL APIs
