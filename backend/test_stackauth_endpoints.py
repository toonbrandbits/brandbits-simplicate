#!/usr/bin/env python3
"""
Test different StackAuth API endpoints to find the correct one
"""

import os
import asyncio
import aiohttp

async def test_endpoints():
    """Test different StackAuth API endpoints"""
    
    api_key = os.environ.get("STACK_AUTH_API_KEY")
    project_id = os.environ.get("STACK_AUTH_PROJECT_ID", "c1ede18c-21ff-4d6c-8748-f0c50b0c5b2b")
    
    print("StackAuth API Endpoint Test")
    print("===========================")
    print(f"Project ID: {project_id}")
    print(f"API Key: {'✓ Set' if api_key else '✗ Not set'}")
    
    if not api_key:
        print("\n❌ STACK_AUTH_API_KEY not set!")
        print("Please set the environment variable:")
        print("export STACK_AUTH_API_KEY=your_api_key_here")
        return
    
    # Test different possible endpoints
    endpoints = [
        f"https://api.stack-auth.com/api/v1/users",
        f"https://api.stack-auth.com/api/v1/projects/{project_id}/users",
        f"https://api.stack-auth.com/api/v1/projects/{project_id}/user",
        f"https://api.stack-auth.com/api/v1/user",
        f"https://api.stack-auth.com/api/v1/me",
        f"https://api.stack-auth.com/api/v1/projects/{project_id}/me",
    ]
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    for i, url in enumerate(endpoints, 1):
        print(f"\n{i}. Testing: {url}")
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers) as response:
                    print(f"   Status: {response.status}")
                    
                    if response.status == 200:
                        data = await response.json()
                        print(f"   ✅ Success! Response: {data}")
                        break
                    elif response.status == 401:
                        print(f"   ❌ Unauthorized - Check API key")
                    elif response.status == 404:
                        print(f"   ❌ Not found - Wrong endpoint")
                    else:
                        error_text = await response.text()
                        print(f"   ❌ Error: {error_text}")
                        
        except Exception as e:
            print(f"   ❌ Exception: {e}")

if __name__ == "__main__":
    asyncio.run(test_endpoints())

