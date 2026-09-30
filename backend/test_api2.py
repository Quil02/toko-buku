#!/usr/bin/env python
import sys
import time
import requests
import subprocess

# Start server
print("🚀 Starting server...")
proc = subprocess.Popen([
    sys.executable, "-m", "uvicorn", 
    "simple_api:app", 
    "--host", "127.0.0.1", 
    "--port", "8000"
])

# Wait longer for server to start
print("⏳ Waiting for server to initialize...")
time.sleep(8)

try:
    # Test health endpoint
    print("\n✅ Testing API endpoints...")
    
    response = requests.get("http://127.0.0.1:8000/health", timeout=5)
    print(f"GET /health: {response.status_code} - {response.json()}")
    
    response = requests.get("http://127.0.0.1:8000/")
    print(f"GET /: {response.status_code} - {response.json()}")
    
    print("\n✅ Server is running successfully!")
    print("📚 API Documentation: http://127.0.0.1:8000/docs")
    print("\n🛑 Press Ctrl+C to stop the server")
    
    # Keep running
    proc.wait()
    
except KeyboardInterrupt:
    print("\n🛑 Stopping server...")
    proc.terminate()
    proc.wait(timeout=5)
    print("✅ Done!")
except Exception as e:
    print(f"\n❌ Error: {e}")
    proc.terminate()
