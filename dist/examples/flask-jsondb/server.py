from flask import Flask, jsonify
from flask_cors import CORS
import os
from openlimedb import bp

# Create Flask app
app = Flask(__name__)

# Configure CORS (equivalent to Express cors middleware)
# For development: permissive CORS settings
CORS(app, 
     methods=['GET', 'POST', 'DELETE', 'PUT', 'OPTIONS'],
     origins=['*'],  # Allow all origins in development
     allow_headers=['*'],  # Allow all headers including cache-control
     supports_credentials=True)

# Server port
PORT = int(os.environ.get('PORT', 3000))

@app.route('/')
def root():
    """Main route"""
    return jsonify({'message': 'ok'})

@app.route('/favicon.ico')
def favicon():
    """Handle favicon requests to avoid 404 errors"""
    return '', 204

# Register blueprint on '/ol' (equivalent to app.use('/ol', router))
app.register_blueprint(bp, url_prefix='/ol')

# Error handler middleware (equivalent to Express middleware)
@app.errorhandler(Exception)
def handle_error(e):
    """Global error handling"""
    status_code = getattr(e, 'status_code', 500)
    print(f"Error: {str(e)}")
    return jsonify({'message': str(e)}), status_code

if __name__ == '__main__':
    print(f"openlimDB server listening at http://localhost:{PORT}")
    # For development: debug=True
    # For production: debug=False
    app.run(host='0.0.0.0', port=PORT, debug=True)