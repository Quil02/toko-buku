#!/bin/bash
echo "🚀 Starting Toko Buku Backend Server..."
echo ""
echo "📍 Server will run at: http://localhost:8000"
echo "📚 API Documentation: http://localhost:8000/docs"
echo "🔍 Health Check: http://localhost:8000/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python -m uvicorn simple_api:app --host 0.0.0.0 --port 8000 --reload
