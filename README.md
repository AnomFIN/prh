# PRH - Finnish Company Search

AI-based search engine for Finnish company details from Patentti- ja rekisterihallitus (Finnish Patent and Registration Office).

## Project Structure

```
prh/
├── app.py                 # Flask application
├── requirements.txt       # Python dependencies
├── run_windows.bat        # Windows startup script
├── templates/
│   └── index.html        # Main HTML template
├── static/
│   ├── app.js            # Frontend JavaScript
│   └── style.css         # Styling
└── README.md             # This file
```

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/AnomFIN/prh.git
   cd prh
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Application

### On Windows

Simply double-click `run_windows.bat` or run it from the command line:
```cmd
run_windows.bat
```

### On Linux/Mac

```bash
python app.py
```

The application will start on `http://localhost:5000`

## Usage

1. Open your web browser and navigate to `http://localhost:5000`
2. Enter a company name or business ID in the search field
3. Click "Search" or press Enter to search for companies
4. View the results displayed on the page

## Development

The application is built with:
- **Backend**: Flask (Python web framework)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **API**: RESTful endpoints for company search

## Future Enhancements

- Integration with PRH public API
- AI-powered search suggestions
- Advanced filtering options
- Export results to CSV/PDF
- Multi-language support

## License

See LICENSE file for details.
