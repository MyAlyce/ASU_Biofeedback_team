import React, { useState, useEffect } from 'react';
import { subscribeHEGPlayback, unsubscribeHEGPlayback } from '../scripts/connect';
import AudioHEGVisualizer from './visualizations/AudioHEGVisualizer';
import EnhancedSoundCloudPlayer from './players/EnhancedSoundCloudPlayer';
import { Chart } from './chart/Chart';
import { HEGscore } from './hegscore';
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
                  className="control-button"
                  icon={isHEGModeActive ? <span>◉</span> : <span>◯</span>}
                >
                  {isHEGModeActive ? "Active" : "Inactive"}
                </Button>
              </div>
              
              <div className="control-group">
                <label className="control-label">Control Parameter</label>
                <Select
                  value={hegControlMode}
                  onValueChange={(value) => setHegControlMode(value as 'volume' | 'filter' | 'tempo')}
                  className="control-select"
                >
                  <option value="volume">Volume Control</option>
                  <option value="filter">Filter Control</option>
                  <option value="tempo">Tempo Control</option>
                </Select>
              </div>
              
              <div className="control-group">
                <label className="control-label">Developer Mode</label>
                <Button
                  onClick={() => setIsDevMode(!isDevMode)}
                  variant={isDevMode ? "default" : "outline"}
                  className="control-button"
                  icon={isDevMode ? <span>◉</span> : <span>◯</span>}
                >
                  {isDevMode ? "Enabled" : "Disabled"}
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Player Column */}
        <div className="main-content">
          {/* Player Card */}
          <div className="card player-section">
            <div className="card-header">
              <h3>Neural-Reactive Player</h3>
            </div>
            <div className="card-content">
              <EnhancedSoundCloudPlayer
                trackUrl={selectedTrackUrl}
                hegData={hegData}
                isHEGModeActive={isHEGModeActive}
                hegControlMode={hegControlMode}
                isDevMode={isDevMode}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Add a clearer visual separator for Neural Visualizations */}
      <div className="section-divider">
        <div className="divider-line"></div>
      </div>
      
      {/* Section Spacer */}
      <div className="section-spacer"></div>
      
      {/* Visualizations Section - Full Width */}
      <div className="visualizations-section">
        {/* Visualization Selector Tabs */}
        <div className="visualization-tabs">
          <button 
            className={activeTab === 'audio' ? 'active' : ''}
            onClick={() => toggleTab('audio')}
          >
            <span className="tab-icon">🎵</span>
            Audio Visualization
          </button>
          <button 
            className={activeTab === 'data' ? 'active' : ''}
            onClick={() => toggleTab('data')}
          >
            <span className="tab-icon">📊</span>
            Data Analysis
          </button>
        </div>
        
        {/* Visualizations Container */}
        <div className="visualizations-container">
          {/* Audio Visualization */}
          <div className={`card visualization-area ${activeTab === 'audio' ? '' : 'hidden'}`}>
            <div className="visualization-header">
              <h3>Neural-Audio Synchronization</h3>
              <div className="visualization-controls">
                <Button 
                  onClick={toggleVisualizer}
                  variant={visualizerActive ? "default" : "outline"}
                  className="viz-control-button"
                  icon={visualizerActive ? <span>▶</span> : <span>■</span>}
                >
                  {visualizerActive ? 'Active' : 'Paused'}
                </Button>
              </div>
            </div>
            <div className="visualization-container">
              <AudioHEGVisualizer hegData={hegData} isActive={visualizerActive} />
            </div>
          </div>

          {/* Data Visualization */}
          <div className={`card data-visualization-area ${activeTab === 'data' ? '' : 'hidden'}`}>
            <div className="data-visualization-header">
              <h3>Brain Activity Monitoring</h3>
              <div className="data-time-controls">
                <Button variant="outline" className="time-control">Last 5 Min</Button>
                <Button variant="outline" className="time-control">Last 1 Min</Button>
                <Button variant="default" className="time-control">Real-time</Button>
              </div>
            </div>
            <div className="chart-wrapper">
              <div className="chart-container">
                <div className="chart-label">HEG Score Trend</div>
                <HEGscore />
              </div>
              <div className="chart-container">
                <div className="chart-label">Brainwave Activity</div>
                <Chart presets={['heg_playback']} height="200px" width="100%" />
              </div>
              <div className="chart-container">
                <div className="chart-label">Heart Rate Variability</div>
                <Chart presets={['hr']} height="200px" width="100%" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestingPage; 