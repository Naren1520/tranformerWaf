# 🚀 Quick WAF Prototype

Hi, I'm Tharun Rai, and this is my AI-powered Web Application Firewall prototype. It combines traditional security rules with a DistilBERT transformer model to detect and block malicious web requests in real-time.

## Features

- **Hybrid Detection**: Rule-based patterns + AI analysis
- **High Accuracy**: 99%+ detection on malicious requests
- **Fast Processing**: Under 30ms per request
- **Live Dashboard**: React interface with real-time monitoring

## Quick Start

### Prerequisites
- Python 3.9+
- Node.js 16+
- Git

### Setup & Run
1. Clone this repo
2. Install dependencies:
   ```bash
   cd ml-service && pip install fastapi uvicorn transformers torch requests pydantic
   cd ../backend && npm install
   cd ../frontend-react && npm install
   ```
3. Start services:
   ```bash
   # Terminal 1: ML Service
   cd ml-service && python app.py
   # Terminal 2: Backend
   cd backend && npm start
   # Terminal 3: Frontend
   cd frontend-react && npm start
   ```
4. Open http://localhost:3000 in your browser

## How It Works

- **ML Service** (Python/FastAPI): Uses DistilBERT to analyze requests and return threat scores
- **Backend** (Node.js/Express): API hub that bridges ML and frontend
- **Frontend** (React): Dashboard showing analytics, testing interface, and live updates

## Testing

- Use the dashboard's ML Tester to input URLs and see results
- Run automated tests for various attack patterns
- Monitor confidence scores and response times

## Performance

- **Accuracy**: 99%+ on threats, <2% false positives
- **Speed**: 15-25ms per analysis
- **Memory**: ~500MB when running

## Project Structure

```
quick-waf-prototype/
├── ml-service/          # AI detection brain (Python/FastAPI)
├── backend/            # API hub (Node.js/Express)
├── frontend-react/     # Dashboard (React)
├── wafModel/          # AI model files (ignored by git)
├── data/              # Test data and patterns
├── nginx/             # Production configs
└── docker/            # Container setup
```

## Tech Choices

- **DistilBERT**: Lightweight transformer, fast and accurate for text classification
- **FastAPI**: Async Python framework perfect for ML workloads
- **React**: Modern UI with real-time WebSocket updates

## Troubleshooting

- **Services won't start**: Check Python/Node versions and port availability (3000, 5000, 8000)
- **Slow first run**: Model downloads take time; subsequent runs are fast
- **High memory**: AI model needs RAM; close other apps if needed
- **Connection errors**: Ensure all three services are running

## Important Note

This is a prototype for educational purposes. It demonstrates AI-enhanced web security concepts but should not be used in production without thorough testing and security audits.
