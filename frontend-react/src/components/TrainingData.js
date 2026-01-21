import React, { useEffect, useState } from 'react';
import '../App.css';

const TrainingData = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [filter, setFilter] = useState('all'); // all, malicious, benign
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let filtered = logs;
    
    if (filter === 'malicious') {
      filtered = logs.filter(log => log.is_malicious);
    } else if (filter === 'benign') {
      filtered = logs.filter(log => !log.is_malicious);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(log => 
        (log.request_signature && log.request_signature.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.threat_type && log.threat_type.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    setFilteredLogs(filtered);
  }, [logs, filter, searchTerm]);

  const fetchLogs = async () => {
    try {
      const response = await fetch('/detections');
      const data = await response.json();
      setLogs(data.map(log => ({
        ...log,
        normalized_request: normalizeRequest(log),
        tokens: tokenizeRequest(log)
      })));
    } catch (error) {
      console.error('Error fetching logs:', error);
      // Fallback to mock data
      const mockData = [
        {
          timestamp: new Date().toISOString(),
          request_signature: "GET /admin.php?user=admin' OR '1'='1",
          is_malicious: true,
          threat_type: "SQL Injection",
          confidence: 0.95,
          method: "GET",
          path: "/admin.php"
        },
        {
          timestamp: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
          request_signature: "GET /products?page=1&category=electronics&sort=price",
          is_malicious: false,
          threat_type: "benign",
          confidence: 0.02,
          method: "GET",
          path: "/products"
        }
      ];
      setLogs(mockData.map(log => ({
        ...log,
        normalized_request: normalizeRequest(log),
        tokens: tokenizeRequest(log)
      })));
    }
  };

  const normalizeRequest = (log) => {
    if (!log.request_signature) return '';
    
    // Basic normalization
    let normalized = log.request_signature.toLowerCase();
    
    // Remove specific values and replace with placeholders
    normalized = normalized.replace(/\d+/g, '[NUM]'); // Replace numbers
    normalized = normalized.replace(/[a-f0-9]{32}/g, '[HASH]'); // Replace MD5 hashes
    normalized = normalized.replace(/[a-f0-9]{40}/g, '[HASH]'); // Replace SHA1 hashes
    normalized = normalized.replace(/\b\w+@\w+\.\w+/g, '[EMAIL]'); // Replace emails
    normalized = normalized.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP]'); // Replace IPs
    normalized = normalized.replace(/['"][^'"]*['"]/g, '[STRING]'); // Replace quoted strings
    
    return normalized.trim();
  };

  const tokenizeRequest = (log) => {
    if (!log.request_signature) return [];
    
    const text = log.request_signature.toLowerCase();
    
    // Basic tokenization - split by common delimiters
    const tokens = text
      .replace(/[^\w\s]/g, ' ') // Replace special chars with spaces
      .split(/\s+/) // Split by whitespace
      .filter(token => token.length > 1) // Remove single characters
      .filter(token => !['the', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'].includes(token)); // Remove common words
    
    return [...new Set(tokens)]; // Remove duplicates
  };

  const exportTrainingData = () => {
    setProcessing(true);
    
    const trainingData = filteredLogs.map(log => ({
      // Original data
      timestamp: log.timestamp,
      request_signature: log.request_signature,
      method: log.method || 'GET',
      path: log.path || '/',
      
      // Processed data for training
      normalized_request: log.normalized_request,
      tokens: log.tokens,
      token_count: log.tokens.length,
      
      // Labels for supervised learning
      is_malicious: log.is_malicious,
      threat_type: log.threat_type || 'benign',
      confidence: log.confidence || 0,
      
      // Features for ML
      features: {
        request_length: log.request_signature ? log.request_signature.length : 0,
        has_special_chars: /[<>'"&]/.test(log.request_signature || ''),
        has_sql_keywords: /\b(select|union|insert|update|delete|drop|alter)\b/i.test(log.request_signature || ''),
        has_script_tags: /<script/i.test(log.request_signature || ''),
        has_path_traversal: /\.\.\//.test(log.request_signature || ''),
        url_encoded_chars: (log.request_signature || '').match(/%[0-9a-f]{2}/gi)?.length || 0
      }
    }));

    const dataStr = JSON.stringify(trainingData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `waf-training-data-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    setTimeout(() => setProcessing(false), 1000);
  };

  const exportTokens = () => {
    const allTokens = {};
    filteredLogs.forEach(log => {
      log.tokens.forEach(token => {
        if (!allTokens[token]) {
          allTokens[token] = { count: 0, malicious: 0, benign: 0 };
        }
        allTokens[token].count++;
        if (log.is_malicious) {
          allTokens[token].malicious++;
        } else {
          allTokens[token].benign++;
        }
      });
    });

    const tokenData = Object.entries(allTokens)
      .map(([token, stats]) => ({
        token,
        frequency: stats.count,
        malicious_count: stats.malicious,
        benign_count: stats.benign,
        threat_ratio: stats.count > 0 ? stats.malicious / stats.count : 0
      }))
      .sort((a, b) => b.frequency - a.frequency);

    const dataStr = JSON.stringify(tokenData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `waf-tokens-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1>Training Data</h1>
        <p className="page-description">Normalized and tokenized logs for machine learning model training</p>
      </div>

      <div className="stats">
        <div className="stat-card">
          <div className="stat-icon">TOT</div>
          <div className="stat-content">
            <h3>Total Samples</h3>
            <div className="stat-number">{filteredLogs.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">MAL</div>
          <div className="stat-content">
            <h3>Malicious</h3>
            <div className="stat-number">{filteredLogs.filter(l => l.is_malicious).length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">BEN</div>
          <div className="stat-content">
            <h3>Benign</h3>
            <div className="stat-number">{filteredLogs.filter(l => !l.is_malicious).length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">TOK</div>
          <div className="stat-content">
            <h3>Unique Tokens</h3>
            <div className="stat-number">{[...new Set(filteredLogs.flatMap(l => l.tokens))].length}</div>
          </div>
        </div>
      </div>

      <div className="training-controls">
        <div className="control-section">
          <div className="filter-controls">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All Requests</option>
              <option value="malicious">Malicious Only</option>
              <option value="benign">Benign Only</option>
            </select>
            
            <input
              type="text"
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="export-controls">
            <button onClick={exportTrainingData} disabled={processing}>
              {processing ? '⏳ Processing...' : '📥 Export Training Data'}
            </button>
            <button onClick={exportTokens}>
              🔤 Export Token Analysis
            </button>
          </div>
        </div>
      </div>

      <div className="training-data-table">
        <div className="section-header">
          <h2>Processed Training Samples</h2>
        </div>
        
        <div className="table-container">
          {filteredLogs.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Label</th>
                  <th>Original Request</th>
                  <th>Normalized</th>
                  <th>Tokens</th>
                  <th>Features</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.slice(0, 50).map((log, index) => (
                  <tr key={index}>
                    <td className="timestamp">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td>
                      <span className={`label-badge ${log.is_malicious ? 'malicious' : 'benign'}`}>
                        {log.is_malicious ? 'MALICIOUS' : 'BENIGN'}
                      </span>
                    </td>
                    <td className="request-cell">
                      <div className="request-snippet">
                        {log.request_signature && log.request_signature.length > 50 
                          ? log.request_signature.substring(0, 50) + '...'
                          : log.request_signature}
                      </div>
                    </td>
                    <td className="normalized-cell">
                      <div className="normalized-text">
                        {log.normalized_request && log.normalized_request.length > 40
                          ? log.normalized_request.substring(0, 40) + '...'
                          : log.normalized_request}
                      </div>
                    </td>
                    <td className="tokens-cell">
                      <div className="token-count">{log.tokens.length} tokens</div>
                      <div className="token-preview">
                        {log.tokens.slice(0, 3).join(', ')}
                        {log.tokens.length > 3 && '...'}
                      </div>
                    </td>
                    <td className="features-cell">
                      <div className="feature-count">
                        {Object.keys(log.features || {}).length} features
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-data">
              <div className="no-data-icon">DATA</div>
              <p>No training data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrainingData;