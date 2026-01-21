const express = require('express');
const router = express.Router();
const logService = require('../services/logService');
const axios = require('axios');

// Rule-based detection logic (fallback)
function detectThreat(data) {
  const { method, path, headers, body } = data;
  let confidence = 0;
  let threats = [];

  // SQL Injection patterns
  const sqlPatterns = [/union\s+select/i, /select\s+.*\s+from/i, /['";]/];
  if (sqlPatterns.some(pattern => pattern.test(path) || pattern.test(body))) {
    threats.push('SQL Injection');
    confidence = Math.max(confidence, 0.9);
  }

  // XSS patterns
  const xssPatterns = [/<script/i, /javascript:/i, /on\w+=/i];
  if (xssPatterns.some(pattern => pattern.test(path) || pattern.test(body))) {
    threats.push('XSS');
    confidence = Math.max(confidence, 0.85);
  }

  // Path Traversal
  if (/\.\./.test(path) || /\/etc\/passwd/.test(path)) {
    threats.push('Path Traversal');
    confidence = Math.max(confidence, 0.95);
  }

  return { is_attack: confidence > 0, confidence, threats };
}

// POST /analyze - Call ML service for detection + log all requests for training
router.post('/analyze', async (req, res) => {
  try {
    // Call ML service for analysis
    const mlResponse = await axios.post('http://localhost:8000/analyze', req.body, {
      timeout: 5000 // 5 second timeout
    });

    const result = mlResponse.data;

    // Log every request (malicious or normal) for future model training
    await logService.addLog({ ...req.body, ...result });

    if (result.is_malicious) {
      await logService.addDetection({
        ...req.body,
        ...result,
        timestamp: new Date(),
        detection_method: result.detection_method || 'ml'
      });
      req.io.emit('detection', result); // Real-time via Socket.IO
    }

    res.json(result);
  } catch (error) {
    console.error('ML Service Error:', error.message);

    // Fallback to basic rule-based detection if ML service is down
    const fallbackResult = detectThreat(req.body);

    // Log with fallback indication
    await logService.addLog({ ...req.body, ...fallbackResult, fallback: true });

    if (fallbackResult.is_attack) {
      await logService.addDetection({
        ...req.body,
        ...fallbackResult,
        timestamp: new Date(),
        detection_method: 'rules_fallback'
      });
      req.io.emit('detection', fallbackResult);
    }

    res.json(fallbackResult);
  }
});

module.exports = router;