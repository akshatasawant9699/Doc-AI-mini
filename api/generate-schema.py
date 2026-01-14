from http.server import BaseHTTPRequestHandler
import json
import base64
import sys
import os

# Add parent directory to path to import utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api.utils import create_response

def generate_multi_invoice_schema():
    """Generate Salesforce benchpress-style schema for combined/multi-invoice documents"""
    # Use the exact format that works with Salesforce Document AI API
    # This matches the successful benchpress_request.json format
    return {
        "type": "combined_invoice_document",
        "extractionMode": "multi_document",
        "properties": {
            "invoices": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "document_type": {"type": "string"},
                        "page_range": {"type": "string"},
                        "invoice_number": {"type": "string"},
                        "invoice_date": {"type": "string"},
                        "due_date": {"type": "string"},
                        "purchase_order_number": {"type": "string"},
                        "account_number": {"type": "string"},
                        "vendor_name": {"type": "string"},
                        "vendor_address": {"type": "string"},
                        "vendor_city": {"type": "string"},
                        "vendor_state": {"type": "string"},
                        "vendor_zip_code": {"type": "string"},
                        "vendor_phone": {"type": "string"},
                        "vendor_email": {"type": "string"},
                        "customer_name": {"type": "string"},
                        "customer_address": {"type": "string"},
                        "customer_city": {"type": "string"},
                        "customer_state": {"type": "string"},
                        "customer_zip_code": {"type": "string"},
                        "bill_to_name": {"type": "string"},
                        "bill_to_address": {"type": "string"},
                        "ship_to_name": {"type": "string"},
                        "ship_to_address": {"type": "string"},
                        "line_items": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "line_number": {"type": "number"},
                                    "item_code": {"type": "string"},
                                    "item_description": {"type": "string"},
                                    "quantity": {"type": "number"},
                                    "unit_price": {"type": "number"},
                                    "line_total": {"type": "number"}
                                }
                            }
                        },
                        "currency_code": {"type": "string"},
                        "subtotal": {"type": "number"},
                        "tax_total": {"type": "number"},
                        "shipping_cost": {"type": "number"},
                        "total_amount": {"type": "number"},
                        "amount_paid": {"type": "number"},
                        "balance_due": {"type": "number"},
                        "payment_terms": {"type": "string"},
                        "notes": {"type": "string"}
                    }
                }
            },
            "document_summary": {
                "type": "object",
                "properties": {
                    "total_invoices_found": {"type": "number"},
                    "total_pages_processed": {"type": "number"},
                    "grand_total_amount": {"type": "number"}
                }
            }
        }
    }


def generate_schema_from_document(filename, mime_type):
    """Generate a schema based on document type detected from filename"""
    filename_lower = filename.lower()
    
    # Combined/Multi-document schema (for fax batches, combined invoices, etc.)
    if any(word in filename_lower for word in ['combined', 'multi', 'batch', 'fax', 'merged']):
        return generate_multi_invoice_schema()
    
    # Resume/CV schema
    if any(word in filename_lower for word in ['resume', 'cv', 'curriculum']):
        return {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Full name of the candidate"
                },
                "email": {
                    "type": "string",
                    "description": "Email address"
                },
                "phone": {
                    "type": "string",
                    "description": "Phone number"
                },
                "address": {
                    "type": "string",
                    "description": "Address or location"
                },
                "summary": {
                    "type": "string",
                    "description": "Professional summary or objective"
                },
                "skills": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of skills"
                },
                "experience": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "company": {"type": "string"},
                            "title": {"type": "string"},
                            "duration": {"type": "string"},
                            "description": {"type": "string"}
                        }
                    },
                    "description": "Work experience"
                },
                "education": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "institution": {"type": "string"},
                            "degree": {"type": "string"},
                            "year": {"type": "string"}
                        }
                    },
                    "description": "Educational background"
                }
            },
            "required": ["name"]
        }
    
    # Invoice schema (comprehensive)
    elif 'invoice' in filename_lower:
        return {
            "type": "object",
            "properties": {
                # Invoice Header
                "invoice_number": {"type": "string", "description": "Unique invoice number/ID"},
                "invoice_date": {"type": "string", "description": "Date the invoice was issued"},
                "due_date": {"type": "string", "description": "Payment due date"},
                "purchase_order_number": {"type": "string", "description": "Associated PO number"},
                "account_number": {"type": "string", "description": "Customer account number"},
                
                # Vendor Information
                "vendor_name": {"type": "string", "description": "Seller/Vendor company name"},
                "vendor_address": {"type": "string", "description": "Complete vendor address"},
                "vendor_city": {"type": "string", "description": "Vendor city"},
                "vendor_state": {"type": "string", "description": "Vendor state/province"},
                "vendor_zip_code": {"type": "string", "description": "Vendor postal/ZIP code"},
                "vendor_country": {"type": "string", "description": "Vendor country"},
                "vendor_phone": {"type": "string", "description": "Vendor phone number"},
                "vendor_email": {"type": "string", "description": "Vendor email address"},
                "vendor_tax_id": {"type": "string", "description": "Vendor Tax ID/VAT"},
                
                # Customer/Billing Information
                "customer_name": {"type": "string", "description": "Customer/Buyer name"},
                "billing_address": {"type": "string", "description": "Complete billing address"},
                "billing_city": {"type": "string", "description": "Billing city"},
                "billing_state": {"type": "string", "description": "Billing state/province"},
                "billing_zip_code": {"type": "string", "description": "Billing postal/ZIP code"},
                "billing_country": {"type": "string", "description": "Billing country"},
                
                # Shipping Information
                "ship_to_name": {"type": "string", "description": "Ship To name"},
                "shipping_address": {"type": "string", "description": "Complete shipping address"},
                "shipping_method": {"type": "string", "description": "Shipping carrier/method"},
                
                # Line Items
                "line_items": {
                    "type": "array",
                    "description": "Invoice line items",
                    "items": {
                        "type": "object",
                        "properties": {
                            "line_number": {"type": "integer", "description": "Line number"},
                            "item_code": {"type": "string", "description": "Item code/SKU"},
                            "description": {"type": "string", "description": "Item description"},
                            "quantity": {"type": "number", "description": "Quantity"},
                            "unit_of_measure": {"type": "string", "description": "Unit (EA, BOX, etc.)"},
                            "unit_price": {"type": "number", "description": "Price per unit"},
                            "discount": {"type": "number", "description": "Discount amount"},
                            "tax": {"type": "number", "description": "Tax amount"},
                            "line_total": {"type": "number", "description": "Line total"}
                        }
                    }
                },
                
                # Financial Summary
                "currency": {"type": "string", "description": "Currency code (USD, EUR, GBP)"},
                "subtotal": {"type": "number", "description": "Subtotal before tax"},
                "discount_total": {"type": "number", "description": "Total discounts"},
                "tax_rate": {"type": "string", "description": "Tax rate percentage"},
                "tax_total": {"type": "number", "description": "Total tax amount"},
                "shipping_cost": {"type": "number", "description": "Shipping charges"},
                "total_amount": {"type": "number", "description": "Total invoice amount"},
                "amount_paid": {"type": "number", "description": "Amount already paid"},
                "balance_due": {"type": "number", "description": "Balance remaining"},
                
                # Payment Information
                "payment_terms": {"type": "string", "description": "Payment terms (Net 30, etc.)"},
                "payment_method": {"type": "string", "description": "Payment method"},
                "bank_details": {"type": "string", "description": "Bank account details"},
                
                # Additional
                "notes": {"type": "string", "description": "Invoice notes/comments"},
                "sales_rep": {"type": "string", "description": "Sales representative"}
            },
            "required": ["invoice_number", "total_amount"]
        }
    
    # Receipt schema
    elif 'receipt' in filename_lower:
        return {
            "type": "object",
            "properties": {
                "MerchantName": {"type": "string"},
                "MerchantAddress": {"type": "string"},
                "TransactionDate": {"type": "string"},
                "Items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "quantity": {"type": "number"},
                            "price": {"type": "number"}
                        }
                    }
                },
                "Total": {"type": "number"}
            },
            "required": ["MerchantName", "Total"]
        }
    
    # Purchase Order schema
    elif any(word in filename_lower for word in ['purchase', 'order', 'po']):
        return {
            "type": "object",
            "properties": {
                "PONumber": {"type": "string", "description": "Purchase order number"},
                "OrderDate": {"type": "string", "description": "Order date"},
                "Vendor": {"type": "string", "description": "Vendor name"},
                "ShipTo": {"type": "string", "description": "Shipping address"},
                "Items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "itemCode": {"type": "string"},
                            "description": {"type": "string"},
                            "quantity": {"type": "number"},
                            "unitPrice": {"type": "number"}
                        }
                    }
                },
                "TotalAmount": {"type": "number"}
            },
            "required": ["PONumber"]
        }
    
    # Contract/Agreement schema
    elif any(word in filename_lower for word in ['contract', 'agreement']):
        return {
            "type": "object",
            "properties": {
                "contractTitle": {"type": "string"},
                "effectiveDate": {"type": "string"},
                "parties": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "terms": {"type": "string"},
                "signatureDate": {"type": "string"}
            },
            "required": ["contractTitle"]
        }
    
    # Sales/Proof of Sale schema
    elif any(word in filename_lower for word in ['sale', 'sales', 'proof']):
        return {
            "type": "object",
            "properties": {
                "sellerName": {"type": "string", "description": "Name of seller"},
                "buyerName": {"type": "string", "description": "Name of buyer"},
                "saleDate": {"type": "string", "description": "Date of sale"},
                "itemsSold": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "description": {"type": "string"},
                            "quantity": {"type": "number"},
                            "price": {"type": "number"}
                        }
                    }
                },
                "totalAmount": {"type": "number", "description": "Total sale amount"},
                "paymentMethod": {"type": "string"}
            },
            "required": ["totalAmount"]
        }
    
    # Default generic schema
    else:
        return {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Document title"},
                "date": {"type": "string", "description": "Document date"},
                "content": {"type": "string", "description": "Main content"},
                "keyValues": {
                    "type": "object",
                    "description": "Key-value pairs extracted"
                }
            }
        }

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
    
    def do_POST(self):
        """Handle schema generation requests"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            # Parse multipart form data
            # For Vercel, we'll expect JSON with base64 encoded file
            try:
                data = json.loads(post_data.decode('utf-8'))
                filename = data.get('filename', 'document.pdf')
                mime_type = data.get('mime_type', 'application/pdf')
                base64_data = data.get('base64_data')
                
                if not base64_data:
                    response = create_response(400, {
                        'success': False,
                        'error': 'File data is required'
                    })
                    self.send_response(response['statusCode'])
                    for key, value in response['headers'].items():
                        self.send_header(key, value)
                    self.end_headers()
                    self.wfile.write(response['body'].encode('utf-8'))
                    return
                
                # Generate schema
                schema = generate_schema_from_document(filename, mime_type)
                
                response = create_response(200, {
                    'success': True,
                    'schema': schema,
                    'filename': filename,
                    'mime_type': mime_type
                })
                
            except json.JSONDecodeError:
                response = create_response(400, {
                    'success': False,
                    'error': 'Invalid JSON data'
                })
            
            self.send_response(response['statusCode'])
            for key, value in response['headers'].items():
                self.send_header(key, value)
            self.end_headers()
            self.wfile.write(response['body'].encode('utf-8'))
            
        except Exception as e:
            response = create_response(500, {
                'success': False,
                'error': f'Server error: {str(e)}'
            })
            self.send_response(response['statusCode'])
            for key, value in response['headers'].items():
                self.send_header(key, value)
            self.end_headers()
            self.wfile.write(response['body'].encode('utf-8'))

