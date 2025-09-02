#!/usr/bin/env python3
"""
Debug script to examine JWT token structure from StackAuth
"""

import jwt
import json
from datetime import datetime

def decode_jwt_without_verification(token):
    """Decode JWT without verification to see its structure"""
    try:
        # Decode without verification to see the payload
        payload = jwt.decode(token, options={"verify_signature": False})
        return payload
    except Exception as e:
        print(f"Error decoding JWT: {e}")
        return None

def main():
    print("JWT Token Debug Tool")
    print("====================")
    print()
    print("To use this tool:")
    print("1. Get a JWT token from your browser's network tab or localStorage")
    print("2. Paste it below when prompted")
    print("3. This will show you the structure of the JWT payload")
    print()
    
    token = input("Paste your JWT token here: ").strip()
    
    if not token:
        print("No token provided")
        return
    
    payload = decode_jwt_without_verification(token)
    
    if payload:
        print("\nJWT Payload Structure:")
        print("======================")
        print(json.dumps(payload, indent=2, default=str))
        
        print("\nKey Fields Analysis:")
        print("====================")
        
        # Check for common email fields
        email_fields = ['email', 'primary_email', 'preferred_username', 'upn', 'unique_name']
        for field in email_fields:
            if field in payload:
                print(f"✓ {field}: {payload[field]}")
            else:
                print(f"✗ {field}: Not found")
        
        # Check for common name fields
        name_fields = ['name', 'display_name', 'given_name', 'family_name', 'full_name']
        for field in name_fields:
            if field in payload:
                print(f"✓ {field}: {payload[field]}")
            else:
                print(f"✗ {field}: Not found")
        
        # Check for other important fields
        other_fields = ['sub', 'iss', 'aud', 'iat', 'exp']
        for field in other_fields:
            if field in payload:
                value = payload[field]
                if field in ['iat', 'exp']:
                    # Convert timestamp to readable date
                    try:
                        value = f"{value} ({datetime.fromtimestamp(value).isoformat()})"
                    except:
                        pass
                print(f"✓ {field}: {value}")
            else:
                print(f"✗ {field}: Not found")

if __name__ == "__main__":
    main()

