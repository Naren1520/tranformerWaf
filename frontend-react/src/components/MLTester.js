import React, { useState, useEffect } from 'react';
import '../styles/MLTester.css';

const MLTester = () => {
  const [requests, setRequests] = useState([
    { id: 1, method: 'GET', path: '/', body: '', status: 'ready' },
    { id: 2, method: 'POST', path: '/login', body: '', status: 'ready' },
    { id: 3, method: 'GET', path: '/search', body: '', status: 'ready' },
    { id: 4, method: 'GET', path: '/admin', body: '', status: 'ready' }
  ]);
  
  const [results, setResults] = useState({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const updateRequest = (id, field, value) => {
    setRequests(prev => prev.map(req => 
      req.id === id ? { ...req, [field]: value } : req
    ));
  };

  const analyzeRequest = async (request) => {
    try {
      setRequests(prev => prev.map(req => 
        req.id === request.id ? { ...req, status: 'analyzing' } : req
      ));

      const response = await fetch('http://localhost:5000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: request.method,
          path: request.path,
          body: request.body,
          headers: { 'User-Agent': 'ML-Tester' },
          query_params: {}
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      setResults(prev => ({ ...prev, [request.id]: result }));
      setRequests(prev => prev.map(req => 
        req.id === request.id ? { ...req, status: 'completed' } : req
      ));

      // Store malicious patterns if detected
      if (result.is_malicious) {
        await storeMaliciousPattern(request, result);
      }

    } catch (error) {
      console.error('Analysis error:', error);
      setResults(prev => ({ 
        ...prev, 
        [request.id]: { 
          error: error.message,
          is_attack: false,
          confidence: 0
        }
      }));
      setRequests(prev => prev.map(req => 
        req.id === request.id ? { ...req, status: 'error' } : req
      ));
    }
  };

  const storeMaliciousPattern = async (request, result) => {
    try {
      const pattern = {
        method: request.method,
        path: request.path,
        body: request.body,
        threat_type: result.threat_type,
        confidence: result.confidence,
        timestamp: new Date().toISOString(),
        pattern_signature: `${request.method} ${request.path} ${request.body}`.toLowerCase()
      };

      await fetch('http://localhost:5000/api/store-pattern', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pattern)
      });
    } catch (error) {
      console.error('Pattern storage error:', error);
    }
  };

  const analyzeAllAsync = async () => {
    setIsAnalyzing(true);
    
    // Analyze all requests concurrently (async demo)
    const promises = requests.map(request => analyzeRequest(request));
    
    try {
      await Promise.all(promises);
    } catch (error) {
      console.error('Batch analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addRequest = () => {
    const newId = Math.max(...requests.map(r => r.id)) + 1;
    setRequests(prev => [...prev, {
      id: newId,
      method: 'GET',
      path: '/new-endpoint',
      body: '',
      status: 'ready'
    }]);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ready': return 'RDY';
      case 'analyzing': return 'RUN';
      case 'completed': return 'OK';
      case 'error': return 'ERR';
      default: return 'RDY';
    }
  };

  const getThreatIcon = (result) => {
    if (!result || result.error) return 'UNK';
    return result.is_malicious ? 'THR' : 'SEC';
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1>ML THREAT ANALYZER</h1>
        <p className="page-description">Test Transformer-based detection with multiple concurrent requests</p>
      </div>

      <div className="ml-controls">
        <div className="control-section">
          <button 
            onClick={analyzeAllAsync} 
            disabled={isAnalyzing}
            className="analyze-all-btn"
          >
            {isAnalyzing ? 'ANALYZING ALL...' : 'ANALYZE ALL (ASYNC)'}
          </button>
          <button onClick={addRequest} className="add-request-btn">
            + ADD REQUEST
          </button>
        </div>
      </div>

      <div className="requests-grid">
        {requests.map(request => (
          <div key={request.id} className="request-card">
            <div className="card-header">
              <span className="status-indicator">
                {getStatusIcon(request.status)} Request #{request.id}
              </span>
              <div className="threat-indicator">
                {results[request.id] && getThreatIcon(results[request.id])}
              </div>
            </div>

            <div className="request-inputs">
              <div className="input-row">
                <select 
                  value={request.method} 
                  onChange={(e) => updateRequest(request.id, 'method', e.target.value)}
                  disabled={request.status === 'analyzing'}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
                <input
                  type="text"
                  placeholder="Path (e.g., /search?q=test)"
                  value={request.path}
                  onChange={(e) => updateRequest(request.id, 'path', e.target.value)}
                  disabled={request.status === 'analyzing'}
                />
              </div>
              
              <textarea
                placeholder="Request body (optional)"
                value={request.body}
                onChange={(e) => updateRequest(request.id, 'body', e.target.value)}
                disabled={request.status === 'analyzing'}
                rows={2}
              />
            </div>

            <div className="card-actions">
              <button 
                onClick={() => analyzeRequest(request)}
                disabled={request.status === 'analyzing'}
                className="analyze-btn"
              >
                {request.status === 'analyzing' ? '🔄 Analyzing...' : '🔍 Analyze'}
              </button>
            </div>

            {results[request.id] && (
              <div className="result-display">
                {results[request.id].error ? (
                  <div className="error-result">
                    <strong>ERROR:</strong> {results[request.id].error}
                  </div>
                ) : (
                  <div className={`threat-result ${results[request.id].is_malicious ? 'dangerous' : 'safe'}`}>
                    <div className="result-header">
                      <span className="prediction">
                        {results[request.id].is_malicious ? 'THREAT DETECTED' : 'SAFE REQUEST'}
                      </span>
                      <span className="confidence">
                        {(results[request.id].confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="result-details">
                      <div className="detail-item">
                        <strong>Type:</strong> {results[request.id].threat_type}
                      </div>
                      <div className="detail-item">
                        <strong>Processing:</strong> {results[request.id].processing_time_ms}ms
                      </div>
                      <div className="detail-item">
                        <strong>Prediction:</strong> {results[request.id].prediction}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="demo-suggestions">
        <h3>🎯 Try These Test Cases:</h3>
        <div className="suggestions-grid">
          <div className="suggestion-card" onClick={() => 
            setRequests(prev => prev.map(req => req.id === 1 ? 
              {...req, method: 'GET', path: '/search?q=\' OR \'1\'=\'1', body: ''} : req))}>
            <strong>SQL Injection:</strong> GET /search?q=' OR '1'='1
          </div>
          <div className="suggestion-card" onClick={() => 
            setRequests(prev => prev.map(req => req.id === 2 ? 
              {...req, method: 'POST', path: '/comment', body: '<script>alert("xss")</script>'} : req))}>
            <strong>XSS Attack:</strong> POST /comment with script payload
          </div>
          <div className="suggestion-card" onClick={() => 
            setRequests(prev => prev.map(req => req.id === 3 ? 
              {...req, method: 'GET', path: '/file?path=../../etc/passwd', body: ''} : req))}>
            <strong>Path Traversal:</strong> GET /file?path=../../etc/passwd
          </div>
          <div className="suggestion-card" onClick={() => 
            setRequests(prev => prev.map(req => req.id === 4 ? 
              {...req, method: 'GET', path: '/about', body: ''} : req))}>
            <strong>Normal Request:</strong> GET /about
          </div>
        </div>
      </div>
    </div>
  );
};

export default MLTester;