from http.server import BaseHTTPRequestHandler
import json
import requests
import sys
import os

# Add parent directory to path to import utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api.utils import create_response, API_VERSION

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
    
    def do_POST(self):
        """Test connection to Salesforce Document AI API with auto-discovery"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            access_token = data.get('access_token')
            instance_url = data.get('instance_url')
            current_version = data.get('api_version', 'v65.0')
            
            if not access_token or not instance_url:
                response = create_response(400, {
                    'success': False,
                    'error': 'Access token and instance URL are required'
                })
                self._send_response(response)
                return
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            # Versions to probe
            versions_to_try = ['v65.0', 'v64.0', 'v63.0', 'v62.0', 'v61.0', 'v60.0']
            # Move current version to top if it's not in the list
            if current_version not in versions_to_try:
                versions_to_try.insert(0, current_version)
            else:
                versions_to_try.remove(current_version)
                versions_to_try.insert(0, current_version)
                
            results = []
            
            for version in versions_to_try:
                try:
                    # 1. Check basic API access
                    api_url = f"{instance_url}/services/data/{version}"
                    resp = requests.get(api_url, headers=headers, timeout=5)
                    
                    if resp.status_code != 200:
                        results.append(f"{version}: API not accessible ({resp.status_code})")
                        continue
                        
                    # 2. Check Document AI Configurations endpoint
                    configs_url = f"{instance_url}/services/data/{version}/ssot/document-processing/configurations"
                    resp_conf = requests.get(configs_url, headers=headers, timeout=5)
                    
                    if resp_conf.status_code == 200:
                        configs = resp_conf.json()
                        response = create_response(200, {
                            'success': True,
                            'message': f'Document AI is enabled and accessible on {version}',
                            'api_version': version,
                            'configurations': configs,
                            'auto_updated': version != current_version
                        })
                        self._send_response(response)
                        return
                    
                    elif resp_conf.status_code == 404:
                        # Try the Extract Data endpoint directly
                        extract_url = f"{instance_url}/services/data/{version}/ssot/document-processing/actions/extract-data"
                        resp_extract = requests.post(extract_url, headers=headers, json={}, timeout=5)
                        
                        # 400 Bad Request means it exists but payload was empty (GOOD)
                        # 405 Method Not Allowed means it exists (GOOD)
                        if resp_extract.status_code in [400, 405]:
                            response = create_response(200, {
                                'success': True,
                                'message': f'Document AI Extract endpoint found on {version}',
                                'api_version': version,
                                'warning': 'Could not list configurations, but extraction endpoint exists.',
                                'auto_updated': version != current_version
                            })
                            self._send_response(response)
                            return
                        
                        results.append(f"{version}: IDP endpoints not found (404)")
                    else:
                        results.append(f"{version}: Error {resp_conf.status_code}")
                        
                except requests.exceptions.Timeout:
                    results.append(f"{version}: Timeout")
                except Exception as e:
                    results.append(f"{version}: Error - {str(e)}")
                    
            # If we get here, no version worked
            response = create_response(404, {
                'success': False,
                'error': 'Could not find working Document AI endpoint on any supported version.',
                'details': results,
                'suggestion': 'Ensure "Intelligent Document Processing" is enabled in Data Cloud Setup.'
            })
            self._send_response(response)
                
        except Exception as e:
            response = create_response(500, {
                'success': False,
                'error': f'Test failed: {str(e)}'
            })
            self._send_response(response)
    
    def _send_response(self, response):
        """Helper to send response"""
        self.send_response(response['statusCode'])
        for key, value in response['headers'].items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(response['body'].encode('utf-8'))

