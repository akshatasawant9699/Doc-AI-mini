// State management
let currentStep = 0;
let uploadedFile = null;
let generatedSchema = null;
let extractedData = null;
let accessToken = null;
let instanceUrl = null;
let config = null;

// DOM elements
const step0 = document.getElementById('step0');
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const step3 = document.getElementById('step3');
const uploadForm = document.getElementById('uploadForm');
const processButton = document.getElementById('processButton');
const logoutButton = document.getElementById('logoutButton');
const authButton = document.getElementById('authButton');
const authStatus = document.getElementById('auth-status');
const authIcon = document.getElementById('auth-icon');
const authMessage = document.getElementById('auth-message');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadConfig();
    loadAuthState();
    setupEventListeners();
});

function setupEventListeners() {
    // Configuration form
    const configForm = document.getElementById('configForm');
    if (configForm) {
        configForm.addEventListener('submit', handleConfiguration);
    }
    
    // Authentication button (OAuth redirect)
    const authButton = document.getElementById('authButton');
    if (authButton) {
        authButton.addEventListener('click', function(e) {
            e.preventDefault();
            handleOAuthLogin();
        });
    }
    
    // Check for OAuth callback
    checkOAuthCallback();
    
    // File upload
    const fileInput = document.getElementById('file');
    if (fileInput) {
    fileInput.addEventListener('change', handleFileSelect);
    }
    
    // Drag and drop
    const fileUploadArea = document.getElementById('fileUploadArea');
    if (fileUploadArea) {
    fileUploadArea.addEventListener('dragover', handleDragOver);
    fileUploadArea.addEventListener('drop', handleDrop);
    fileUploadArea.addEventListener('dragleave', handleDragLeave);
    }
    
    // Upload form
    if (uploadForm) {
    uploadForm.addEventListener('submit', handleFileUpload);
    }
    
    // Schema editor
    const editSchemaBtn = document.getElementById('editSchemaBtn');
    if (editSchemaBtn) {
        editSchemaBtn.addEventListener('click', function() {
        const editor = document.getElementById('schemaEditor');
        editor.readOnly = !editor.readOnly;
        this.textContent = editor.readOnly ? 'Edit Schema' : 'Save Schema';
    });
    }
    
    // Process document
    if (processButton) {
        processButton.addEventListener('click', handleProcessDocument);
    }
    
    // Back button
    const backButton = document.getElementById('backButton');
    if (backButton) {
        backButton.addEventListener('click', function() {
            showStep(2);
        });
    }
    
    // Test connection button
    const testConnectionBtn = document.getElementById('testConnectionBtn');
    if (testConnectionBtn) {
        testConnectionBtn.addEventListener('click', testApiConnection);
    }
    
    // Download result
    const downloadResultBtn = document.getElementById('downloadResultBtn');
    if (downloadResultBtn) {
        downloadResultBtn.addEventListener('click', downloadResult);
    }
    
    // Logout
    if (logoutButton) {
    logoutButton.addEventListener('click', handleLogout);
    }
}

function loadConfig() {
    // Load configuration from localStorage
    const savedConfig = localStorage.getItem('sf_config');
    if (savedConfig) {
        try {
            config = JSON.parse(savedConfig);
            // Populate form fields if config exists
            if (document.getElementById('loginUrl')) {
                document.getElementById('loginUrl').value = config.LOGIN_URL || '';
            }
            if (document.getElementById('clientId')) {
                document.getElementById('clientId').value = config.CLIENT_ID || '';
            }
            if (document.getElementById('clientSecret')) {
                document.getElementById('clientSecret').value = config.CLIENT_SECRET || '';
            }
            if (document.getElementById('apiVersion')) {
                // If stored version is old v60.0 or missing, default to v65.0
                let version = config.API_VERSION || 'v65.0';
                if (version === 'v60.0') version = 'v65.0';
                document.getElementById('apiVersion').value = version;
                config.API_VERSION = version; // Update memory config too
            }
            if (document.getElementById('idpConfigName')) {
                document.getElementById('idpConfigName').value = config.IDP_CONFIG_NAME || '';
            }
            if (document.getElementById('defaultMlModel')) {
                document.getElementById('defaultMlModel').value = config.DEFAULT_ML_MODEL || 'llmgateway__VertexAIGemini20Flash001';
            }
        } catch (e) {
            console.error('Error loading config:', e);
            config = null;
        }
    }
}

function loadAuthState() {
    // Load token from localStorage
    accessToken = localStorage.getItem('sf_access_token');
    instanceUrl = localStorage.getItem('sf_instance_url');
    
    // Validate tokens - if they're empty strings, treat as null
    if (!accessToken || accessToken === 'null' || accessToken === 'undefined' || accessToken.trim() === '') {
        accessToken = null;
    }
    if (!instanceUrl || instanceUrl === 'null' || instanceUrl === 'undefined' || instanceUrl.trim() === '') {
        instanceUrl = null;
    }
    
    console.log('Auth state loaded:', { hasToken: !!accessToken, instanceUrl: instanceUrl });
    
    // Check if we have config
    const savedConfig = localStorage.getItem('sf_config');
    if (!savedConfig) {
        // No config, show step 0
        showStep(0);
        return;
    }
    
    if (accessToken && instanceUrl) {
        authIcon.textContent = '';
        authMessage.textContent = 'Authenticated with Salesforce';
        authStatus.className = 'auth-status authenticated';
        const authForm = document.getElementById('authForm');
        if (authForm) authForm.style.display = 'none';
        showStep(2);
    } else {
        authIcon.textContent = '';
        authMessage.textContent = 'Ready to authenticate';
        authStatus.className = 'auth-status';
        const authForm = document.getElementById('authForm');
        if (authForm) {
            authForm.style.display = 'block';
        }
        const authButton = document.getElementById('authButton');
        if (authButton) {
            authButton.style.display = 'block';
        }
        showStep(1);
    }
}

function showStep(stepNumber) {
    // Hide all steps
    if (step0) step0.classList.remove('active');
    if (step1) step1.classList.remove('active');
    if (step2) step2.classList.remove('active');
    if (step3) step3.classList.remove('active');
    
    // Show selected step
    if (stepNumber === 0 && step0) {
        step0.classList.add('active');
    } else if (stepNumber === 1 && step1) {
        step1.classList.add('active');
    } else if (stepNumber === 2 && step2) {
        step2.classList.add('active');
    } else if (stepNumber === 3 && step3) {
        step3.classList.add('active');
    }
    
    currentStep = stepNumber;
}

async function handleConfiguration(e) {
    e.preventDefault();
    
    const loginUrl = document.getElementById('loginUrl').value;
    const clientId = document.getElementById('clientId').value;
    const clientSecret = document.getElementById('clientSecret').value;
    const apiVersion = document.getElementById('apiVersion').value;
    const idpConfigName = document.getElementById('idpConfigName') ? document.getElementById('idpConfigName').value : '';
    const defaultMlModel = document.getElementById('defaultMlModel').value;
    
    const errorDiv = document.getElementById('configError');
    const successDiv = document.getElementById('configSuccess');
    
    if (errorDiv) errorDiv.style.display = 'none';
    if (successDiv) successDiv.style.display = 'none';
    
    if (!loginUrl || !clientId || !clientSecret || !apiVersion || !defaultMlModel) {
        showError('configError', 'All fields are required');
        return;
    }
    
    // Save configuration to localStorage
    config = {
        LOGIN_URL: loginUrl,
        CLIENT_ID: clientId,
        CLIENT_SECRET: clientSecret,
        API_VERSION: apiVersion,
        IDP_CONFIG_NAME: idpConfigName,
        DEFAULT_ML_MODEL: defaultMlModel
    };
    
    localStorage.setItem('sf_config', JSON.stringify(config));
    
    if (successDiv) {
        successDiv.textContent = 'Configuration saved successfully!';
        successDiv.style.display = 'block';
    }
    
    // Move to step 1 (authentication)
    setTimeout(() => {
        showStep(1);
        if (successDiv) successDiv.style.display = 'none';
    }, 1000);
}

function handleOAuthLogin() {
    // Get config from localStorage
    const savedConfig = localStorage.getItem('sf_config');
    if (!savedConfig) {
        showError('authError', 'Please configure Salesforce connection first');
        showStep(0);
            return;
        }

    config = JSON.parse(savedConfig);
    
    // Store config in sessionStorage so callback page can access it
    sessionStorage.setItem('sf_config_temp', savedConfig);
    
    // Build OAuth authorization URL
    const loginUrl = config.LOGIN_URL || 'login.salesforce.com';
    const clientId = config.CLIENT_ID;
    
    // Use the exact callback URL - must match Connected App configuration
    // For local development: http://localhost:5001/auth/callback
    // For production: https://your-domain.com/auth/callback
    const redirectUri = `${window.location.protocol}//${window.location.host}/auth/callback`;
    const encodedRedirectUri = encodeURIComponent(redirectUri);
    // Request scopes that match what's selected in Connected App
    // Selected scopes: "api", "full", "refresh_token offline_access"
    const scope = encodeURIComponent('api full refresh_token offline_access');
    
    // Generate state for CSRF protection
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('oauth_state', state);
    
    // Build authorization URL
    const authUrl = `https://${loginUrl}/services/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodedRedirectUri}&scope=${scope}&state=${state}`;
    
    console.log('Redirecting to Salesforce with:');
    console.log('  Redirect URI:', redirectUri);
    console.log('  Auth URL:', authUrl);
    
    // Redirect to Salesforce login
    window.location.href = authUrl;
}

async function handleAuthentication(e) {
    // This function is kept for backward compatibility but OAuth redirect is preferred
    handleOAuthLogin();
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        displayFileInfo(file);
        const uploadButton = document.getElementById('uploadButton');
        if (uploadButton) uploadButton.disabled = false;
    }
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.style.borderColor = '#667eea';
    e.currentTarget.style.background = '#f0f0ff';
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.style.borderColor = '#ccc';
    e.currentTarget.style.background = '#fafafa';
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.style.borderColor = '#ccc';
    e.currentTarget.style.background = '#fafafa';
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const fileInput = document.getElementById('file');
        if (fileInput) {
        fileInput.files = files;
        displayFileInfo(files[0]);
            const uploadButton = document.getElementById('uploadButton');
            if (uploadButton) uploadButton.disabled = false;
        }
    }
}

function displayFileInfo(file) {
    const fileInfo = document.getElementById('fileInfo');
    if (fileInfo) {
    const fileSize = (file.size / 1024).toFixed(2);
    fileInfo.innerHTML = `
        <strong>Selected:</strong> ${file.name}<br>
        <strong>Size:</strong> ${fileSize} KB<br>
        <strong>Type:</strong> ${file.type || 'Unknown'}
    `;
    fileInfo.style.display = 'block';
    uploadedFile = file;
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1]; // Remove data:type;base64, prefix
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function handleFileUpload(e) {
    e.preventDefault();
    
    if (!uploadedFile) {
        showError('uploadError', 'Please select a file');
        return;
    }
    
    if (!accessToken || !instanceUrl) {
        showError('uploadError', 'Please authenticate first');
        return;
    }
    
    const errorDiv = document.getElementById('uploadError');
    const successDiv = document.getElementById('uploadSuccess');
    const uploadButton = document.getElementById('uploadButton');
    
    if (errorDiv) errorDiv.style.display = 'none';
    if (successDiv) successDiv.style.display = 'none';
    
    if (uploadButton) {
    uploadButton.disabled = true;
    uploadButton.textContent = 'Uploading...';
    }
    
    try {
        // Convert file to base64
        const base64Data = await fileToBase64(uploadedFile);
        
        // Determine MIME type
        const mimeType = uploadedFile.type || 'application/pdf';
        
        const response = await fetch('/api/generate-schema', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: uploadedFile.name,
                mime_type: mimeType,
                base64_data: base64Data
            })
        });
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            throw new Error(`Server returned non-JSON response: ${text.substring(0, 200)}`);
        }
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            generatedSchema = data.schema;
            
            // Display schema
            const schemaEditor = document.getElementById('schemaEditor');
            if (schemaEditor) {
            schemaEditor.value = JSON.stringify(generatedSchema, null, 2);
            }
            const schemaSection = document.getElementById('schemaSection');
            if (schemaSection) {
                schemaSection.style.display = 'block';
            }
            
            if (successDiv) {
            successDiv.textContent = `Schema generated successfully for ${data.filename}`;
            successDiv.style.display = 'block';
            }
            
            // Show step 3 after a delay
            setTimeout(() => {
                showStep(3);
                if (successDiv) successDiv.style.display = 'none';
            }, 1500);
        } else {
            showError('uploadError', data.error || 'Failed to generate schema');
        }
    } catch (error) {
        showError('uploadError', 'Network error: ' + error.message);
    } finally {
        if (uploadButton) {
        uploadButton.disabled = false;
        uploadButton.textContent = 'Upload & Generate Schema';
        }
    }
}

async function handleProcessDocument() {
    const errorDiv = document.getElementById('processError');
    const resultSection = document.getElementById('resultSection');
    const processingStatus = document.getElementById('processingStatus');
    const resultContent = document.getElementById('resultContent'); // Kept for reference but not used in table mode
    
    if (errorDiv) errorDiv.style.display = 'none';
    if (resultSection) resultSection.style.display = 'none';
    if (processingStatus) processingStatus.style.display = 'block';
    if (processButton) processButton.disabled = true;
    
    if (!accessToken || !instanceUrl) {
        showError('processError', 'Please authenticate first');
        if (processingStatus) processingStatus.style.display = 'none';
        if (processButton) processButton.disabled = false;
        return;
    }
    
    // Ensure instance URL has https:// prefix
    let formattedInstanceUrl = instanceUrl;
    if (!formattedInstanceUrl.startsWith('http')) {
        formattedInstanceUrl = 'https://' + formattedInstanceUrl;
    }
    
    if (!uploadedFile) {
        showError('processError', 'Please upload a file first');
        if (processingStatus) processingStatus.style.display = 'none';
        if (processButton) processButton.disabled = false;
        return;
    }
    
    // Get config
    const savedConfig = localStorage.getItem('sf_config');
    if (!savedConfig) {
        showError('processError', 'Configuration missing');
        if (processingStatus) processingStatus.style.display = 'none';
        if (processButton) processButton.disabled = false;
        return;
    }
    config = JSON.parse(savedConfig);
    
    try {
        // Get schema from editor
        const schemaEditor = document.getElementById('schemaEditor');
        let schema;
        try {
            schema = JSON.parse(schemaEditor.value);
        } catch (e) {
            throw new Error('Invalid JSON schema. Please check the schema format.');
        }
        
        const mlModel = document.getElementById('mlModel');
        const mlModelValue = mlModel ? mlModel.value : config.DEFAULT_ML_MODEL;
        
        // Convert file to base64
        const base64Data = await fileToBase64(uploadedFile);
        const mimeType = uploadedFile.type || 'application/pdf';
        
        const response = await fetch('/api/process-document', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                access_token: accessToken,
                instance_url: formattedInstanceUrl,
                schema: schema,
                mlModel: mlModelValue,
                api_version: config.API_VERSION,
                file: {
                    mime_type: mimeType,
                    base64_data: base64Data
                }
            })
        });
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            throw new Error(`Server returned non-JSON response: ${text.substring(0, 200)}`);
        }
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            extractedData = data.data;
            console.log('Extracted Data:', extractedData);
            
            const resultContainer = document.getElementById('resultContainer');
            if (resultContainer) {
                // Clear previous content
                resultContainer.innerHTML = '';
                
                // Process the extracted data
                let displayData = extractedData;
                
                // Log raw data for debugging
                console.log('Raw extracted data:', JSON.stringify(extractedData, null, 2).substring(0, 2000));
                
                // Helper function: Extract value from {type, value, confidence} structure
                function extractValue(val) {
                    if (val && typeof val === 'object' && !Array.isArray(val)) {
                        // Check if it has 'value' property (Salesforce Document AI format)
                        if ('value' in val) {
                            return val.value;
                        }
                    }
                    return val;
                }
                
                // Helper function: Extract confidence score from {value, confidence_score} or {value, confidence} structure
                function extractConfidence(val) {
                    if (val && typeof val === 'object' && !Array.isArray(val)) {
                        // Check for confidence_score first (Salesforce Document AI format)
                        if ('confidence_score' in val) {
                            return val.confidence_score;
                        }
                        // Fallback to confidence
                        if ('confidence' in val) {
                            return val.confidence;
                        }
                    }
                    return null;
                }
                
                // Helper function: Create confidence badge
                function createConfidenceBadge(confidence) {
                    if (confidence === null || confidence === undefined) return null;
                    
                    const badge = document.createElement('span');
                    badge.className = 'confidence-badge';
                    const percent = Math.round(confidence * 100);
                    badge.textContent = `${percent}%`;
                    
                    // Color code based on confidence level
                    if (confidence >= 0.9) {
                        badge.style.background = '#e8f5e9';
                        badge.style.color = '#2e7d32';
                        badge.style.border = '1px solid #a5d6a7';
                    } else if (confidence >= 0.7) {
                        badge.style.background = '#fff8e1';
                        badge.style.color = '#f57f17';
                        badge.style.border = '1px solid #ffcc80';
                    } else {
                        badge.style.background = '#ffebee';
                        badge.style.color = '#c62828';
                        badge.style.border = '1px solid #ef9a9a';
                    }
                    
                    badge.style.padding = '2px 6px';
                    badge.style.borderRadius = '4px';
                    badge.style.fontSize = '11px';
                    badge.style.fontWeight = '500';
                    badge.style.marginLeft = '8px';
                    badge.title = `Confidence: ${(confidence * 100).toFixed(1)}%`;
                    
                    return badge;
                }
                
                // Helper function: Check if value is a nested array of objects (items, line items, etc.)
                function isNestedArray(val) {
                    // First extract value if wrapped
                    let checkVal = val;
                    if (val && typeof val === 'object' && !Array.isArray(val) && 'value' in val) {
                        checkVal = val.value;
                    }
                    if (!Array.isArray(checkVal) || checkVal.length === 0) return false;
                    // Check if first item is an object (not primitive)
                    const firstItem = checkVal[0];
                    return firstItem !== null && typeof firstItem === 'object';
                }
                
                // Helper function: Get array from potentially wrapped value
                function getNestedArray(val) {
                    if (Array.isArray(val)) return val;
                    if (val && typeof val === 'object' && 'value' in val && Array.isArray(val.value)) {
                        return val.value;
                    }
                    return null;
                }
                
                // Helper function: Check if value is a nested object (not a simple {type, value} wrapper)
                function isNestedObject(val) {
                    if (!val || typeof val !== 'object' || Array.isArray(val)) return false;
                    // If it only has 'type' and 'value' keys, it's a wrapper, not nested
                    const keys = Object.keys(val);
                    if (keys.length <= 2 && keys.includes('value')) return false;
                    // If it has multiple properties or properties other than type/value, it's nested
                    return keys.length > 0;
                }
                
                // Helper function: Create a simple key-value table
                function createKeyValueTable(data, title) {
                    const wrapper = document.createElement('div');
                    wrapper.style.marginBottom = '20px';
                    
                    if (title) {
                        const h4 = document.createElement('h4');
                        h4.textContent = title;
                        h4.style.marginBottom = '10px';
                        h4.style.color = '#333';
                        wrapper.appendChild(h4);
                    }
                    
                    const table = document.createElement('table');
                    table.className = 'results-table';
                    
                    const thead = document.createElement('thead');
                    const headerRow = document.createElement('tr');
                    const thKey = document.createElement('th');
                    thKey.textContent = 'Field';
                    const thValue = document.createElement('th');
                    thValue.textContent = 'Value';
                    const thConfidence = document.createElement('th');
                    thConfidence.textContent = 'Confidence';
                    thConfidence.style.width = '100px';
                    thConfidence.style.textAlign = 'center';
                    headerRow.appendChild(thKey);
                    headerRow.appendChild(thValue);
                    headerRow.appendChild(thConfidence);
                    thead.appendChild(headerRow);
                    table.appendChild(thead);
                    
                    const tbody = document.createElement('tbody');
                    
                    for (const [key, rawValue] of Object.entries(data)) {
                        const value = extractValue(rawValue);
                        const confidence = extractConfidence(rawValue);
                        
                        // Skip nested arrays - they'll be rendered as separate tables
                        const nestedArr = getNestedArray(rawValue) || getNestedArray(value);
                        if (nestedArr && nestedArr.length > 0 && typeof nestedArr[0] === 'object') {
                            continue;
                        }
                        
                        // Skip nested objects - they'll be rendered as separate tables
                        if (isNestedObject(value)) {
                            continue;
                        }
                        
                        const row = document.createElement('tr');
                        const tdKey = document.createElement('td');
                        const tdValue = document.createElement('td');
                        const tdConfidence = document.createElement('td');
                        tdConfidence.style.textAlign = 'center';
                        
                        tdKey.textContent = key;
                        tdKey.style.fontWeight = '500';
                        
                        if (value === null || value === undefined) {
                            tdValue.textContent = '-';
                            tdValue.style.color = '#999';
                        } else if (Array.isArray(value)) {
                            // Check if it's an array of objects (nested) - show indicator
                            if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
                                tdValue.textContent = `[${value.length} item(s) - see table below]`;
                                tdValue.style.color = '#667eea';
                                tdValue.style.fontStyle = 'italic';
                            } else {
                                // Simple array of primitives
                                tdValue.textContent = value.map(v => String(v)).join(', ');
                            }
                        } else if (typeof value === 'object') {
                            // Check if it's a simple wrapper or complex object
                            const keys = Object.keys(value);
                            if (keys.length > 3) {
                                tdValue.textContent = `[Nested object - see table below]`;
                                tdValue.style.color = '#764ba2';
                                tdValue.style.fontStyle = 'italic';
                            } else {
                                // Simple object - show as JSON
                                tdValue.textContent = JSON.stringify(value, null, 2);
                                tdValue.style.whiteSpace = 'pre-wrap';
                                tdValue.style.fontFamily = 'monospace';
                                tdValue.style.fontSize = '12px';
                            }
                        } else {
                            tdValue.textContent = String(value);
                        }
                        
                        // Add confidence badge
                        const badge = createConfidenceBadge(confidence);
                        if (badge) {
                            tdConfidence.appendChild(badge);
                        } else {
                            tdConfidence.textContent = '-';
                            tdConfidence.style.color = '#999';
                        }
                        
                        row.appendChild(tdKey);
                        row.appendChild(tdValue);
                        row.appendChild(tdConfidence);
                        tbody.appendChild(row);
                    }
                    
                    table.appendChild(tbody);
                    wrapper.appendChild(table);
                    return wrapper;
                }
                
                // Helper function: Create items table (for line items, nested arrays)
                function createItemsTable(items, title) {
                    const wrapper = document.createElement('div');
                    wrapper.style.marginTop = '20px';
                    wrapper.style.marginBottom = '20px';
                    
                    const h4 = document.createElement('h4');
                    h4.textContent = title || 'Items';
                    h4.style.marginBottom = '10px';
                    h4.style.color = '#333';
                    h4.style.borderBottom = '2px solid #667eea';
                    h4.style.paddingBottom = '5px';
                    wrapper.appendChild(h4);
                    
                    const table = document.createElement('table');
                    table.className = 'results-table';
                    table.style.width = '100%';
                    
                    // Get all unique keys from items, extracting from nested structures
                    const allKeys = new Set();
                    let hasConfidence = false;
                    items.forEach(item => {
                        if (item && typeof item === 'object') {
                            Object.keys(item).forEach(k => {
                                // Skip 'type' key if it's just a type indicator
                                if (k !== 'type' || typeof item[k] !== 'string') {
                                    allKeys.add(k);
                                }
                                // Check if any field has confidence
                                if (item[k] && typeof item[k] === 'object' && 'confidence' in item[k]) {
                                    hasConfidence = true;
                                }
                            });
                        }
                    });
                    const columns = Array.from(allKeys);
                    
                    // Create header
                    const thead = document.createElement('thead');
                    const headerRow = document.createElement('tr');
                    columns.forEach(col => {
                        const th = document.createElement('th');
                        th.textContent = col;
                        th.style.background = '#667eea';
                        th.style.color = 'white';
                        th.style.padding = '10px';
                        th.style.textAlign = 'left';
                        headerRow.appendChild(th);
                    });
                    thead.appendChild(headerRow);
                    table.appendChild(thead);
                    
                    // Create body
                    const tbody = document.createElement('tbody');
                    items.forEach((item, idx) => {
                        const row = document.createElement('tr');
                        row.style.background = idx % 2 === 0 ? '#f9f9f9' : '#ffffff';
                        
                        columns.forEach(col => {
                            const td = document.createElement('td');
                            td.style.padding = '10px';
                            td.style.borderBottom = '1px solid #eee';
                            
                            const rawValue = item[col];
                            const value = extractValue(rawValue);
                            const confidence = extractConfidence(rawValue);
                            
                            if (value === null || value === undefined) {
                                td.textContent = '-';
                                td.style.color = '#999';
                            } else if (Array.isArray(value)) {
                                td.textContent = value.join(', ');
                            } else if (typeof value === 'object') {
                                // Nested object in items - show as formatted JSON
                                td.textContent = JSON.stringify(value, null, 2);
                                td.style.whiteSpace = 'pre-wrap';
                                td.style.fontFamily = 'monospace';
                                td.style.fontSize = '11px';
                            } else {
                                // Create a span for value to allow badge beside it
                                const valueSpan = document.createElement('span');
                                valueSpan.textContent = String(value);
                                td.appendChild(valueSpan);
                                
                                // Add confidence badge inline if present
                                const badge = createConfidenceBadge(confidence);
                                if (badge) {
                                    td.appendChild(badge);
                                }
                            }
                            row.appendChild(td);
                        });
                        tbody.appendChild(row);
                    });
                    
                    table.appendChild(tbody);
                    wrapper.appendChild(table);
                    return wrapper;
                }
                
                // Helper function: Create a nested object table
                function createNestedObjectTable(obj, title) {
                    const wrapper = document.createElement('div');
                    wrapper.style.marginTop = '20px';
                    wrapper.style.marginBottom = '20px';
                    
                    const h4 = document.createElement('h4');
                    h4.textContent = title || 'Details';
                    h4.style.marginBottom = '10px';
                    h4.style.color = '#333';
                    h4.style.borderBottom = '2px solid #764ba2';
                    h4.style.paddingBottom = '5px';
                    wrapper.appendChild(h4);
                    
                    const table = document.createElement('table');
                    table.className = 'results-table';
                    table.style.width = '100%';
                    
                    const thead = document.createElement('thead');
                    const headerRow = document.createElement('tr');
                    const thKey = document.createElement('th');
                    thKey.textContent = 'Field';
                    thKey.style.background = '#764ba2';
                    thKey.style.color = 'white';
                    thKey.style.padding = '10px';
                    const thValue = document.createElement('th');
                    thValue.textContent = 'Value';
                    thValue.style.background = '#764ba2';
                    thValue.style.color = 'white';
                    thValue.style.padding = '10px';
                    const thConfidence = document.createElement('th');
                    thConfidence.textContent = 'Confidence';
                    thConfidence.style.background = '#764ba2';
                    thConfidence.style.color = 'white';
                    thConfidence.style.padding = '10px';
                    thConfidence.style.width = '100px';
                    thConfidence.style.textAlign = 'center';
                    headerRow.appendChild(thKey);
                    headerRow.appendChild(thValue);
                    headerRow.appendChild(thConfidence);
                    thead.appendChild(headerRow);
                    table.appendChild(thead);
                    
                    const tbody = document.createElement('tbody');
                    
                    Object.entries(obj).forEach(([key, rawValue], idx) => {
                        const value = extractValue(rawValue);
                        const confidence = extractConfidence(rawValue);
                        const row = document.createElement('tr');
                        row.style.background = idx % 2 === 0 ? '#f9f9f9' : '#ffffff';
                        
                        const tdKey = document.createElement('td');
                        tdKey.textContent = key;
                        tdKey.style.fontWeight = '500';
                        tdKey.style.padding = '10px';
                        tdKey.style.borderBottom = '1px solid #eee';
                        
                        const tdValue = document.createElement('td');
                        tdValue.style.padding = '10px';
                        tdValue.style.borderBottom = '1px solid #eee';
                        
                        const tdConfidence = document.createElement('td');
                        tdConfidence.style.padding = '10px';
                        tdConfidence.style.borderBottom = '1px solid #eee';
                        tdConfidence.style.textAlign = 'center';
                        
                        if (value === null || value === undefined) {
                            tdValue.textContent = '-';
                            tdValue.style.color = '#999';
                        } else if (Array.isArray(value)) {
                            tdValue.textContent = value.join(', ');
                        } else if (typeof value === 'object') {
                            tdValue.textContent = JSON.stringify(value, null, 2);
                            tdValue.style.whiteSpace = 'pre-wrap';
                            tdValue.style.fontFamily = 'monospace';
                            tdValue.style.fontSize = '11px';
                        } else {
                            tdValue.textContent = String(value);
                        }
                        
                        // Add confidence badge
                        const badge = createConfidenceBadge(confidence);
                        if (badge) {
                            tdConfidence.appendChild(badge);
                        } else {
                            tdConfidence.textContent = '-';
                            tdConfidence.style.color = '#999';
                        }
                        
                        row.appendChild(tdKey);
                        row.appendChild(tdValue);
                        row.appendChild(tdConfidence);
                        tbody.appendChild(row);
                    });
                    
                    table.appendChild(tbody);
                    wrapper.appendChild(table);
                    return wrapper;
                }
                
                // Helper function: Create invoice card with all fields
                function createInvoiceCard(invoiceData, index) {
                    const card = document.createElement('div');
                    card.style.cssText = 'border: 1px solid #ddd; border-radius: 8px; margin-bottom: 20px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);';
                    
                    // Card header
                    const header = document.createElement('div');
                    header.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 20px; font-weight: 600; font-size: 16px;';
                    
                    // Get invoice number for header
                    const invoiceNum = extractValue(invoiceData.invoice_number) || `Document ${index + 1}`;
                    const docType = extractValue(invoiceData.document_type) || 'Invoice';
                    header.textContent = `${docType} #${index + 1}: ${invoiceNum}`;
                    card.appendChild(header);
                    
                    // Card body
                    const body = document.createElement('div');
                    body.style.cssText = 'padding: 20px;';
                    
                    // Create table for this invoice's fields
                    const table = document.createElement('table');
                    table.className = 'results-table';
                    table.style.cssText = 'width: 100%; border-collapse: collapse;';
                    
                    const thead = document.createElement('thead');
                    const headerRow = document.createElement('tr');
                    ['Field', 'Value', 'Confidence'].forEach(text => {
                        const th = document.createElement('th');
                        th.textContent = text;
                        th.style.cssText = 'background: #f5f5f5; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; font-weight: 600;';
                        if (text === 'Confidence') th.style.width = '100px';
                        headerRow.appendChild(th);
                    });
                    thead.appendChild(headerRow);
                    table.appendChild(thead);
                    
                    const tbody = document.createElement('tbody');
                    let lineItemsData = null;
                    
                    // Process each field
                    Object.entries(invoiceData).forEach(([key, rawValue], idx) => {
                        // Check for line_items - handle separately
                        if (key === 'line_items') {
                            lineItemsData = getNestedArray(rawValue) || extractValue(rawValue);
                            return;
                        }
                        
                        const value = extractValue(rawValue);
                        const confidence = extractConfidence(rawValue);
                        
                        // Skip null values for cleaner display
                        if (value === null || value === 'null' || value === undefined) return;
                        
                        const row = document.createElement('tr');
                        row.style.background = idx % 2 === 0 ? '#fafafa' : '#ffffff';
                        
                        const tdKey = document.createElement('td');
                        tdKey.textContent = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        tdKey.style.cssText = 'padding: 10px; border-bottom: 1px solid #eee; font-weight: 500; color: #333;';
                        
                        const tdValue = document.createElement('td');
                        tdValue.style.cssText = 'padding: 10px; border-bottom: 1px solid #eee;';
                        if (typeof value === 'object') {
                            tdValue.textContent = JSON.stringify(value);
                            tdValue.style.fontFamily = 'monospace';
                            tdValue.style.fontSize = '12px';
                        } else {
                            tdValue.textContent = String(value);
                        }
                        
                        const tdConfidence = document.createElement('td');
                        tdConfidence.style.cssText = 'padding: 10px; border-bottom: 1px solid #eee; text-align: center;';
                        const badge = createConfidenceBadge(confidence);
                        if (badge) {
                            tdConfidence.appendChild(badge);
                        } else {
                            tdConfidence.textContent = '-';
                            tdConfidence.style.color = '#999';
                        }
                        
                        row.appendChild(tdKey);
                        row.appendChild(tdValue);
                        row.appendChild(tdConfidence);
                        tbody.appendChild(row);
                    });
                    
                    table.appendChild(tbody);
                    body.appendChild(table);
                    
                    // Add line items if present
                    if (lineItemsData && Array.isArray(lineItemsData) && lineItemsData.length > 0) {
                        const lineItemsSection = document.createElement('div');
                        lineItemsSection.style.cssText = 'margin-top: 20px;';
                        
                        const lineItemsTitle = document.createElement('h5');
                        lineItemsTitle.textContent = `Line Items (${lineItemsData.length})`;
                        lineItemsTitle.style.cssText = 'margin: 0 0 10px 0; color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 5px;';
                        lineItemsSection.appendChild(lineItemsTitle);
                        
                        const lineItemsTable = createItemsTable(lineItemsData, '');
                        lineItemsSection.appendChild(lineItemsTable);
                        body.appendChild(lineItemsSection);
                    }
                    
                    card.appendChild(body);
                    return card;
                }
                
                // Process the data - handle invoices array structure
                if (displayData && typeof displayData === 'object') {
                    // Check for invoices array (the benchpress format)
                    let invoicesArray = null;
                    let documentSummary = null;
                    
                    // Try to find invoices or documents array
                    if (displayData.invoices) {
                        invoicesArray = getNestedArray(displayData.invoices) || extractValue(displayData.invoices);
                    }
                    if (displayData.documents) {
                        invoicesArray = getNestedArray(displayData.documents) || extractValue(displayData.documents);
                    }
                    if (displayData.document_summary) {
                        documentSummary = extractValue(displayData.document_summary) || displayData.document_summary;
                    }
                    if (displayData.extraction_summary) {
                        documentSummary = extractValue(displayData.extraction_summary) || displayData.extraction_summary;
                    }
                    
                    // If we found an invoices/documents array, display each one
                    if (invoicesArray && Array.isArray(invoicesArray) && invoicesArray.length > 0) {
                        // Summary header
                        const summaryDiv = document.createElement('div');
                        summaryDiv.style.cssText = 'background: #e3f2fd; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px;';
                        summaryDiv.innerHTML = `<strong>Extracted ${invoicesArray.length} document(s)</strong> from the combined file.`;
                        resultContainer.appendChild(summaryDiv);
                        
                        // Create a card for each invoice
                        invoicesArray.forEach((invoice, idx) => {
                            const card = createInvoiceCard(invoice, idx);
                            resultContainer.appendChild(card);
                        });
                        
                        // Show document summary if available
                        if (documentSummary && typeof documentSummary === 'object') {
                            const summaryTable = createNestedObjectTable(documentSummary, 'Document Summary');
                            resultContainer.appendChild(summaryTable);
                        }
                    } else {
                        // Fallback: show as key-value table for single document
                        const keys = Object.keys(displayData);
                        
                        if (keys.length === 0) {
                            resultContainer.innerHTML = '<p style="color: #666; text-align: center;">No data extracted from document.</p>';
                        } else {
                            // Create main table for simple fields
                            const mainTable = createKeyValueTable(displayData, 'Extracted Data');
                            resultContainer.appendChild(mainTable);
                            
                            // Create separate tables for nested arrays and objects
                            for (const key of keys) {
                                const rawValue = displayData[key];
                                const value = extractValue(rawValue);
                                
                                // Handle nested arrays (Items, line items, etc.)
                                const nestedArr = getNestedArray(rawValue) || getNestedArray(value);
                                if (nestedArr && nestedArr.length > 0 && typeof nestedArr[0] === 'object') {
                                    const itemsTable = createItemsTable(nestedArr, key);
                                    resultContainer.appendChild(itemsTable);
                                }
                                // Handle nested objects
                                else if (isNestedObject(value)) {
                                    const nestedTable = createNestedObjectTable(value, key);
                                    resultContainer.appendChild(nestedTable);
                                }
                            }
                        }
                    }
                } else if (Array.isArray(displayData)) {
                    if (isNestedArray(displayData)) {
                        const itemsTable = createItemsTable(displayData, 'Items');
                        resultContainer.appendChild(itemsTable);
                    } else {
                        // Simple array of primitives
                        const pre = document.createElement('pre');
                        pre.textContent = JSON.stringify(displayData, null, 2);
                        pre.style.margin = '0';
                        pre.style.whiteSpace = 'pre-wrap';
                        resultContainer.appendChild(pre);
                    }
                } else {
                    // Fallback: show as JSON
                    const pre = document.createElement('pre');
                    pre.textContent = JSON.stringify(displayData, null, 2);
                    pre.style.margin = '0';
                    pre.style.whiteSpace = 'pre-wrap';
                    resultContainer.appendChild(pre);
                }
            }
            
            if (resultSection) {
                resultSection.style.display = 'block';
            }
        } else {
            showError('processError', data.error || 'Failed to process document');
        }
    } catch (error) {
        showError('processError', 'Error: ' + error.message);
    } finally {
        if (processingStatus) processingStatus.style.display = 'none';
        if (processButton) processButton.disabled = false;
    }
}

function downloadResult() {
    if (!extractedData) return;
    
    const dataStr = JSON.stringify(extractedData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'extracted-data.json';
    link.click();
    URL.revokeObjectURL(url);
}

async function handleLogout(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    if (confirm('Are you sure you want to logout?')) {
        // Clear tokens but keep config
        localStorage.removeItem('sf_access_token');
        localStorage.removeItem('sf_instance_url');
        accessToken = null;
        instanceUrl = null;
        
            // Clear local state
            uploadedFile = null;
            generatedSchema = null;
            extractedData = null;
        
            // Reset forms
        if (uploadForm) uploadForm.reset();
        
        // Clear OAuth state
        sessionStorage.removeItem('oauth_state');
        
        // Reset UI elements
        const authForm = document.getElementById('authForm');
        if (authForm) {
            authForm.style.display = 'block';
        }
        const authButton = document.getElementById('authButton');
        if (authButton) {
            authButton.style.display = 'block';
        }
        
        // Reset auth status
        if (authIcon) authIcon.textContent = '';
        if (authMessage) authMessage.textContent = 'Ready to authenticate';
        if (authStatus) authStatus.className = 'auth-status';
        
        // Go back to step 1 (authentication, config is still saved)
        showStep(1);
    }
    return false;
}

function checkOAuthCallback() {
    // Check if we're returning from OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    const state = urlParams.get('state');
    
    if (error) {
        showError('authError', `OAuth error: ${error}`);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }
    
    if (code) {
        // Verify state
        const savedState = sessionStorage.getItem('oauth_state');
        if (state !== savedState) {
            showError('authError', 'Invalid state parameter. Please try again.');
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }
        
        // Exchange code for token
        exchangeCodeForToken(code);
    }
}

async function exchangeCodeForToken(code) {
    const errorDiv = document.getElementById('authError');
    const successDiv = document.getElementById('authSuccess');
    
    if (errorDiv) errorDiv.style.display = 'none';
    if (successDiv) successDiv.style.display = 'none';
    
    // Get config
    const savedConfig = localStorage.getItem('sf_config');
    if (!savedConfig) {
        showError('authError', 'Configuration missing');
        return;
    }
    
    config = JSON.parse(savedConfig);
    
    try {
        const response = await fetch('/api/oauth/callback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                code: code,
                login_url: config.LOGIN_URL,
                client_id: config.CLIENT_ID,
                client_secret: config.CLIENT_SECRET
            })
        });
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            throw new Error(`Server returned non-JSON response: ${text.substring(0, 200)}`);
        }
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Store tokens
            accessToken = data.access_token;
            instanceUrl = data.instance_url;
            localStorage.setItem('sf_access_token', accessToken);
            localStorage.setItem('sf_instance_url', instanceUrl);
            
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
            
            authIcon.textContent = '';
            authMessage.textContent = 'Authenticated with Salesforce';
            authStatus.className = 'auth-status authenticated';
            const authForm = document.getElementById('authForm');
            if (authForm) authForm.style.display = 'none';
            
            if (successDiv) {
                successDiv.textContent = 'Authentication successful!';
                successDiv.style.display = 'block';
            }
            
            // Move to step 2
            setTimeout(() => {
                showStep(2);
                if (successDiv) successDiv.style.display = 'none';
            }, 1000);
        } else {
            showError('authError', data.error || 'Authentication failed');
        }
    } catch (error) {
        showError('authError', 'Network error: ' + error.message);
    }
}

function showError(elementId, message) {
    const errorDiv = document.getElementById(elementId);
    if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    } else {
        console.error(message);
    }
}

async function testApiConnection() {
    const statusDiv = document.getElementById('connectionStatus');
    const testBtn = document.getElementById('testConnectionBtn');
    
    // Debug: Log what we have
    console.log('Testing API connection...');
    console.log('Access Token exists:', !!accessToken);
    console.log('Instance URL:', instanceUrl);
    
    if (!accessToken || !instanceUrl) {
        if (statusDiv) {
            statusDiv.innerHTML = `
                <div style="color: orange; background: #fff3e0; padding: 10px; border-radius: 6px;">
                    <strong>Not authenticated.</strong> Please logout and login again to get a fresh token.
                </div>
            `;
            statusDiv.style.display = 'block';
        }
        return;
    }
    
    // Ensure instance URL has https:// prefix and is valid
    let formattedInstanceUrl = instanceUrl.trim();
    if (!formattedInstanceUrl.startsWith('http')) {
        formattedInstanceUrl = 'https://' + formattedInstanceUrl;
    }
    
    // Validate URL format
    try {
        new URL(formattedInstanceUrl);
    } catch (e) {
        if (statusDiv) {
            statusDiv.innerHTML = `
                <div style="color: red; background: #ffebee; padding: 10px; border-radius: 6px;">
                    <strong>Invalid instance URL:</strong> ${instanceUrl}<br>
                    <small>Please logout and login again.</small>
                </div>
            `;
            statusDiv.style.display = 'block';
        }
        return;
    }
    
    // Get config
    const savedConfig = localStorage.getItem('sf_config');
    if (!savedConfig) {
        if (statusDiv) {
            statusDiv.innerHTML = '<span style="color: red;">Configuration missing.</span>';
            statusDiv.style.display = 'block';
        }
        return;
    }
    config = JSON.parse(savedConfig);
    
    if (testBtn) {
        testBtn.disabled = true;
        testBtn.textContent = 'Testing...';
    }
    
    if (statusDiv) {
        statusDiv.innerHTML = '<span style="color: blue;">Testing connection...</span>';
        statusDiv.style.display = 'block';
    }
    
    try {
        const response = await fetch('/api/test-connection', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                access_token: accessToken,
                instance_url: formattedInstanceUrl,
                api_version: config.API_VERSION
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Auto-update API version if different
            if (data.auto_updated && data.api_version) {
                console.log(`Auto-updating API version from ${config.API_VERSION} to ${data.api_version}`);
                config.API_VERSION = data.api_version;
                localStorage.setItem('sf_config', JSON.stringify(config));
                
                // Update UI if present
                const apiVersionInput = document.getElementById('apiVersion');
                if (apiVersionInput) {
                    apiVersionInput.value = data.api_version;
                }
            }
            
            if (statusDiv) {
                let configList = '';
                if (data.configurations && data.configurations.configurations) {
                    configList = '<br><small>Available configs: ' + 
                        data.configurations.configurations.map(c => c.label || c.developerName).join(', ') + 
                        '</small>';
                }
                
                let updateMsg = data.auto_updated ? 
                    `<br><strong style="color: #0d47a1;">Auto-updated API Version to ${data.api_version}</strong>` : '';
                
                statusDiv.innerHTML = `
                    <div style="color: green; background: #e8f5e9; padding: 10px; border-radius: 6px;">
                        <strong>Success!</strong> ${data.message}${configList}
                        ${updateMsg}
                        <br><small>Instance: ${formattedInstanceUrl}</small>
                    </div>
                `;
            }
        } else {
            if (statusDiv) {
                let details = '';
                if (data.details && Array.isArray(data.details)) {
                    details = '<br><small>' + data.details.slice(0, 3).join('<br>') + '</small>';
                }
                
                statusDiv.innerHTML = `
                    <div style="color: red; background: #ffebee; padding: 10px; border-radius: 6px;">
                        <strong>Error:</strong> ${data.error}<br>
                        ${data.suggestion ? '<small>' + data.suggestion + '</small>' : ''}
                        ${details}
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Test connection error:', error);
        if (statusDiv) {
            statusDiv.innerHTML = `<span style="color: red;">Network error: ${error.message}</span>`;
        }
    } finally {
        if (testBtn) {
            testBtn.disabled = false;
            testBtn.textContent = 'Test API Connection';
        }
    }
}
