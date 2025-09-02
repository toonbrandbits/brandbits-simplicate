#!/usr/bin/env python3
"""
Simple API test script to verify endpoints are working.
"""

import asyncio
import aiohttp
import json

async def test_api_endpoints():
    """Test the API endpoints to ensure they're working."""
    
    base_url = "http://localhost:8000"
    
    async with aiohttp.ClientSession() as session:
        
        # Test 1: Health check
        print("Testing health check...")
        try:
            async with session.get(f"{base_url}/_healthz") as response:
                print(f"Health check status: {response.status}")
                if response.status == 200:
                    print("✓ Health check passed")
                else:
                    print("✗ Health check failed")
        except Exception as e:
            print(f"✗ Health check error: {e}")
        
        # Test 2: OpenAPI docs
        print("\nTesting OpenAPI docs...")
        try:
            async with session.get(f"{base_url}/docs") as response:
                print(f"OpenAPI docs status: {response.status}")
                if response.status == 200:
                    print("✓ OpenAPI docs accessible")
                else:
                    print("✗ OpenAPI docs failed")
        except Exception as e:
            print(f"✗ OpenAPI docs error: {e}")
        
        # Test 3: Companies endpoint (should require auth)
        print("\nTesting companies endpoint...")
        try:
            async with session.get(f"{base_url}/routes/companies/") as response:
                print(f"Companies endpoint status: {response.status}")
                if response.status == 401:
                    print("✓ Companies endpoint requires authentication (expected)")
                elif response.status == 200:
                    print("✓ Companies endpoint accessible")
                else:
                    print(f"✗ Companies endpoint unexpected status: {response.status}")
        except Exception as e:
            print(f"✗ Companies endpoint error: {e}")
        
        # Test 4: Projects endpoint (should require auth)
        print("\nTesting projects endpoint...")
        try:
            async with session.get(f"{base_url}/routes/projects/") as response:
                print(f"Projects endpoint status: {response.status}")
                if response.status == 401:
                    print("✓ Projects endpoint requires authentication (expected)")
                elif response.status == 200:
                    print("✓ Projects endpoint accessible")
                else:
                    print(f"✗ Projects endpoint unexpected status: {response.status}")
        except Exception as e:
            print(f"✗ Projects endpoint error: {e}")
        
        # Test 5: Time entries endpoint (should require auth)
        print("\nTesting time entries endpoint...")
        try:
            async with session.get(f"{base_url}/routes/time-entries/") as response:
                print(f"Time entries endpoint status: {response.status}")
                if response.status == 401:
                    print("✓ Time entries endpoint requires authentication (expected)")
                elif response.status == 200:
                    print("✓ Time entries endpoint accessible")
                else:
                    print(f"✗ Time entries endpoint unexpected status: {response.status}")
        except Exception as e:
            print(f"✗ Time entries endpoint error: {e}")
        
        # Test 6: Services endpoint (should require auth)
        print("\nTesting services endpoint...")
        try:
            async with session.get(f"{base_url}/routes/services/project/1/summary") as response:
                print(f"Services endpoint status: {response.status}")
                if response.status == 401:
                    print("✓ Services endpoint requires authentication (expected)")
                elif response.status == 200:
                    print("✓ Services endpoint accessible")
                else:
                    print(f"✗ Services endpoint unexpected status: {response.status}")
        except Exception as e:
            print(f"✗ Services endpoint error: {e}")

if __name__ == "__main__":
    print("Testing TimeFlow API endpoints...")
    print("=" * 50)
    asyncio.run(test_api_endpoints())
    print("\n" + "=" * 50)
    print("API testing completed!") 