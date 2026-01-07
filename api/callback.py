from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        """Handle OAuth callback - serve HTML page that exchanges code for token"""
        # Parse query parameters
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        
        code = params.get('code', [''])[0]
        error = params.get('error', [''])[0]
        state = params.get('state', [''])[0]
        
        if error:
            html = f'''<!DOCTYPE html>
<html>
<head>
    <title>Authentication Error</title>
    <meta http-equiv="refresh" content="3;url=/">
    <style>
        body {{ font-family: Arial, sans-serif; text-align: center; padding: 50px; }}
        .error {{ color: #d32f2f; background: #ffebee; padding: 20px; border-radius: 8px; }}
    </style>
</head>
<body>
    <div class="error">
        <h2>Authentication Error</h2>
        <p>{error}</p>
        <p>Redirecting to home page...</p>
    </div>
</body>
</html>'''
            self.send_response(400)
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            self.wfile.write(html.encode('utf-8'))
            return
        
        if not code:
            html = '''<!DOCTYPE html>
<html>
<head>
    <title>Authentication Error</title>
    <meta http-equiv="refresh" content="3;url=/">
</head>
<body>
    <div class="error">
        <h2>Authentication Error</h2>
        <p>No authorization code provided.</p>
        <p>Redirecting to home page...</p>
    </div>
</body>
</html>'''
            self.send_response(400)
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            self.wfile.write(html.encode('utf-8'))
            return
        
        # Render page that will exchange code for token via JavaScript
        html = f'''<!DOCTYPE html>
<html>
<head>
    <title>Completing Authentication...</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }}
        .container {{
            background: white;
            padding: 40px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 400px;
        }}
        .spinner {{
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }}
        .error-message {{
            color: #d32f2f;
            background: #ffebee;
            padding: 15px;
            border-radius: 6px;
            margin-top: 20px;
            display: none;
        }}
        @keyframes spin {{
            0% {{ transform: rotate(0deg); }}
            100% {{ transform: rotate(360deg); }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <h2>Completing Authentication...</h2>
        <div id="loader">
            <div class="spinner"></div>
            <p>Please wait while we complete your authentication.</p>
        </div>
        <div id="error" class="error-message"></div>
        <button id="retryBtn" onclick="window.location='/'" style="display:none; margin-top:20px; padding:10px 20px; background:#667eea; color:white; border:none; border-radius:6px; cursor:pointer;">Return to Home</button>
    </div>
    <script>
        (function() {{
            const code = '{code}';
            const state = '{state}';
            
            // Prevent duplicate execution
            if (window.authProcessing) return;
            window.authProcessing = true;
            
            function showError(msg) {{
                document.getElementById('loader').style.display = 'none';
                const errorDiv = document.getElementById('error');
                errorDiv.textContent = msg;
                errorDiv.style.display = 'block';
                document.getElementById('retryBtn').style.display = 'inline-block';
            }}

            // Get config from sessionStorage (stored before redirect)
            const savedConfig = sessionStorage.getItem('sf_config_temp');
            if (!savedConfig) {{
                showError('Configuration not found. Please configure the app first.');
                return;
            }}
            
            let config;
            try {{
                config = JSON.parse(savedConfig);
            }} catch (e) {{
                showError('Invalid configuration data.');
                return;
            }}
            
            fetch('/api/oauth/callback', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify({{
                    code: code,
                    state: state,
                    login_url: config.LOGIN_URL,
                    client_id: config.CLIENT_ID,
                    client_secret: config.CLIENT_SECRET
                }})
            }})
            .then(response => response.json())
            .then(data => {{
                if (data.success) {{
                    // Store tokens in localStorage
                    localStorage.setItem('sf_access_token', data.access_token);
                    localStorage.setItem('sf_instance_url', data.instance_url);
                    // Clear temp config
                    sessionStorage.removeItem('sf_config_temp');
                    sessionStorage.removeItem('oauth_state');
                    // Redirect to home
                    window.location.replace('/');
                }} else {{
                    showError('Authentication failed: ' + (data.error || 'Unknown error'));
                    sessionStorage.removeItem('sf_config_temp');
                }}
            }})
            .catch(error => {{
                console.error('Error:', error);
                showError('Authentication error. Please check console for details.');
                sessionStorage.removeItem('sf_config_temp');
            }});
        }})();
    </script>
</body>
</html>'''
        
        self.send_response(200)
        self.send_header('Content-Type', 'text/html')
        self.end_headers()
        self.wfile.write(html.encode('utf-8'))

