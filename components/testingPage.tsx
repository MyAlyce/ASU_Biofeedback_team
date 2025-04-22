import React, { useState, useEffect } from 'react';
import { subscribeHEGPlayback, unsubscribeHEGPlayback } from '../scripts/connect';
import AudioHEGVisualizer from './visualizations/AudioHEGVisualizer';
import EnhancedSoundCloudPlayer from './players/EnhancedSoundCloudPlayer';
import { Chart } from './chart/Chart';
import { HEGscore } from './hegscore';
import { ShaderPlayer } from './threejs/threeshader';
import '../styles/testingPage.css';

// Define our own UI components directly
const Button: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'outline';
  className?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}> = ({ children, onClick, variant = 'default', className = '', icon, disabled = false }) => {
  const baseClass = 'ui-button';
  const variantClass = variant === 'default' ? 'ui-button-default' : 'ui-button-outline';
  
  return (
    <button 
      className={`${baseClass} ${variantClass} ${className}`} 
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <span className="button-icon">{icon}</span>}
      {children}
    </button>
  );
};

// Simple Select Component
const Select: React.FC<{
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  label?: string;
}> = ({ value, onValueChange, children, className = '', label }) => {
  return (
    <div className="select-container">
      {label && <label className="select-label">{label}</label>}
      <select 
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={`ui-select ${className}`}
      >
        {children}
      </select>
    </div>
  );
};

// SelectItem component
const SelectItem: React.FC<{
  value: string;
  children: React.ReactNode;
}> = ({ value, children }) => {
  return (
    <option value={value}>{children}</option>
  );
};

// Placeholder components that don't do anything since we're using native select
const SelectTrigger: React.FC<{children: React.ReactNode}> = ({children}) => <>{children}</>;
const SelectValue: React.FC<{placeholder?: string}> = () => <></>;
const SelectContent: React.FC<{children: React.ReactNode}> = ({children}) => <>{children}</>;

// Metric Card component for displaying brain metrics
const MetricCard: React.FC<{
  label: string;
  value: number;
  icon?: string;
  color?: string;
}> = ({ label, value, icon, color = 'var(--accent-primary)' }) => {
  return (
    <div className="data-item" style={{'--data-color': color} as React.CSSProperties}>
      <span>{label}</span>
      <span>{value.toFixed(2)}</span>
    </div>
  );
};

interface TestingPageProps {
  onReturn?: () => void;
}

const TestingPage: React.FC<TestingPageProps> = ({ onReturn }) => {
  const [hegData, setHegData] = useState({
    heg: 0,
    hegAvg2s: 0,
    hegAvg4s: 0,
    hegEffort: 0,
    hegScore: 0
  });
  
  const [selectedTrackUrl, setSelectedTrackUrl] = useState<string>('https://soundcloud.com/user-643905711/over-critical-1');
  const [directTrackUrl, setDirectTrackUrl] = useState<string>('');
  const [isHEGModeActive, setIsHEGModeActive] = useState(false);
  const [visualizerActive, setVisualizerActive] = useState(true);
  const [hegControlMode, setHegControlMode] = useState<'volume' | 'filter' | 'tempo'>('volume');
  const [activeTab, setActiveTab] = useState<'audio' | 'data'>('audio');
  const [isDevMode, setIsDevMode] = useState<boolean>(false);
  
  // Subscribe to HEG data
  useEffect(() => {
    const sub = subscribeHEGPlayback((data) => {
      if (data && data.heg && data.heg.length > 0) {
        const idx = data.heg.length - 1; // Get latest value
        setHegData({
          heg: data.heg[idx] || 0,
          hegAvg2s: data.hegAvg2s[idx] || 0,
          hegAvg4s: data.hegAvg4s[idx] || 0,
          hegEffort: data.hegEffort[idx] || 0,
          hegScore: data.hegScore[idx] || 0
        });
      }
    });
    
    return () => {
      unsubscribeHEGPlayback(sub);
    };
  }, []);
  
  // Handle direct URL input
  const handleDirectUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDirectTrackUrl(e.target.value);
  };
  
  // Apply direct URL
  const applyDirectUrl = () => {
    if (directTrackUrl.trim() !== '') {
      setSelectedTrackUrl(directTrackUrl);
    }
  };
  
  // Handle keypress for URL input
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      applyDirectUrl();
    }
  };
  
  // Toggle HEG mode
  const toggleHEGMode = () => {
    setIsHEGModeActive(!isHEGModeActive);
  };
  
  // Toggle visualizer
  const toggleVisualizer = () => {
    setVisualizerActive(!visualizerActive);
  };
  
  // Toggle between audio and data tabs
  const toggleTab = (tab: 'audio' | 'data') => {
    setActiveTab(tab);
  };
  
  return (
    <div className="testing-container">
      <header className="app-header">
        <h2>
          <span className="gradient-text">Neuro-Reactive Audio Interface</span>
          {onReturn && (
            <Button 
              onClick={onReturn} 
              className="return-button"
              variant="outline"
              icon={<span>✕</span>}
            >
              Exit Immersive Mode
            </Button>
          )}
        </h2>
      </header>
      
      {/* Top Section - Controls and Player */}
      <div className="top-section">
        {/* Control Sidebar - Left Column */}
        <div className="control-sidebar">
          {/* HEG Data Display Card */}
          <div className="card heg-data-display">
            <div className="card-header">
              <h3>Brainwave Metrics</h3>
            </div>
            <div className="data-grid">
              <MetricCard 
                label="Raw Signal" 
                value={hegData.heg} 
                color="var(--data-blue)"
              />
              <MetricCard 
                label="Short Avg" 
                value={hegData.hegAvg2s}
                color="var(--data-cyan)" 
              />
              <MetricCard 
                label="Long Avg" 
                value={hegData.hegAvg4s} 
                color="var(--data-green)"
              />
              <MetricCard 
                label="Effort" 
                value={hegData.hegEffort}
                color="var(--data-purple)" 
              />
              <MetricCard 
                label="Score" 
                value={hegData.hegScore}
                color="var(--data-pink)" 
              />
            </div>
          </div>
          
          {/* URL Input Card */}
          <div className="card direct-url-section">
            <div className="card-header">
              <h3>Audio Source</h3>
            </div>
            <div className="url-input-container">
              <input
                type="text"
                placeholder="Paste SoundCloud URL"
                value={directTrackUrl}
                onChange={handleDirectUrlChange}
                onKeyPress={handleKeyPress}
                className="url-input"
              />
              <Button 
                onClick={applyDirectUrl} 
                className="url-submit-button"
                disabled={!directTrackUrl.trim()}
              >
                Load Track
              </Button>
            </div>
          </div>
          
          {/* Neural Control Options Card */}
          <div className="card controls-section">
            <div className="card-header">
              <h3>Neural Control System</h3>
            </div>
            <div className="heg-controls">
              <div className="control-group">
                <label className="control-label">HEG Mode</label>
                <Button
                  onClick={toggleHEGMode}
                  variant={isHEGModeActive ? "default" : "outline"}
                >
                  {isHEGModeActive ? 'Active' : 'Inactive'}
                </Button>
              </div>
              
              <div className="control-group">
                <label className="control-label">Visualizer</label>
                <Button
                  onClick={toggleVisualizer}
                  variant={visualizerActive ? "default" : "outline"}
                >
                  {visualizerActive ? 'On' : 'Off'}
                </Button>
              </div>
              
              <div className="control-group">
                <label className="control-label">Control Mode</label>
                <Select 
                  value={hegControlMode}
                  onValueChange={(value) => setHegControlMode(value as 'volume' | 'filter' | 'tempo')}
                  label=""
                >
                  <SelectItem value="volume">Volume Control</SelectItem>
                  <SelectItem value="filter">Filter Control</SelectItem>
                  <SelectItem value="tempo">Tempo Control</SelectItem>
                </Select>
              </div>
            </div>
          </div>
          
          {/* Dev Mode Button (hidden unless needed) */}
          <div className="dev-controls">
            <Button
              onClick={() => setIsDevMode(!isDevMode)}
              variant="outline"
              className="dev-button"
            >
              {isDevMode ? 'Hide Dev Tools' : 'Show Dev Tools'}
            </Button>
          </div>
        </div>
        
        {/* Main Content - Right Column */}
        <div className="main-content">
          {/* Tabs for Audio and Data Views */}
          <div className="content-tabs">
            <button 
              className={`tab-button ${activeTab === 'audio' ? 'active' : ''}`}
              onClick={() => toggleTab('audio')}
            >
              Audio Player
            </button>
            <button 
              className={`tab-button ${activeTab === 'data' ? 'active' : ''}`}
              onClick={() => toggleTab('data')}
            >
              Neural Data
            </button>
          </div>
          
          {/* Tab Content */}
          <div className="tab-content">
            {/* Audio Player Tab */}
            {activeTab === 'audio' && (
              <div className="audio-tab">
                <EnhancedSoundCloudPlayer 
                  trackUrl={selectedTrackUrl}
                  isHEGModeActive={isHEGModeActive}
                  hegData={hegData}
                  hegControlMode={hegControlMode}
                  isDevMode={isDevMode}
                />
              </div>
            )}
            
            {/* Data Tab */}
            {activeTab === 'data' && (
              <div className="data-tab">
                <div className="data-charts">
                  <div className="chart-container">
                    <h4 className="chart-title">HEG Signal</h4>
                    <Chart presets={['heg_playback']} />
                  </div>
                  <div className="chart-container">
                    <h4 className="chart-title">Heart Rate</h4>
                    <Chart presets={['hr']} />
                  </div>
                  <div className="chart-container">
                    <h4 className="chart-title">PPG Signal</h4>
                    <Chart presets={['ppg']} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Bottom Section - 3D Shader Visualization */}
      <div className="shader-section">
        <h3 className="section-title">3D Shader Visualization</h3>
        <div className="shader-container">
          <ShaderPlayer />
        </div>
      </div>
      
      {/* Dev Tools (only shown in dev mode) */}
      {isDevMode && (
        <div className="dev-panel">
          <div className="card">
            <div className="card-header">
              <h3>Developer Tools</h3>
            </div>
            <div className="card-content">
              <p>HEG Raw: {hegData.heg.toFixed(4)}</p>
              <p>HEG Effort: {hegData.hegEffort.toFixed(4)}</p>
              <p>Selected URL: {selectedTrackUrl}</p>
              <p>HEG Mode: {isHEGModeActive ? 'Active' : 'Inactive'}</p>
              <p>Control Mode: {hegControlMode}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestingPage; 