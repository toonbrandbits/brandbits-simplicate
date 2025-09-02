#!/usr/bin/env python3
"""
Decode URL-encoded token and examine JWT structure
"""

import jwt
import json
import urllib.parse
from datetime import datetime

def decode_url_encoded_token(encoded_token):
    """Decode URL-encoded token"""
    try:
        # URL decode the token
        decoded_token = urllib.parse.unquote(encoded_token)
        print(f"URL decoded token: {decoded_token}")
        return decoded_token
    except Exception as e:
        print(f"Error URL decoding: {e}")
        return None

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
    # The token you provided
    encoded_token = "%22n2188ghmg12a5yfwv2tjemcef1hqq1zqbf8e0c87bhjbg%22%2C%22eyJhbGciOiJFUzI1NiIsImtpZCI6ImhzMjU3UDJTS2dfNyJ9.eyJzdWIiOiJkYjY3ZDJlZS02Yzg0LTRiYWUtOWM0MC03NDk1YjU3ZDhjNGUiLCJicmFuY2hJZCI6Im1haW4iLCJyZWZyZXNoVG9rZW5JZCI6IjgxYmVhZjBmLTIwNmEtNGMwOC1iMGEzLTNkOTBiNDkxZDE0NSIsInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiaXNzIjoiaHR0cHM6Ly9hcGkuc3RhY2stYXV0aC5jb20vYXBpL3YxL3Byb2plY3RzL2MxZWRlMThjLTIxZmYtNGQ2Yy04NzQ4LWYwYzUwYjBjNWIyYiIsImlhdCI6MTc1NjEzMTQyNSwiYXVkIjoiYzFlZGUxOGMtMjFmZi00ZDZjLTg3NDgtZjBjNTBiMGM1YjJiIiwiZXhwIjoxNzU2MTM1MDI1fQ.LnTxN0QjAH2LSrCpIlazeI3SGeIMm-KzO10QkqhZFtDLqGjNTG7osqhMHSfJmkZLJ6mZUeSDoXW5Wb8VbcWD5Q%22"
    
    print("Decoding URL-encoded token...")
    print("=" * 50)
    
    # URL decode the token
    decoded_token = decode_url_encoded_token(encoded_token)
    
    if decoded_token:
        print(f"\nDecoded token appears to be a JSON array with 2 elements:")
        print(f"Length: {len(decoded_token)}")
        print(f"First 100 chars: {decoded_token[:100]}")
        
        # Try to parse as JSON
        try:
            token_data = json.loads(decoded_token)
            print(f"\nParsed as JSON array with {len(token_data)} elements:")
            
            for i, item in enumerate(token_data):
                print(f"\nElement {i}:")
                print(f"  Type: {type(item)}")
                print(f"  Length: {len(str(item))}")
                print(f"  Preview: {str(item)[:100]}...")
                
                # If it looks like a JWT token, try to decode it
                if isinstance(item, str) and item.count('.') == 2:
                    print(f"  This looks like a JWT token, attempting to decode...")
                    payload = decode_jwt_without_verification(item)
                    if payload:
                        print(f"  JWT Payload:")
                        print(f"    sub: {payload.get('sub', 'Not found')}")
                        print(f"    role: {payload.get('role', 'Not found')}")
                        print(f"    iss: {payload.get('iss', 'Not found')}")
                        print(f"    aud: {payload.get('aud', 'Not found')}")
                        print(f"    iat: {payload.get('iat', 'Not found')}")
                        print(f"    exp: {payload.get('exp', 'Not found')}")
                        
                        # Check for email fields
                        email_fields = ['email', 'primary_email', 'preferred_username', 'upn', 'unique_name', 'mail']
                        print(f"\n  Email fields:")
                        for field in email_fields:
                            if field in payload:
                                print(f"    ✓ {field}: {payload[field]}")
                            else:
                                print(f"    ✗ {field}: Not found")
                        
                        # Show all fields
                        print(f"\n  All fields:")
                        for key, value in payload.items():
                            print(f"    ✓ {key}: {value}")
                
        except json.JSONDecodeError as e:
            print(f"Not a valid JSON: {e}")
            
            # Try to decode as JWT directly
            print(f"\nTrying to decode as JWT directly...")
            payload = decode_jwt_without_verification(decoded_token)
            if payload:
                print(f"JWT Payload:")
                print(json.dumps(payload, indent=2, default=str))

if __name__ == "__main__":
    main()

