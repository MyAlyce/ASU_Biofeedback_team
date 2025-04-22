// EnhancedSoundCloudPlayer with frequency and HEG visualization
import React, { useEffect, useRef, useState } from 'react';
import '../../styles/enhancedPlayer.css';
import { MdOutlineSettingsSuggest } from 'react-icons/md';
import { RiSoundModuleLine } from 'react-icons/ri';
import classNames from 'classnames';
import { GiSoundWaves } from 'react-icons/gi';
import { FaVolumeUp, FaFilter, FaRedo } from 'react-icons/fa';
import { MdSlowMotionVideo } from 'react-icons/md';
import { BiBrain } from 'react-icons/bi';
import { IoMdArrowDropup, IoMdArrowDropdown } from 'react-icons/io';
import AudioHEGVisualizer from '../visualizations/AudioHEGVisualizer';
import AudioFrequencyVisualizer from '../visualizations/AudioFrequencyVisualizer';
import ShaderVisualizer from '../visualizations/ShaderVisualizer';

interface EnhancedSoundCloudPlayerProps {
  trackUrl?: string;
  hegData: {
    heg: number;
    hegAvg2s: number;
    hegAvg4s: number;
    hegEffort: number;
    hegScore: number;
  };
  isHEGModeActive: boolean;
  hegControlMode: 'volume' | 'filter' | 'tempo';
  isDevMode: boolean;
}

const EnhancedSoundCloudPlayer: React.FC<EnhancedSoundCloudPlayerProps> = ({
  trackUrl = 'https://soundcloud.com/user-643905711/over-critical-1',
  hegData,
  isHEGModeActive: propIsHEGModeActive,
  hegControlMode: propHegControlMode,
  isDevMode
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const [widget, setWidget] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentTrackUrl, setCurrentTrackUrl] = useState<string>(trackUrl);
  const [trackLoaded, setTrackLoaded] = useState(false);
  const [initialState, setInitialState] = useState(true);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [currentPlaybackRate, setCurrentPlaybackRate] = useState(1.0);
  const [trackInfo, setTrackInfo] = useState({
    title: '',
    artist: '',
    artwork: '',
    duration: 0,
    position: 0
  });
  const [currentTempo, setCurrentTempo] = useState<number>(1.0);
  
  // State for HEG mode controls
  const [isHEGModeActive, setIsHEGModeActive] = useState<boolean>(propIsHEGModeActive);
  const [hegControlMode, setHegControlMode] = useState<'volume' | 'filter' | 'tempo'>(propHegControlMode);
  
  // State for tracking local min/max HEG scores
  const [localMinHegScore, setLocalMinHegScore] = useState<number>(0);
  const [localMaxHegScore, setLocalMaxHegScore] = useState<number>(0);
  const [sessionStarted, setSessionStarted] = useState<boolean>(false);
  
  // State for visualizers
  const [visualizersActive, setVisualizersActive] = useState(true);
  const [activeVisualizer, setActiveVisualizer] = useState<'none' | 'frequency' | 'heg' | 'shader' | 'both'>('both');
  const [shaderGeometry, setShaderGeometry] = useState<'plane' | 'sphere' | 'halfsphere' | 'circle' | 'vrscreen'>('plane');
  
  // Track URL change detection
  useEffect(() => {
    if (trackUrl !== currentTrackUrl) {
      setIsLoading(true);
      setLoadingProgress(0);
      setCurrentTrackUrl(trackUrl);
      setTrackInfo({
        title: '',
        artist: '',
        artwork: '',
        duration: 0,
        position: 0
      });
      setLoadError(null);
      setTrackLoaded(false);
      
      // Load the new track
      if (widget) {
        widget.load(trackUrl, {
          callback: () => {
            setIsLoading(false);
            updateTrackInfo(widget);
            setTrackLoaded(true);
            // Get stream URL for Web Audio API
            getStreamUrl(trackUrl);
          },
          auto_play: false
        });
      } else {
        // Widget not ready yet, it will load when initialized
        initializeWidget();
      }
    }
  }, [trackUrl]);
  
  // Initialize SoundCloud Widget
  useEffect(() => {
    // Load SoundCloud Widget API if not already loaded
    if (!(window as any).SC) {
      const script = document.createElement('script');
      script.src = 'https://w.soundcloud.com/player/api.js';
      script.async = true;
      document.body.appendChild(script);
      
      script.onload = initializeWidget;
      
      return () => {
        document.body.removeChild(script);
      };
    } else {
      initializeWidget();
    }
  }, []);

  // Initialize Web Audio API
  useEffect(() => {
    // Initialize AudioContext on first user interaction
    const initAudio = () => {
      if (!audioContextRef.current) {
        try {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          audioContextRef.current = new AudioContext();
          
          // Create initial nodes
          if (audioContextRef.current) {
            // Create gain node for volume control
            gainNodeRef.current = audioContextRef.current.createGain();
            gainNodeRef.current.gain.value = volume / 100;
            
            // Create filter node for filter control
            filterNodeRef.current = audioContextRef.current.createBiquadFilter();
            filterNodeRef.current.type = 'lowpass';
            filterNodeRef.current.frequency.value = 20000; // Default to max frequency
            
            // Connect the filter to the gain
            filterNodeRef.current.connect(gainNodeRef.current);
            
            // Connect gain to destination
            gainNodeRef.current.connect(audioContextRef.current.destination);
            
            console.log('Audio context and nodes initialized');
          }
          
          // If we already have a stream URL, set up audio
          if (streamUrl) {
            setupAudioNodes();
          }
        } catch (error) {
          console.error('Failed to create AudioContext:', error);
        }
      }
    };

    // Listen for user interaction to initialize AudioContext
    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('touchstart', initAudio, { once: true });
    
    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('touchstart', initAudio);
      
      // Clean up audio resources
      if (audioContextRef.current?.state !== 'closed') {
        sourceNodeRef.current?.disconnect();
        filterNodeRef.current?.disconnect();
        gainNodeRef.current?.disconnect();
        audioContextRef.current?.close();
      }
    };
  }, []);

  // Set up audio nodes when stream URL is available
  useEffect(() => {
    if (streamUrl && audioContextRef.current) {
      setupAudioNodes();
    }
  }, [streamUrl]);

  // Set up audio nodes for Web Audio API processing
  const setupAudioNodes = () => {
    if (!audioContextRef.current || !streamUrl) return;
    
    try {
      // For the frequency visualizer, we need to create a real audio element
      if (!audioElementRef.current) {
        audioElementRef.current = new Audio();
        audioElementRef.current.crossOrigin = 'anonymous';
        audioElementRef.current.volume = 0; // Keep muted to avoid double audio
        audioElementRef.current.loop = true;
        
        // Add event handlers
        audioElementRef.current.onplay = () => {
          console.log('Hidden audio element playing (for visualization)');
        };
        
        audioElementRef.current.onerror = (e) => {
          console.error('Hidden audio element error:', e);
        };
        
        // Handle autoplay issues
        audioElementRef.current.oncanplay = () => {
          if (isPlaying) {
            audioElementRef.current?.play().catch(e => {
              console.log('Autoplay prevented by browser. Waiting for user interaction.');
            });
          }
        };
      }
      
      // Set the audio source
      if (streamUrl !== 'widget://soundcloud') {
        audioElementRef.current.src = streamUrl;
        audioElementRef.current.load();
      } else {
        console.warn('Using SoundCloud widget only, no direct audio stream available for visualization');
      }
      
      // Create source node for visualization
      if (audioElementRef.current && audioContextRef.current && !sourceNodeRef.current) {
        try {
          sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioElementRef.current);
          // Connect to destination through our filter->gain chain
          sourceNodeRef.current.connect(filterNodeRef.current!);
          console.log('Audio source connected to audio graph for visualization');
        } catch (e) {
          console.error('Error creating source node:', e);
        }
      }
      
      console.log('Audio setup complete for visualization');
    } catch (error) {
      console.error('Error setting up audio nodes:', error);
    }
  };
  
  // Update min/max HEG scores when HEG data changes
  useEffect(() => {
    if (!isHEGModeActive) return;
    
    // If this is the first score in the session, initialize min/max
    if (!sessionStarted && hegData.hegScore !== 0) {
      setLocalMinHegScore(hegData.hegScore);
      setLocalMaxHegScore(hegData.hegScore);
      setSessionStarted(true);
    }
    
    // Update min/max scores as new data comes in
    if (sessionStarted && hegData.hegScore !== 0) {
      if (hegData.hegScore < localMinHegScore) {
        setLocalMinHegScore(hegData.hegScore);
      }
      if (hegData.hegScore > localMaxHegScore) {
        setLocalMaxHegScore(hegData.hegScore);
      }
    }
  }, [hegData.hegScore, isHEGModeActive, sessionStarted]);
  
  // Apply HEG data to control the player
  useEffect(() => {
    if (!widget || !isHEGModeActive) return;
    
    // Apply different controls based on mode
    if (hegControlMode === 'volume') {
      let newVolume = volume; // Start with current volume instead of defaulting to 50%
      
      if (sessionStarted && localMinHegScore !== localMaxHegScore) {
        // Normalize hegScore to 0-100 range based on local min/max
        const scoreRange = localMaxHegScore - localMinHegScore;
        const normalizedScore = (hegData.hegScore - localMinHegScore) / scoreRange;
        newVolume = Math.max(0, Math.min(100, normalizedScore * 100));
      } else if (!sessionStarted || hegData.hegScore === 0) {
        // Only keep current volume until we get actual HEG data
        return;
      }
      
      setVolume(newVolume);
      widget.setVolume(newVolume / 100);
      
      // Also update gain node if we're using Web Audio API
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = newVolume / 100;
      }
      
      if (isDevMode) {
        console.log(`HEG Volume Control: Score=${hegData.hegScore.toFixed(2)}, Min=${localMinHegScore.toFixed(2)}, Max=${localMaxHegScore.toFixed(2)}, Volume=${newVolume.toFixed(1)}%`);
      }
    } 
    else if (hegControlMode === 'filter') {
      // In filter mode, use the same normalized approach for filter effect
      let filterAmount = volume; // Start with current volume instead of defaulting to 50%
      
      if (sessionStarted && localMinHegScore !== localMaxHegScore) {
        // Normalize hegScore to 0-100 range based on local min/max
        const scoreRange = localMaxHegScore - localMinHegScore;
        const normalizedScore = (hegData.hegScore - localMinHegScore) / scoreRange;
        filterAmount = Math.max(0, Math.min(100, normalizedScore * 100));
      } else if (!sessionStarted || hegData.hegScore === 0) {
        // Only keep current volume until we get actual HEG data
        return;
      }
      
      // Map filter amount to frequency range: 200Hz - 20000Hz (log scale)
      const minFreq = 200;
      const maxFreq = 20000;
      const frequency = minFreq * Math.pow(maxFreq / minFreq, filterAmount / 100);
      
      // Set volume for widget (temporary solution until we implement proper filter)
      setVolume(filterAmount);
      widget.setVolume(filterAmount / 100);
      
      // Apply filter if we have a filter node
      if (filterNodeRef.current) {
        filterNodeRef.current.frequency.value = frequency;
      }
      
      if (isDevMode) {
        console.log(`HEG Filter Control: Score=${hegData.hegScore.toFixed(2)}, Min=${localMinHegScore.toFixed(2)}, Max=${localMaxHegScore.toFixed(2)}, Filter=${filterAmount.toFixed(1)}%, Freq=${frequency.toFixed(0)}Hz`);
      }
    } 
    else if (hegControlMode === 'tempo') {
      if (sessionStarted && localMinHegScore !== localMaxHegScore) {
        // Calculate playback rate based on normalized HEG score
        const scoreRange = localMaxHegScore - localMinHegScore;
        const normalizedScore = (hegData.hegScore - localMinHegScore) / scoreRange;
        // Map normalized score (0-1) to playback rate range (0.5-1.5)
        const newRate = 0.5 + (normalizedScore * 1.0);
        const clampedRate = Math.max(0.5, Math.min(1.5, newRate));
        
        setCurrentPlaybackRate(clampedRate);
        
        // Update the SoundCloud widget's playback rate
        if (widget) {
          // First get current position
          widget.getPosition((currentPosition: number) => {
            // SoundCloud API doesn't directly support tempo changes
            // We can simulate it by adjusting playback behavior
            
            // Store current position and playing state
            const wasPlaying = isPlaying;
            
            // Apply the effect by controlling playback if needed
            if (wasPlaying) {
              // The next time the widget's events fire, the tempo will be applied
              widget.seekTo(currentPosition);
            }
          });
        }
        
        if (isDevMode) {
          console.log(`HEG Tempo Control: Score=${hegData.hegScore.toFixed(2)}, Min=${localMinHegScore.toFixed(2)}, Max=${localMaxHegScore.toFixed(2)}, Rate=${clampedRate.toFixed(2)}x`);
        }
      }
    }
  }, [hegData, isHEGModeActive, hegControlMode, widget, sessionStarted, localMinHegScore, localMaxHegScore, isDevMode, isPlaying]);
  
  // Reset session data when HEG mode or control mode changes
  useEffect(() => {
    setSessionStarted(false);
    setLocalMinHegScore(0);
    setLocalMaxHegScore(0);
  }, [isHEGModeActive, hegControlMode]);
  
  // Get stream URL for direct audio playback
  const getStreamUrl = async (scUrl: string) => {
    try {
      // Try to get the stream URL via a direct SoundCloud API call
      const clientId = 'a3e059563d7fd3372b49b37f00a00bcf';
      const resolveUrl = `https://api.soundcloud.com/resolve.json?url=${encodeURIComponent(scUrl)}&client_id=${clientId}`;
      
      try {
        const response = await fetch(resolveUrl);
        const data = await response.json();
        
        if (data.stream_url) {
          const streamWithId = `${data.stream_url}?client_id=${clientId}`;
          setStreamUrl(streamWithId);
          console.log('Got stream URL from API:', streamWithId);
          return streamWithId;
        }
      } catch (apiError) {
        console.warn('SoundCloud API request failed:', apiError);
      }
      
      // If we couldn't get a stream URL, create a simple proxy
      // This is primarily for tempo control functionality
      console.warn('Could not get SoundCloud stream URL, using widget directly');
      setStreamUrl('widget://soundcloud');
      return 'widget://soundcloud';
    } catch (error) {
      console.error('Error getting stream URL:', error);
      setStreamUrl(null);
      return null;
    }
  };
  
  // Initialize the SoundCloud widget
  const initializeWidget = () => {
    setInitialState(false);
    
    if (!iframeRef.current || !(window as any).SC) return;
    
    setIsLoading(true);
    setLoadingProgress(10);
    setTrackLoaded(false);
    
    const SC = (window as any).SC;
    
    // Generate the embed URL
    const embedUrl = generateEmbedUrl(currentTrackUrl);
    iframeRef.current.src = embedUrl;
    
    setLoadingProgress(30);
    
    // Initialize widget when iframe is loaded
    iframeRef.current.onload = () => {
      setLoadingProgress(60);
      
      try {
        const widgetInstance = SC.Widget(iframeRef.current);
        setWidget(widgetInstance);
        
        setLoadingProgress(80);
        
        widgetInstance.bind(SC.Widget.Events.READY, () => {
          setLoadingProgress(90);
          widgetInstance.setVolume(volume / 100);
          
          // Get track info
          updateTrackInfo(widgetInstance);
          setLoadingProgress(100);
        });
        
        widgetInstance.bind(SC.Widget.Events.PLAY, () => {
          setIsPlaying(true);
          setTrackLoaded(true);
          
          // Start position tracking
          const positionInterval = setInterval(() => {
            widgetInstance.getPosition((position: number) => {
              setTrackInfo(prev => ({ ...prev, position }));
              
              // If using tempo control, we need to frequently adjust the position
              // to simulate tempo changes
              if (isHEGModeActive && hegControlMode === 'tempo' && currentPlaybackRate !== 1.0) {
                // Calculate how much to adjust position based on tempo
                const adjustment = (currentPlaybackRate - 1.0) * 100; // milliseconds of adjustment
                
                if (adjustment !== 0) {
                  // Only adjust if not at 1.0 speed
                  setTimeout(() => {
                    widgetInstance.seekTo(position + adjustment);
                  }, 500); // Apply change every half second for smoother effect
                }
              }
            });
          }, 1000);
          
          // Sync with our hidden audio element for visualization
          if (audioElementRef.current) {
            audioElementRef.current.currentTime = 0;
            audioElementRef.current.play().catch(e => {
              console.log('Auto-play prevented by browser for visualizer audio');
            });
          }
          
          return () => clearInterval(positionInterval);
        });
        
        widgetInstance.bind(SC.Widget.Events.PAUSE, () => {
          setIsPlaying(false);
          
          // Sync with our hidden audio element
          if (audioElementRef.current && !audioElementRef.current.paused) {
            audioElementRef.current.pause();
          }
        });
        
        widgetInstance.bind(SC.Widget.Events.FINISH, () => {
          setIsPlaying(false);
          setTrackInfo(prev => ({ ...prev, position: 0 }));
          
          // Sync with our hidden audio element
          if (audioElementRef.current) {
            audioElementRef.current.pause();
            audioElementRef.current.currentTime = 0;
          }
        });
        
        widgetInstance.bind(SC.Widget.Events.ERROR, () => {
          setLoadError("Error loading track. Please check the URL and try again.");
          setIsLoading(false);
          setTrackLoaded(false);
        });
      } catch (error) {
        console.error("Error initializing SoundCloud widget:", error);
        setLoadError("Failed to initialize SoundCloud player");
        setIsLoading(false);
        setTrackLoaded(false);
      }
    };
  };
  
  // Updates track info from the widget
  const updateTrackInfo = (widgetInstance: any) => {
    widgetInstance.getCurrentSound((sound: any) => {
      if (sound) {
        setTrackInfo({
          title: sound.title || 'Untitled Track',
          artist: sound.user?.username || 'Unknown Artist',
          artwork: sound.artwork_url?.replace('-large', '-t500x500') || sound.user?.avatar_url || '',
          duration: sound.duration || 0,
          position: 0
        });
        setIsLoading(false);
        setLoadError(null);
        setTrackLoaded(true);
        
        // Log to verify data is coming through
        console.log('Track loaded successfully:', sound.title);
        
        // Get stream URL for Web Audio API
        getStreamUrl(currentTrackUrl);
      } else {
        setLoadError("Couldn't load track information");
        setTrackLoaded(false);
      }
    });
  };
  
  // Generate SoundCloud embed URL 
  const generateEmbedUrl = (url: string): string => {
    const baseUrl = 'https://w.soundcloud.com/player/';
    const params = new URLSearchParams({
      url,
      color: 'ff5500',
      auto_play: 'false',
      hide_related: 'true',
      show_comments: 'false', 
      show_user: 'true',
      show_reposts: 'false',
      show_teaser: 'false',
      visual: 'true'
    });
    
    return `${baseUrl}?${params.toString()}`;
  };
  
  // Handle play/pause
  const togglePlay = () => {
    if (!widget) return;
    
    if (isPlaying) {
      widget.pause();
    } else {
      widget.play();
    }
  };
  
  // Handle manual volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value, 10);
    setVolume(newVolume);
    
    if (widget) {
      widget.setVolume(newVolume / 100);
    }
    
    // Also update Web Audio API gain node
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = newVolume / 100;
    }
  };
  
  // Handle seeking
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!widget || trackInfo.duration === 0) return;
    
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    const seekPosition = trackInfo.duration * clickPosition;
    
    widget.seekTo(seekPosition);
    
    // Sync with audio element for visualization
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = seekPosition / 1000; // Convert ms to seconds
    }
  };
  
  // Toggle visualizers
  const toggleVisualizers = () => {
    setVisualizersActive(!visualizersActive);
  };
  
  // Change active visualizer
  const changeVisualizer = (type: 'none' | 'frequency' | 'heg' | 'shader' | 'both') => {
    setActiveVisualizer(type);
  };
  
  // Change shader geometry
  const handleGeometryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setShaderGeometry(e.target.value as 'plane' | 'sphere' | 'halfsphere' | 'circle' | 'vrscreen');
  };
  
  // Format time in MM:SS
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Render loading state
  const renderLoadingState = () => (
    <div className="player-loading">
      <div className="loading-indicator">
        <div className="spinner"></div>
        <div className="loading-text">Loading track... {loadingProgress}%</div>
      </div>
    </div>
  );
  
  // Render error state
  const renderErrorState = () => (
    <div className="player-error">
      <div className="error-icon">⚠️</div>
      <div className="error-message">{loadError}</div>
      <button className="retry-button" onClick={initializeWidget}>
        Try Again
      </button>
    </div>
  );

  // Render welcome state
  const renderWelcomeState = () => (
    <div className="player-welcome">
      <div className="welcome-icon">🎧</div>
      <div className="welcome-message">Ready to play neural-reactive audio</div>
      <div className="welcome-instructions">Load a SoundCloud track URL to begin</div>
    </div>
  );

  // Get player status text
  const getStatusText = () => {
    if (initialState) return "Ready";
    if (isLoading) return "Loading...";
    if (loadError) return "Error";
    if (isPlaying) return "Playing";
    if (trackLoaded) return "Ready";
    return "No track loaded";
  };
  
  // Determine if the HEG effect is positive or negative
  const getHEGEffect = () => {
    if (!isHEGModeActive || hegData.hegScore === 0) return null;
    
    const isPositive = hegData.hegScore > 0;
    const intensity = Math.min(Math.abs(hegData.hegScore) * 20, 100);
    
    return (
      <div className="flex items-center ml-2" title={`HEG Score: ${hegData.hegScore.toFixed(3)}`}>
        <BiBrain className="text-blue-400 mr-1" />
        {isPositive ? (
          <IoMdArrowDropup 
            className="text-green-500" 
            style={{ 
              fontSize: `${Math.max(16, 16 + intensity/10)}px`,
              opacity: Math.max(0.5, intensity/100)
            }} 
          />
        ) : (
          <IoMdArrowDropdown 
            className="text-red-500" 
            style={{ 
              fontSize: `${Math.max(16, 16 + intensity/10)}px`,
              opacity: Math.max(0.5, intensity/100)
            }} 
          />
        )}
      </div>
    );
  };
  
  // Render the details area
  const renderDetails = () => (
    <div className="p-4 bg-gray-800 text-white rounded-md mb-4">
      {/* Track title and description */}
      <div className="track-info">
        <div className="track-status">{getStatusText()}</div>
        <div className="track-title">
          {initialState ? 'Neural-Reactive Audio Player' : (trackInfo.title || 'No track loaded')}
        </div>
        <div className="track-artist">
          {initialState ? 'Control music with your brain' : (trackInfo.artist || 'Load a SoundCloud track to begin')}
        </div>
        <div className="track-url">
          {currentTrackUrl && !initialState && !isLoading && !loadError && (
            <a 
              href={currentTrackUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="track-link"
            >
              View on SoundCloud
            </a>
          )}
        </div>
      </div>
      
      {/* Volume control */}
      <div className="flex items-center mt-2">
        <div className="flex items-center mr-4">
          <FaVolumeUp className={`mr-2 ${hegControlMode === 'volume' && isHEGModeActive ? 'text-green-400' : 'text-gray-400'}`} />
          <span>{Math.round(volume)}%</span>
          {hegControlMode === 'volume' && getHEGEffect()}
        </div>
        
        <div className="flex items-center mr-4">
          <FaFilter className={`mr-2 ${hegControlMode === 'filter' && isHEGModeActive ? 'text-green-400' : 'text-gray-400'}`} />
          <span>{hegControlMode === 'filter' ? 'Active' : 'Inactive'}</span>
          {hegControlMode === 'filter' && getHEGEffect()}
        </div>
        
        <div className="flex items-center">
          <MdSlowMotionVideo className={`mr-2 ${hegControlMode === 'tempo' && isHEGModeActive ? 'text-green-400' : 'text-gray-400'}`} />
          <span>{currentPlaybackRate.toFixed(2)}x</span>
          {hegControlMode === 'tempo' && getHEGEffect()}
        </div>
      </div>
      
      {/* HEG mode controls */}
      <div className="flex flex-wrap mt-4">
        <button
          className={`px-3 py-1 mr-2 mb-2 rounded-md ${isHEGModeActive ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'}`}
          onClick={() => setIsHEGModeActive(!isHEGModeActive)}
        >
          HEG Mode: {isHEGModeActive ? 'ON' : 'OFF'}
        </button>
        
        {isHEGModeActive && (
          <>
            <button
              className={`px-3 py-1 mr-2 mb-2 rounded-md flex items-center ${hegControlMode === 'volume' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'}`}
              onClick={() => setHegControlMode('volume')}
            >
              <FaVolumeUp className="mr-1" /> Volume Control
            </button>
            <button
              className={`px-3 py-1 mr-2 mb-2 rounded-md flex items-center ${hegControlMode === 'filter' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'}`}
              onClick={() => setHegControlMode('filter')}
            >
              <FaFilter className="mr-1" /> Filter Control
            </button>
            <button
              className={`px-3 py-1 mr-2 mb-2 rounded-md flex items-center ${hegControlMode === 'tempo' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'}`}
              onClick={() => setHegControlMode('tempo')}
            >
              <MdSlowMotionVideo className="mr-1" /> Tempo Control
            </button>
          </>
        )}
      </div>
      
      {isDevMode && isHEGModeActive && (
        <div className="mt-2 text-xs text-gray-400">
          <p>HEG Score: {hegData.hegScore.toFixed(4)}</p>
        </div>
      )}
    </div>
  );
  
  // Update from props when they change
  useEffect(() => {
    setIsHEGModeActive(propIsHEGModeActive);
  }, [propIsHEGModeActive]);
  
  useEffect(() => {
    setHegControlMode(propHegControlMode);
  }, [propHegControlMode]);
  
  return (
    <div
      className={classNames("enhanced-player", {
        "enhanced-player--welcome": !initialState,
        "enhanced-player--playing": isPlaying,
        "enhanced-player--loading": isLoading,
      })}
    >
      <div className="player-visuals">
        {initialState ? (
          renderWelcomeState()
        ) : isLoading && !trackLoaded ? (
          renderLoadingState()
        ) : loadError ? (
          renderErrorState()
        ) : trackInfo.artwork ? (
          <div className="artwork-container">
            <img 
              src={trackInfo.artwork} 
              alt={trackInfo.title} 
              className={`artwork ${isPlaying ? 'spinning' : ''}`}
            />
            <div className="player-status-badge">
              {isPlaying ? (
                <span className="status-playing">
                  <i className="status-icon">▶</i> Playing
                </span>
              ) : trackLoaded ? (
                <span className="status-loaded">
                  <i className="status-icon">✓</i> Ready
                </span>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="default-artwork">
            <div className="artwork-placeholder">
              <span>🎧</span>
            </div>
          </div>
        )}
        
        <iframe 
          ref={iframeRef}
          width="100%" 
          height="0"  
          frameBorder="0"
          allow="autoplay"
          className="hidden-iframe"
        ></iframe>
      </div>
      
      <div className="player-info">
        {renderDetails()}
        
        <div className="player-controls">
          <button 
            className={`play-button ${initialState || !trackInfo.duration ? 'disabled' : ''}`}
            onClick={togglePlay}
            disabled={initialState || !trackInfo.duration || isLoading}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          
          <div className="progress-container">
            <div 
              className="progress-bar"
              onClick={handleSeek}
            >
              <div 
                className="progress-fill"
                style={{ width: `${trackInfo.duration ? (trackInfo.position / trackInfo.duration) * 100 : 0}%` }}
              ></div>
            </div>
            <div className="time-display">
              <span>{formatTime(trackInfo.position)}</span>
              <span>{formatTime(trackInfo.duration)}</span>
            </div>
          </div>
          
          <div className="volume-container">
            <span className="volume-icon">🔊</span>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              className="volume-slider"
              disabled={initialState || isLoading || !!loadError}
            />
            <span className="volume-value">{volume}%</span>
          </div>
        </div>
      </div>
      
      {/* Visualizer controls */}
      <div className="visualizer-controls">
        <div className="visualizer-toggle">
          <button 
            className={visualizersActive ? 'active' : ''}
            onClick={toggleVisualizers}
          >
            {visualizersActive ? 'Hide Visualizers' : 'Show Visualizers'}
          </button>
        </div>
        
        {visualizersActive && (
          <div className="visualizer-selector">
            <button 
              className={activeVisualizer === 'frequency' ? 'active' : ''}
              onClick={() => changeVisualizer('frequency')}
            >
              Frequency
            </button>
            <button 
              className={activeVisualizer === 'heg' ? 'active' : ''}
              onClick={() => changeVisualizer('heg')}
            >
              HEG
            </button>
            <button 
              className={activeVisualizer === 'shader' ? 'active' : ''}
              onClick={() => changeVisualizer('shader')}
            >
              Shader
            </button>
            <button 
              className={activeVisualizer === 'both' ? 'active' : ''}
              onClick={() => changeVisualizer('both')}
            >
              All
            </button>
            <button 
              className={activeVisualizer === 'none' ? 'active' : ''}
              onClick={() => changeVisualizer('none')}
            >
              None
            </button>
          </div>
        )}
        
        {/* Shader geometry selector - only show when shader is active */}
        {visualizersActive && (activeVisualizer === 'shader' || activeVisualizer === 'both') && (
          <div className="shader-controls">
            <select
              value={shaderGeometry}
              onChange={handleGeometryChange}
              className="shader-geometry-select"
            >
              <option value="plane">Plane</option>
              <option value="sphere">Sphere</option>
              <option value="halfsphere">Half Sphere</option>
              <option value="circle">Circle</option>
              <option value="vrscreen">VR Screen</option>
            </select>
          </div>
        )}
      </div>
      
      {/* Visualizers */}
      {visualizersActive && (activeVisualizer === 'frequency' || activeVisualizer === 'both') && (
        <div className="visualizer frequency-visualizer">
          <h4>Frequency Spectrum</h4>
          <div className="visualizer-container">
            <AudioFrequencyVisualizer 
              audioContext={audioContextRef.current}
              sourceNode={sourceNodeRef.current} 
              isActive={isPlaying && visualizersActive} 
            />
          </div>
        </div>
      )}
      
      {visualizersActive && (activeVisualizer === 'heg' || activeVisualizer === 'both') && (
        <div className="visualizer heg-visualizer">
          <h4>Neural Activity</h4>
          <div className="visualizer-container">
            <AudioHEGVisualizer 
              hegData={hegData} 
              isActive={visualizersActive} 
            />
          </div>
        </div>
      )}
      
      {visualizersActive && (activeVisualizer === 'shader' || activeVisualizer === 'both') && (
        <div className="visualizer shader-visualizer">
          <h4>Shader Visualization</h4>
          <div className="visualizer-container shader-container">
            <ShaderVisualizer
              isActive={visualizersActive}
              geometry={shaderGeometry}
              hegData={hegData}
            />
          </div>
        </div>
      )}
      
      {/* Hidden audio element for Web Audio API-based visualization */}
      <audio ref={audioElementRef} style={{ display: 'none' }} />
    </div>
  );
};

export default EnhancedSoundCloudPlayer; 