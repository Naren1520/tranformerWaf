import React, { useEffect, useState } from 'react';
import '../styles/IncrementalData.css';

const IncrementalDataPage = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [filter, setFilter] = useState('all'); // all, malicious, benign
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let filtered = logs;
    
    if (filter === 'malicious') {
      filtered = logs.filter(log => log.isMalicious);
    } else if (filter === 'benign') {
      filtered = logs.filter(log => !log.isMalicious);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.method.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredLogs(filtered);
  }, [logs, filter, searchTerm]);

  const fetchLogs = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/logs');
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `waf-training-data-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="incremental-data">
      <div className="page-header">
        <h1>🧠 Training Data Pipeline</h1>
        <p>Tokenized data ready for DistilBERT incremental learning</p>
      </div>

      <div className="controls">
        <div className="filter-controls">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Requests</option>
            <option value="malicious">Malicious Only</option>
            <option value="benign">Benign Only</option>
          </select>
          
          <input
            type="text"
            placeholder="Search by path or method..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <button className="export-btn" onClick={exportData}>
           Export Training Data
        </button>
      </div>

      <div className="data-stats">
        <div className="stat-item">
          <span className="stat-value">{logs.length}</span>
          <span className="stat-label">Total Requests</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{logs.filter(l => l.isMalicious).length}</span>
          <span className="stat-label">Malicious</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{logs.filter(l => !l.isMalicious).length}</span>
          <span className="stat-label">Benign</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{filteredLogs.length}</span>
          <span className="stat-label">Filtered</span>
        </div>
      </div>

      <div className="logs-container">
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log, i) => (
            <div key={i} className={`log-card ${log.isMalicious ? 'malicious' : 'benign'}`}>
              <div className="log-header">
                <div className="log-meta">
                  <span className={`method-tag ${log.method.toLowerCase()}`}>{log.method}</span>
                  <span className="timestamp">{new Date(log.timestamp).toLocaleString()}</span>
                  <span className={`status-badge ${log.isMalicious ? 'threat' : 'safe'}`}>
                    {log.isMalicious ? '⚠️ Threat' : '✅ Safe'}
                  </span>
                </div>
                {log.isMalicious && (
                  <div className="confidence-score">
                    Confidence: {Math.round(log.confidence * 100)}%
                  </div>
                )}
              </div>

              <div className="log-content">
                <div className="original-request">
                  <h4>Original Request</h4>
                  <div className="request-path">{log.path}</div>
                  {log.body && <div className="request-body">Body: {log.body}</div>}
                </div>

                <div className="tokenized-data">
                  <h4>Tokenized for DistilBERT</h4>
                  <div className="tokens-grid">
                    {log.pathTokens && log.pathTokens.length > 0 && (
                      <div className="token-section">
                        <label>Path Tokens:</label>
                        <div className="tokens">
                          {log.pathTokens.map((token, idx) => (
                            <span key={idx} className="token">{token}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {log.bodyTokens && log.bodyTokens.length > 0 && (
                      <div className="token-section">
                        <label>Body Tokens:</label>
                        <div className="tokens">
                          {log.bodyTokens.map((token, idx) => (
                            <span key={idx} className="token">{token}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {log.headerTokens && log.headerTokens.length > 0 && (
                      <div className="token-section">
                        <label>Header Tokens:</label>
                        <div className="tokens">
                          {log.headerTokens.map((token, idx) => (
                            <span key={idx} className="token">{token}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="no-data">
            <div className="no-data-icon">📊</div>
            <p>No training data available</p>
            <small>Run some tests to generate tokenized data</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default IncrementalDataPage;