// EnhancedSoundCloudPlayer with frequency and HEG visualization
import React, { useEffect, useRef, useState, useCallback } from 'react';
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
import AudioWaveformVisualizer from '../visualizations/AudioWaveformVisualizer';
import ShaderVisualizer from '../visualizations/ShaderVisualizer';
import { VscEyeClosed } from 'react-icons/vsc';

// Define volume constants
const MIN_VOLUME = 50;
const MAX_VOLUME = 100;
const VOLUME_RANGE = MAX_VOLUME - MIN_VOLUME;

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
  const playbackRateProcessor = useRef<any>(null);
  const [widget, setWidget] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(Math.max(MIN_VOLUME, 50));
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentTrackUrl, setCurrentTrackUrl] = useState<string>(trackUrl);
  const [trackLoaded, setTrackLoaded] = useState(false);
  const [initialState, setInitialState] = useState(true);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [currentPlaybackRate, setCurrentPlaybackRate] = useState<number>(1.0);
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
  
  // State for visualizers - ensure they're active by default
  const [visualizersActive, setVisualizersActive] = useState(true);
  const [activeVisualizer, setActiveVisualizer] = useState<'frequency' | 'heg' | 'shader' | 'all' | 'none'>('none');
  const [shaderGeometry, setShaderGeometry] = useState<'plane' | 'sphere' | 'halfsphere' | 'circle' | 'vrscreen'>('plane');
  
  // Add state for visualizer refresh to force re-render when needed
  const [visualizerRefreshKey, setVisualizerRefreshKey] = useState(0);
  
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
      console.log('Setting up audio nodes with stream URL:', streamUrl);
      
      // For the frequency visualizer and tempo control, we need to create a real audio element
      if (!audioElementRef.current) {
        audioElementRef.current = new Audio();
        audioElementRef.current.crossOrigin = 'anonymous';
        audioElementRef.current.volume = 1.0; // Set to full volume for visualization
        audioElementRef.current.loop = true;
        
        // Set playbackRate property if supported by the browser
        if ('playbackRate' in audioElementRef.current) {
          audioElementRef.current.playbackRate = currentPlaybackRate;
          console.log(`Initial playback rate set to ${currentPlaybackRate}x`);
        }
        
        // Add event handlers
        audioElementRef.current.onplay = () => {
          console.log('Hidden audio element playing (for visualization and tempo control)');
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
      
      // Try to get a direct stream URL, not just from widget
      if (streamUrl !== 'widget://soundcloud') {
        audioElementRef.current.src = streamUrl;
        audioElementRef.current.load();
        console.log('Loaded direct stream URL into audio element');
      } else {
        console.warn('Using SoundCloud widget only, no direct audio stream available for visualization or tempo control');
        // Try to get stream URL again from another approach
        if (currentTrackUrl) {
          getStreamUrl(currentTrackUrl).then(streamUrl => {
            if (streamUrl && audioElementRef.current && streamUrl !== 'widget://soundcloud') {
              audioElementRef.current.src = streamUrl;
              audioElementRef.current.load();
              console.log('Successfully loaded audio stream for visualization and tempo control');
              
              // If we're already playing, try to sync and play the audio element
              if (isPlaying) {
                widget?.getPosition((position: number) => {
                  audioElementRef.current!.currentTime = position / 1000; // Convert ms to seconds
                  audioElementRef.current!.play().catch(console.error);
                });
              }
            }
          });
        }
      }
      
      // Create source node for visualization and tempo control
      if (audioElementRef.current && audioContextRef.current && !sourceNodeRef.current) {
        try {
          // Resume audio context if it's suspended
          if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
          }
          
          sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioElementRef.current);
          
          // Create nodes if they don't exist
          if (!filterNodeRef.current) {
            filterNodeRef.current = audioContextRef.current.createBiquadFilter();
            filterNodeRef.current.type = 'lowpass';
            filterNodeRef.current.frequency.value = 20000; // Default to max frequency
          }
          
          if (!gainNodeRef.current) {
            gainNodeRef.current = audioContextRef.current.createGain();
            gainNodeRef.current.gain.value = volume / 100;
          }
          
          // Connect nodes in series: source -> filter -> gain -> destination
          sourceNodeRef.current.connect(filterNodeRef.current);
          filterNodeRef.current.connect(gainNodeRef.current);
          gainNodeRef.current.connect(audioContextRef.current.destination);
          
          console.log('Audio source connected to audio graph for visualization and tempo control');
          
          // Ensure the gain node is set with the current volume
          gainNodeRef.current.gain.value = volume / 100;
          console.log(`Initial gain set to ${volume / 100}`);
          
          // Force refresh visualizers since audio is now available
          setVisualizerRefreshKey(prev => prev + 1);
        } catch (e) {
          console.error('Error creating source node:', e);
        }
      }
      
      console.log('Audio setup complete for visualization and tempo control');
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
      let newVolume = volume; // Start with current volume
      
      if (sessionStarted && localMinHegScore !== localMaxHegScore) {
        // Normalize hegScore to 0-100 range based on local min/max
        const scoreRange = localMaxHegScore - localMinHegScore;
        const normalizedScore = (hegData.hegScore - localMinHegScore) / scoreRange;
        
        // Map normalized score (0-1) to volume range (MIN_VOLUME-MAX_VOLUME)
        newVolume = MIN_VOLUME + (normalizedScore * VOLUME_RANGE);
        newVolume = Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, newVolume));
      } else if (!sessionStarted || hegData.hegScore === 0) {
        // Keep current volume until we have enough HEG data for calibration
        return;
      }
      
      setVolume(newVolume);
      
      // CRITICAL: Set volume in ALL places to ensure it works
      // 1. Set SoundCloud widget volume
      if (widget) {
        try {
          widget.setVolume(newVolume / 100);
        } catch (e) {
          console.error('Failed to set widget volume:', e);
        }
      }
      
      // 2. Set gain node volume for Web Audio API
      if (gainNodeRef.current) {
        try {
          gainNodeRef.current.gain.value = newVolume / 100;
        } catch (e) {
          console.error('Failed to set gain node volume:', e);
        }
      }
      
      // 3. Set device audio element volume as a fallback
      if (audioElementRef.current) {
        try {
          // For device audio we can use full volume
          audioElementRef.current.volume = 1.0;
        } catch (e) {
          console.error('Failed to set audio element volume:', e);
        }
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
        
        // Map the normalized score to a filter amount between MIN_VOLUME and MAX_VOLUME
        filterAmount = MIN_VOLUME + (normalizedScore * VOLUME_RANGE);
        filterAmount = Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, filterAmount));
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
        
        // Only update if the rate has changed significantly
        if (Math.abs(clampedRate - currentPlaybackRate) > 0.01) {
          setCurrentPlaybackRate(clampedRate);
          
          // Update the audio element's playback rate
          if (audioElementRef.current && 'playbackRate' in audioElementRef.current) {
            try {
              audioElementRef.current.playbackRate = clampedRate;
              
              // Also update the widget volume to compensate for tempo changes
              // Lower volumes at higher speeds can help perception
              if (widget) {
                const volCompensation = 1.0 - ((clampedRate - 1.0) * 0.2);
                const compensatedVol = Math.max(0.4, volCompensation) * (volume / 100);
                widget.setVolume(compensatedVol);
              }
            } catch (e) {
              console.error('Error setting playback rate:', e);
            }
          }
        }
        
        if (isDevMode) {
          console.log(`HEG Tempo Control: Score=${hegData.hegScore.toFixed(2)}, Min=${localMinHegScore.toFixed(2)}, Max=${localMaxHegScore.toFixed(2)}, Rate=${clampedRate.toFixed(2)}x`);
        }
      }
    }
  }, [hegData, isHEGModeActive, hegControlMode, widget, sessionStarted, localMinHegScore, localMaxHegScore, isDevMode, isPlaying]);
  
  // Reset session data when HEG mode or control mode changes
  useEffect(() => {
    // Don't reset volume when toggling HEG mode, only reset calibration data
    setSessionStarted(false);
    setLocalMinHegScore(0);
    setLocalMaxHegScore(0);
    
    // If we're turning off HEG mode, restore default volume
    if (!isHEGModeActive) {
      const defaultVolume = 75; // Higher default volume when exiting HEG mode
      setVolume(defaultVolume);
      
      // Update volume in all necessary places
      if (widget) {
        try {
          widget.setVolume(defaultVolume / 100);
        } catch (e) {
          console.error('Failed to set widget volume:', e);
        }
      }
      
      if (gainNodeRef.current) {
        try {
          gainNodeRef.current.gain.value = defaultVolume / 100;
        } catch (e) {
          console.error('Failed to set gain node volume:', e);
        }
      }
    }
  }, [isHEGModeActive, hegControlMode]);
  
  // Get stream URL for direct audio playback
  const getStreamUrl = async (scUrl: string) => {
    try {
      // Try multiple approaches to get a stream URL
      console.log('Attempting to get stream URL for:', scUrl);
      
      // First try - direct SoundCloud API with client ID
      const clientIds = [
        'a3e059563d7fd3372b49b37f00a00bcf', // Primary client ID
        'c5a171200f3a607a5f338f9a6d75072b', // Alternative client ID
        '6ibGMJCmEUKJDLKsLshVZ94JwWGUHGMR', // Another alternative
      ];
      
      // Try each client ID until one works
      for (const clientId of clientIds) {
        try {
          const resolveUrl = `https://api.soundcloud.com/resolve.json?url=${encodeURIComponent(scUrl)}&client_id=${clientId}`;
          const response = await fetch(resolveUrl);
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.stream_url) {
              const streamWithId = `${data.stream_url}?client_id=${clientId}`;
              setStreamUrl(streamWithId);
              console.log('Got stream URL from API:', streamWithId);
              return streamWithId;
            }
          }
        } catch (apiError) {
          console.warn(`SoundCloud API request failed with client ID ${clientId}:`, apiError);
        }
      }
      
      // Second try - extract from widget iframe
      if (widget && iframeRef.current) {
        try {
          console.log('Attempting to extract stream URL from widget iframe...');
          
          // We'll attempt to extract the stream URL from the widget
          const iframeDocument = iframeRef.current.contentDocument || 
                                (iframeRef.current.contentWindow?.document);
          
          if (iframeDocument) {
            // Look for audio elements or streaming URLs in the iframe
            const audioElements = iframeDocument.querySelectorAll('audio');
            if (audioElements.length > 0) {
              const src = audioElements[0].src;
              if (src) {
                setStreamUrl(src);
                console.log('Got stream URL from widget iframe:', src);
                return src;
              }
            }
            
            // Look for streaming URLs in scripts
            const scripts = iframeDocument.querySelectorAll('script');
            for (let i = 0; i < scripts.length; i++) {
              const scriptContent = scripts[i].textContent || '';
              const urlMatch = scriptContent.match(/"streamUrl":"([^"]+)"/);
              if (urlMatch && urlMatch[1]) {
                const streamUrl = urlMatch[1].replace(/\\u0026/g, '&');
                setStreamUrl(streamUrl);
                console.log('Got stream URL from widget script:', streamUrl);
                return streamUrl;
              }
            }
          }
        } catch (extractError) {
          console.warn('Error extracting stream URL from widget:', extractError);
        }
      }
      
      // Third try - attempt to use a proxy service
      try {
        console.log('Attempting to use proxy service to get stream URL...');
        const proxyUrl = `https://cors-anywhere.herokuapp.com/${scUrl}`;
        const response = await fetch(proxyUrl);
        const html = await response.text();
        
        // Look for stream URL in the HTML
        const urlMatch = html.match(/"stream_url":"([^"]+)"/);
        if (urlMatch && urlMatch[1]) {
          const streamUrl = urlMatch[1].replace(/\\u0026/g, '&');
          setStreamUrl(streamUrl);
          console.log('Got stream URL from proxy service:', streamUrl);
          return streamUrl;
        }
      } catch (proxyError) {
        console.warn('Error using proxy service:', proxyError);
      }

      // If all else fails, use widget placeholder
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
          // CRITICAL: Ensure volume is set correctly when widget is ready
          try {
            const volumeValue = volume / 100;
            widgetInstance.setVolume(volumeValue);
            console.log(`Widget volume set on READY: ${volumeValue}`);
          } catch (e) {
            console.error('Failed to set initial widget volume:', e);
          }
          
          // Get track info
          updateTrackInfo(widgetInstance);
          setLoadingProgress(100);
        });
        
        widgetInstance.bind(SC.Widget.Events.PLAY, () => {
          setIsPlaying(true);
          setTrackLoaded(true);
          
          // Get current widget position
          widgetInstance.getPosition((initialPosition: number) => {
            console.log(`Initial position: ${initialPosition}ms`);
            
            // Start position tracking with more frequent updates
            const positionInterval = setInterval(() => {
              widgetInstance.getPosition((position: number) => {
                setTrackInfo(prev => ({ ...prev, position }));
                
                // Sync with our hidden audio element for visualization and tempo control
                if (audioElementRef.current && (isHEGModeActive || activeVisualizer !== 'none')) {
                  // Convert position from ms to seconds for audio element
                  const currentTimeSec = position / 1000;
                  
                  // If the positions are out of sync by more than 0.3 seconds, sync them
                  if (Math.abs(audioElementRef.current.currentTime - currentTimeSec) > 0.3) {
                    audioElementRef.current.currentTime = currentTimeSec;
                    
                    if (isDevMode) {
                      console.log(`Synced audio element time: ${currentTimeSec}s`);
                    }
                  }
                }
              });
            }, 250); // Update more frequently for better sync
            
            // Sync with our hidden audio element for visualization and tempo control
            if (audioElementRef.current) {
              // Set initial position
              audioElementRef.current.currentTime = initialPosition / 1000;
              
              // Ensure we have the stream URL
              if (audioElementRef.current.src && audioElementRef.current.src !== window.location.href) {
                audioElementRef.current.play().catch(e => {
                  console.warn('Auto-play prevented by browser for visualizer/tempo audio:', e);
                  
                  // Add a manual play trigger for when the user interacts
                  const handleUserInteraction = () => {
                    if (audioElementRef.current) {
                      audioElementRef.current.play().catch(console.error);
                    }
                    window.removeEventListener('click', handleUserInteraction);
                    window.removeEventListener('touchstart', handleUserInteraction);
                  };
                  
                  window.addEventListener('click', handleUserInteraction, { once: true });
                  window.addEventListener('touchstart', handleUserInteraction, { once: true });
                });
              } else if (streamUrl === 'widget://soundcloud' && currentTrackUrl) {
                // Try to get a direct stream URL again if we don't have it
                getStreamUrl(currentTrackUrl).then(newStreamUrl => {
                  if (newStreamUrl && audioElementRef.current && newStreamUrl !== 'widget://soundcloud') {
                    audioElementRef.current.src = newStreamUrl;
                    audioElementRef.current.load();
                    // Set initial position before playing
                    audioElementRef.current.currentTime = initialPosition / 1000;
                    audioElementRef.current.play().catch(e => {
                      console.warn('Auto-play prevented after fetching stream URL:', e);
                    });
                    console.log('Successfully loaded audio stream for tempo control on play');
                  }
                });
              }
            }
            
            return () => clearInterval(positionInterval);
          });
          
          widgetInstance.bind(SC.Widget.Events.PAUSE, () => {
            setIsPlaying(false);
            
            // Also pause our audio element
            if (audioElementRef.current) {
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
    const inputValue = parseInt(e.target.value, 10);
    
    // Ensure volume is at least MIN_VOLUME
    const newVolume = Math.max(MIN_VOLUME, inputValue);
    
    setVolume(newVolume);
    
    // Apply volume to the widget
    if (widget) {
      try {
        widget.setVolume(newVolume / 100);
        console.log(`Widget volume set to ${newVolume}%`);
      } catch (e) {
        console.error('Error setting widget volume:', e);
      }
    }
    
    // Apply volume to the audio element itself (for direct playback)
    if (audioElementRef.current) {
      try {
        audioElementRef.current.volume = 1.0; // Keep full for visualization
      } catch (e) {
        console.error('Error setting audio element volume:', e);
      }
    }
    
    // Apply volume to Web Audio API gain node
    if (gainNodeRef.current) {
      try {
        gainNodeRef.current.gain.value = newVolume / 100;
        console.log(`Gain node volume set to ${newVolume}%`);
      } catch (e) {
        console.error('Error setting gain node volume:', e);
      }
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
  
  // Toggle visualizers with force refresh
  const toggleVisualizers = () => {
    if (activeVisualizer === 'none') {
      setActiveVisualizer('frequency');
    } else {
      setActiveVisualizer('none');
    }
  };
  
  // Change active visualizer with force refresh
  const changeVisualizer = (type: 'frequency' | 'heg' | 'shader' | 'all' | 'none') => {
    setActiveVisualizer(type);
    // Initialize WebGL if needed for shader visualization
    if ((type === 'shader' || type === 'all') && audioElementRef.current) {
      // No additional initialization needed as ShaderVisualizer handles this
    }
  };
  
  // Change shader geometry with force refresh
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
    if (!isHEGModeActive) return null;
    
    return (
      <div className="heg-effect">
        <div className="font-semibold text-sm">HEG Neural Control:</div>
        <div className="flex items-center text-xs">
          <span className="mr-2">Mode:</span>
          <span className="bg-blue-500 px-2 py-0.5 rounded text-white">
            {hegControlMode === 'volume' && 'Volume Control'}
            {hegControlMode === 'filter' && 'Filter Control'}
            {hegControlMode === 'tempo' && 'Tempo Control'}
          </span>
          
          {hegControlMode === 'volume' && (
            <span className="ml-2">Volume: {volume.toFixed(0)}%</span>
          )}
          
          {hegControlMode === 'filter' && (
            <span className="ml-2">Filter: {volume.toFixed(0)}%</span>
          )}
          
          {hegControlMode === 'tempo' && (
            <span className="ml-2">Tempo: {currentPlaybackRate.toFixed(2)}x</span>
          )}
        </div>
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

  // Add effect to ensure visualizers initialize properly
  useEffect(() => {
    if (visualizersActive) {
      // Force a refresh of visualizers on component mount or when activated
      const timer = setTimeout(() => {
        setVisualizerRefreshKey(prev => prev + 1);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [visualizersActive]);
  
  // Add effect to keep audio element playback rate in sync with currentPlaybackRate state
  useEffect(() => {
    if (audioElementRef.current && 'playbackRate' in audioElementRef.current) {
      audioElementRef.current.playbackRate = currentPlaybackRate;
      
      if (isDevMode) {
        console.log(`Updated audio element playback rate to ${currentPlaybackRate}x`);
      }
    }
  }, [currentPlaybackRate, isDevMode]);
  
  // Main return JSX
  return (
    <div className="enhanced-player">
      {/* SoundCloud Player Section - Clean, separate section */}
      <div className="soundcloud-player-section">
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
          {/* Track title and info */}
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
          
          <div className="player-controls">
            <button 
              className={`play-button ${initialState || !trackInfo.duration ? 'disabled' : ''}`}
              onClick={togglePlay}
              disabled={initialState || !trackInfo.duration || isLoading}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              type="button"
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
                min={MIN_VOLUME.toString()}
                max="100"
                value={volume}
                onChange={handleVolumeChange}
                className="volume-slider"
                disabled={initialState || isLoading || !!loadError}
              />
              <span className="volume-value">{volume}%</span>
            </div>
          </div>
          
          {/* HEG mode controls */}
          <div className="heg-controls">
            <button
              className={`heg-mode-button ${isHEGModeActive ? 'active' : ''}`}
              onClick={() => setIsHEGModeActive(!isHEGModeActive)}
              type="button"
            >
              HEG Mode: {isHEGModeActive ? 'ON' : 'OFF'}
            </button>
            
            {isHEGModeActive && (
              <div className="heg-mode-options">
                <button
                  className={`heg-option-button ${hegControlMode === 'volume' ? 'active' : ''}`}
                  onClick={() => setHegControlMode('volume')}
                  type="button"
                >
                  <FaVolumeUp className="heg-icon" /> Volume
                </button>
                <button
                  className={`heg-option-button ${hegControlMode === 'filter' ? 'active' : ''}`}
                  onClick={() => setHegControlMode('filter')}
                  type="button"
                >
                  <FaFilter className="heg-icon" /> Filter
                </button>
                <button
                  className={`heg-option-button ${hegControlMode === 'tempo' ? 'active' : ''}`}
                  onClick={() => setHegControlMode('tempo')}
                  type="button"
                >
                  <MdSlowMotionVideo className="heg-icon" /> Tempo
                </button>
              </div>
            )}
            
            {isHEGModeActive && (
              <div className="heg-display">
                <div className="heg-parameter">
                  <span className="heg-label">
                    {hegControlMode === 'volume' && 'Volume:'}
                    {hegControlMode === 'filter' && 'Filter:'}
                    {hegControlMode === 'tempo' && 'Tempo:'}
                  </span>
                  <span className="heg-value">
                    {hegControlMode === 'volume' && `${volume.toFixed(0)}%`}
                    {hegControlMode === 'filter' && `${volume.toFixed(0)}%`}
                    {hegControlMode === 'tempo' && `${currentPlaybackRate.toFixed(2)}x`}
                  </span>
                </div>
                
                {isDevMode && (
                  <div className="heg-score">
                    HEG Score: {hegData.hegScore.toFixed(4)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Visualizers Section - Always visible */}
      <div className="visualizers-section">
        <h3 className="visualizers-title">Audio Visualizers</h3>
        
        <div className="visualizers-grid">
          {/* Frequency Visualizer */}
          <div className="visualizer frequency-visualizer">
            <div className="visualizer-header">Frequency Spectrum</div>
            <div className="visualizer-container">
              <div 
                className="progress-indicator"
                style={{
                  width: `${trackInfo.duration ? (trackInfo.position / trackInfo.duration) * 100 : 0}%`
                }}
              ></div>
              <AudioFrequencyVisualizer 
                key={`freq-${visualizerRefreshKey}`}
                isActive={isPlaying}
                audioContext={audioContextRef.current}
                sourceNode={sourceNodeRef.current}
              />
            </div>
          </div>
          
          {/* Waveform Visualizer */}
          <div className="visualizer waveform-visualizer">
            <div className="visualizer-header">Audio Waveform</div>
            <div className="visualizer-container">
              <div 
                className="progress-indicator"
                style={{
                  width: `${trackInfo.duration ? (trackInfo.position / trackInfo.duration) * 100 : 0}%`
                }}
              ></div>
              <AudioWaveformVisualizer 
                key={`waveform-${visualizerRefreshKey}`}
                isActive={isPlaying}
                audioContext={audioContextRef.current}
                sourceNode={sourceNodeRef.current}
              />
            </div>
          </div>
          
          {/* HEG Visualizer */}
          <div className="visualizer heg-visualizer">
            <div className="visualizer-header">HEG Neural Activity</div>
            <div className="visualizer-container">
              <AudioHEGVisualizer 
                key={`heg-${visualizerRefreshKey}`}
                isActive={isPlaying}
                hegData={hegData}
                audioContext={audioContextRef.current}
                sourceNode={sourceNodeRef.current}
              />
            </div>
          </div>
          
          {/* Shader Visualizer */}
          {activeVisualizer === 'shader' || activeVisualizer === 'all' ? (
            <div className={`visualizer-container shader-visualizer`}>
              <ShaderVisualizer 
                isActive={activeVisualizer === 'shader' || activeVisualizer === 'all'} 
                geometry={shaderGeometry}
                hegData={hegData}
                audioContext={audioContextRef.current}
                sourceNode={sourceNodeRef.current}
              />
              <div className="shader-controls">
                <select 
                  className="shader-geometry-select"
                  value={shaderGeometry}
                  onChange={handleGeometryChange}
                >
                  <option value="plane">Plane</option>
                  <option value="sphere">Sphere</option>
                  <option value="halfsphere">Half Sphere</option>
                  <option value="circle">Circle</option>
                  <option value="vrscreen">VR Screen</option>
                </select>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default EnhancedSoundCloudPlayer; 