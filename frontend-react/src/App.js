import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import TrainingData from './components/TrainingData';
import MLTester from './components/MLTester';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <h1>WAF SECURITY DASHBOARD</h1>
          <div className="nav-links">
            <Link to="/" className="nav-link">ANALYTICS</Link>
            <Link to="/training-data" className="nav-link">TRAINING DATA</Link>
            <Link to="/ml-tester" className="nav-link">ML TESTER</Link>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/training-data" element={<TrainingData />} />
          <Route path="/ml-tester" element={<MLTester />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;