from http.server import BaseHTTPRequestHandler
import json
import base64
import sys
import os

# Add parent directory to path to import utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api.utils import create_response

def generate_multi_invoice_schema():
    """Generate comprehensive schema for combined/multi-invoice documents (50+ form types, 10-30+ pages)"""
    return {
        "type": "object",
        "description": "Schema for extracting multiple invoices from combined documents",
        "properties": {
            "documents": {
                "type": "array",
                "description": "Array of extracted invoices/documents from the combined file",
                "items": {
                    "type": "object",
                    "properties": {
                        # Document Metadata
                        "document_type": {"type": "string", "description": "Type of document (Invoice, Credit Note, Debit Note, Receipt, etc.)"},
                        "page_number": {"type": "integer", "description": "Page number in the combined document"},
                        "document_id": {"type": "string", "description": "Unique identifier for this document within the batch"},
                        
                        # Invoice Header
                        "invoice_number": {"type": "string", "description": "Unique invoice number/ID"},
                        "invoice_date": {"type": "string", "description": "Date the invoice was issued"},
                        "due_date": {"type": "string", "description": "Payment due date"},
                        "purchase_order_number": {"type": "string", "description": "Associated purchase order number"},
                        "sales_order_number": {"type": "string", "description": "Sales order reference number"},
                        "account_number": {"type": "string", "description": "Customer account number"},
                        "reference_number": {"type": "string", "description": "Additional reference number"},
                        "invoice_type": {"type": "string", "description": "Type (Standard, Proforma, Commercial, etc.)"},
                        
                        # Vendor Information
                        "vendor_name": {"type": "string", "description": "Seller/Vendor company name"},
                        "vendor_address": {"type": "string", "description": "Complete vendor address"},
                        "vendor_city": {"type": "string", "description": "Vendor city"},
                        "vendor_state": {"type": "string", "description": "Vendor state/province"},
                        "vendor_zip_code": {"type": "string", "description": "Vendor postal/ZIP code"},
                        "vendor_country": {"type": "string", "description": "Vendor country"},
                        "vendor_phone": {"type": "string", "description": "Vendor phone number"},
                        "vendor_email": {"type": "string", "description": "Vendor email address"},
                        "vendor_tax_id": {"type": "string", "description": "Vendor Tax ID / EIN / VAT number"},
                        
                        # Customer Information
                        "customer_name": {"type": "string", "description": "Buyer/Customer company name"},
                        "customer_id": {"type": "string", "description": "Customer ID/Number"},
                        "customer_address": {"type": "string", "description": "Complete customer address"},
                        "customer_city": {"type": "string", "description": "Customer city"},
                        "customer_state": {"type": "string", "description": "Customer state/province"},
                        "customer_zip_code": {"type": "string", "description": "Customer postal/ZIP code"},
                        "customer_country": {"type": "string", "description": "Customer country"},
                        "customer_phone": {"type": "string", "description": "Customer phone number"},
                        "customer_email": {"type": "string", "description": "Customer email address"},
                        
                        # Billing Address
                        "bill_to_name": {"type": "string", "description": "Bill To company/person name"},
                        "bill_to_address": {"type": "string", "description": "Complete billing address"},
                        "bill_to_city": {"type": "string", "description": "Bill To city"},
                        "bill_to_state": {"type": "string", "description": "Bill To state/province"},
                        "bill_to_zip_code": {"type": "string", "description": "Bill To postal/ZIP code"},
                        
                        # Shipping Address
                        "ship_to_name": {"type": "string", "description": "Ship To company/person name"},
                        "ship_to_address": {"type": "string", "description": "Complete shipping address"},
                        "ship_to_city": {"type": "string", "description": "Ship To city"},
                        "ship_to_state": {"type": "string", "description": "Ship To state/province"},
                        "ship_to_zip_code": {"type": "string", "description": "Ship To postal/ZIP code"},
                        
                        # Shipping Details
                        "shipping_method": {"type": "string", "description": "Shipping carrier/method"},
                        "tracking_number": {"type": "string", "description": "Shipment tracking number"},
                        "ship_date": {"type": "string", "description": "Date items were shipped"},
                        
                        # Line Items
                        "line_items": {
                            "type": "array",
                            "description": "List of invoice line items",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "line_number": {"type": "integer", "description": "Line item sequence number"},
                                    "item_code": {"type": "string", "description": "Item code/SKU/Part number"},
                                    "item_description": {"type": "string", "description": "Item description"},
                                    "quantity": {"type": "number", "description": "Quantity ordered/shipped"},
                                    "unit_of_measure": {"type": "string", "description": "Unit of measure (EA, BOX, LB, etc.)"},
                                    "unit_price": {"type": "number", "description": "Price per unit"},
                                    "discount_percent": {"type": "number", "description": "Discount percentage"},
                                    "discount_amount": {"type": "number", "description": "Discount amount"},
                                    "tax_amount": {"type": "number", "description": "Tax amount for line"},
                                    "line_total": {"type": "number", "description": "Final line total"}
                                }
                            }
                        },
                        
                        # Financial Summary
                        "currency_code": {"type": "string", "description": "Currency code (USD, EUR, GBP, etc.)"},
                        "subtotal": {"type": "number", "description": "Subtotal before tax and adjustments"},
                        "discount_total": {"type": "number", "description": "Total discounts applied"},
                        "taxable_amount": {"type": "number", "description": "Total taxable amount"},
                        "sales_tax": {"type": "number", "description": "Sales tax amount"},
                        "vat_amount": {"type": "number", "description": "VAT amount"},
                        "tax_total": {"type": "number", "description": "Total tax amount"},
                        "shipping_cost": {"type": "number", "description": "Shipping charges"},
                        "handling_fee": {"type": "number", "description": "Handling fees"},
                        "total_amount": {"type": "number", "description": "Total invoice amount"},
                        "amount_paid": {"type": "number", "description": "Amount already paid"},
                        "balance_due": {"type": "number", "description": "Balance remaining due"},
                        
                        # Payment Information
                        "payment_terms": {"type": "string", "description": "Payment terms (Net 30, 2/10 Net 30, etc.)"},
                        "payment_method": {"type": "string", "description": "Accepted payment methods"},
                        "bank_name": {"type": "string", "description": "Bank name for wire transfer"},
                        "bank_account_number": {"type": "string", "description": "Bank account number"},
                        "bank_routing_number": {"type": "string", "description": "ABA routing number"},
                        
                        # Additional Information
                        "notes": {"type": "string", "description": "Invoice notes/comments"},
                        "special_instructions": {"type": "string", "description": "Special handling instructions"},
                        "sales_rep": {"type": "string", "description": "Sales representative name"},
                        "approved_by": {"type": "string", "description": "Approval signature/name"}
                    }
                }
            },
            "extraction_summary": {
                "type": "object",
                "description": "Summary of the extraction",
                "properties": {
                    "total_documents_found": {"type": "integer", "description": "Total number of documents extracted"},
                    "total_pages_processed": {"type": "integer", "description": "Total pages in the combined document"},
                    "document_types_found": {"type": "array", "items": {"type": "string"}, "description": "Types of documents found"},
                    "grand_total": {"type": "number", "description": "Sum of all invoice totals"}
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

