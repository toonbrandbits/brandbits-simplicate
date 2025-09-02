#!/usr/bin/env python3
"""
Debug script to examine StackAuth JWT token structure
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
    print("StackAuth JWT Token Debug Tool")
    print("==============================")
    print()
    print("To get your JWT token:")
    print("1. Open your browser's Developer Tools (F12)")
    print("2. Go to the Network tab")
    print("3. Refresh the page or make a request")
    print("4. Look for requests to your API (usually /routes/time-entries/)")
    print("5. Check the 'Authorization' header - it should start with 'Bearer '")
    print("6. Copy the token part (everything after 'Bearer ')")
    print()
    print("Alternative method:")
    print("1. Open browser console (F12)")
    print("2. Type: localStorage.getItem('stack-auth-token') or similar")
    print("3. Copy the token value")
    print()
    
    token = input("Paste your StackAuth JWT token here: ").strip()
    
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
        email_fields = ['email', 'primary_email', 'preferred_username', 'upn', 'unique_name', 'mail']
        print("\nEmail Fields:")
        for field in email_fields:
            if field in payload:
                print(f"✓ {field}: {payload[field]}")
            else:
                print(f"✗ {field}: Not found")
        
        # Check for common name fields
        name_fields = ['name', 'display_name', 'given_name', 'family_name', 'full_name', 'nickname']
        print("\nName Fields:")
        for field in name_fields:
            if field in payload:
                print(f"✓ {field}: {payload[field]}")
            else:
                print(f"✗ {field}: Not found")
        
        # Check for other important fields
        other_fields = ['sub', 'iss', 'aud', 'iat', 'exp']
        print("\nOther Fields:")
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
        
        # Show all available fields
        print("\nAll Available Fields:")
        print("====================")
        for key, value in payload.items():
            print(f"✓ {key}: {value}")

if __name__ == "__main__":
    main()

