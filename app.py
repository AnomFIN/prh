from flask import Flask, render_template, request, jsonify

app = Flask(__name__)


@app.route('/')
def index():
    """Render the main page"""
    return render_template('index.html')


@app.route('/search', methods=['POST'])
def search():
    """Handle company search requests"""
    data = request.get_json()
    query = data.get('query', '')
    
    # TODO: Implement actual PRH API integration
    # For now, return mock data
    results = {
        'query': query,
        'companies': []
    }
    
    return jsonify(results)


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
