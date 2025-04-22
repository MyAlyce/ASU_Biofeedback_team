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
}> = ({ children, onClick, variant = 'default' }) => {
  const baseClass = 'ui-button';
  const variantClass = variant === 'default' ? 'ui-button-default' : 'ui-button-outline';
  
  return (
    <button 
      className={`${baseClass} ${variantClass}`} 
      onClick={onClick}
    >
      {children}
    </button>
  );
};

// Simple Select Component
const Select: React.FC<{
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}> = ({ value, onValueChange, children }) => {
  return (
    <select 
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className="ui-select"
    >
      {children}
    </select>
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
  
  // Handle HEG control mode change
  const handleControlModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setHegControlMode(event.target.value as 'volume' | 'filter' | 'tempo');
  };
  
  // Handle return to main app
  const handleReturn = () => {
    if (onReturn) {
      onReturn();
    }
  };

  // Toggle between audio and data tabs
  const toggleTab = (tab: 'audio' | 'data') => {
    setActiveTab(tab);
  };
  
  return (
    <div className="testing-container">
      <h2>
        Neuro-Reactive Audio Interface
        {onReturn && (
          <button onClick={handleReturn} className="return-button">
            Exit Immersive Mode
          </button>
        )}
      </h2>
      
      {/* Control Sidebar - Left Column */}
      <div className="control-sidebar">
        {/* HEG Data Display Card */}
        <div className="card heg-data-display">
          <div className="card-header">
            <h3>Brainwave Metrics</h3>
          </div>
          <div className="data-grid">
            <div className="data-item">
              <span>Raw Signal</span>
              <span>{hegData.heg.toFixed(2)}</span>
            </div>
            <div className="data-item">
              <span>Short Avg</span>
              <span>{hegData.hegAvg2s.toFixed(2)}</span>
            </div>
            <div className="data-item">
              <span>Long Avg</span>
              <span>{hegData.hegAvg4s.toFixed(2)}</span>
            </div>
            <div className="data-item">
              <span>Effort</span>
              <span>{hegData.hegEffort.toFixed(2)}</span>
            </div>
            <div className="data-item">
              <span>Score</span>
              <span>{hegData.hegScore.toFixed(2)}</span>
            </div>
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
            <button onClick={applyDirectUrl} className="url-submit-button">
              Load
            </button>
          </div>
        </div>
        
        {/* Neural Control Options Card */}
        <div className="card controls-section">
          <div className="card-header">
            <h3>Neural Control System</h3>
          </div>
          <div className="heg-controls">
            <div className="flex gap-3">
              <Button
                onClick={() => setIsHEGModeActive(!isHEGModeActive)}
                variant={isHEGModeActive ? "default" : "outline"}
              >
                {isHEGModeActive ? "HEG Active" : "HEG Inactive"}
              </Button>
            </div>
            
            <div className="flex gap-3">
              <Select
                value={hegControlMode}
                onValueChange={(value) => setHegControlMode(value as 'volume' | 'filter' | 'tempo')}
              >
                <option value="volume">Volume Control</option>
                <option value="filter">Filter Control</option>
                <option value="tempo">Tempo Control</option>
              </Select>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={() => setIsDevMode(!isDevMode)}
                variant={isDevMode ? "default" : "outline"}
              >
                {isDevMode ? "Dev Mode On" : "Dev Mode Off"}
              </Button>
            </div>
          </div>
        </div>

        {/* View Selector */}
        <div className="card view-selector">
          <div className="card-header">
            <h3>View Mode</h3>
          </div>
          <div className="tab-buttons">
            <button 
              className={activeTab === 'audio' ? 'active' : ''}
              onClick={() => toggleTab('audio')}
            >
              Audio Visualization
            </button>
            <button 
              className={activeTab === 'data' ? 'active' : ''}
              onClick={() => toggleTab('data')}
            >
              Data Analysis
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Content - Right Column */}
      <div className="main-content">
        {/* Player Card */}
        <div className="card player-section">
          <div className="card-header">
            <h3>Neural-Reactive Player</h3>
          </div>
          <EnhancedSoundCloudPlayer 
            trackUrl={selectedTrackUrl}
            hegData={hegData}
            isHEGModeActive={isHEGModeActive}
            hegControlMode={hegControlMode}
            isDevMode={isDevMode}
          />
        </div>
      </div>
      
      {/* Visualization Area - Full Width Bottom */}
      <div className={`card visualization-area ${activeTab === 'audio' ? '' : 'hidden'}`}>
        <div className="visualization-header">
          <h3>Neural-Audio Synchronization</h3>
          <button 
            className={visualizerActive ? 'active' : ''}
            onClick={toggleVisualizer}
          >
            {visualizerActive ? '▶ Active' : '■ Paused'}
          </button>
        </div>
        <div className="visualization-container">
          <AudioHEGVisualizer hegData={hegData} isActive={visualizerActive} />
        </div>
      </div>

      {/* Data Visualization - Full Width Bottom (alternates with audio viz) */}
      <div className={`card data-visualization-area ${activeTab === 'data' ? '' : 'hidden'}`}>
        <div className="data-visualization-header">
          <h3>Brain Activity Monitoring</h3>
        </div>
        <div className="chart-wrapper">
          <HEGscore />
          <Chart presets={['heg_playback']} height="200px" width="100%" />
          <Chart presets={['hr']} height="200px" width="100%" />
          <Chart presets={['ppg']} height="200px" width="100%" />
        </div>
      </div>
    </div>
  );
};

export default TestingPage; 