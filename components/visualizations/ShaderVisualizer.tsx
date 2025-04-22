import React, { useEffect, useRef, useState, useCallback } from 'react';
import { THREEShaderHelper } from 'threeshaderhelper';

interface ShaderVisualizerProps {
  isActive: boolean;
  geometry: string;
  height?: number;
  width?: number;
  hegData?: {
    heg: number;
    hegAvg2s: number;
    hegAvg4s: number;
    hegEffort: number;
    hegScore: number;
  };
  audioContext?: AudioContext | null;
  sourceNode?: MediaElementAudioSourceNode | null;
}

const ShaderVisualizer: React.FC<ShaderVisualizerProps> = ({ 
  isActive,
  geometry = 'plane',
  height = 300,
  width = 800,
  hegData,
  audioContext,
  sourceNode
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shaderHelperRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioFrameRef = useRef<number | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [audioData, setAudioData] = useState<{
    frequency: Uint8Array | null;
    waveform: Uint8Array | null;
    volume: number;
  }>({
    frequency: null,
    waveform: null,
    volume: 0
  });
  const [volume, setVolume] = useState(0);
  const [bassLevel, setBassLevel] = useState(0);
  const [midLevel, setMidLevel] = useState(0);
  const [trebleLevel, setTrebleLevel] = useState(0);
  const animationRef = useRef<number | null>(null);
  const frequencyDataRef = useRef<Uint8Array | null>(null);
  
  // Set up audio analyzer
  useEffect(() => {
    if (isActive && audioContext && sourceNode) {
      try {
        // Create analyzer node if it doesn't exist
        if (!analyzerRef.current) {
          analyzerRef.current = audioContext.createAnalyser();
          analyzerRef.current.fftSize = 1024;
          analyzerRef.current.smoothingTimeConstant = 0.8;
          
          // Connect source to analyzer
          sourceNode.connect(analyzerRef.current);
          
          // Create data arrays
          const frequencyData = new Uint8Array(analyzerRef.current.frequencyBinCount);
          const waveformData = new Uint8Array(analyzerRef.current.frequencyBinCount);
          
          setAudioData(prev => ({
            ...prev,
            frequency: frequencyData,
            waveform: waveformData
          }));
        }
      } catch (error) {
        console.error("Error setting up audio analyzer:", error);
      }
    }
    
    return () => {
      if (analyzerRef.current && sourceNode) {
        try {
          sourceNode.disconnect(analyzerRef.current);
        } catch (e) {
          console.error("Error disconnecting analyzer:", e);
        }
      }
    };
  }, [isActive, audioContext, sourceNode]);
  
  // Initialize shader helper when component becomes active
  useEffect(() => {
    // Only initialize if the component is active and not already initialized
    if (!isActive || shaderHelperRef.current) return;
    
    if (canvasRef.current) {
      // Create a new THREEShaderHelper instance
      const helper = new THREEShaderHelper({
        canvas: canvasRef.current,
        geometry: geometry || "plane",
        backgroundColor: 0x000000
      });
      
      shaderHelperRef.current = helper;
    }
    
    return () => {
      // Clean up when component becomes inactive
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      if (audioFrameRef.current) {
        cancelAnimationFrame(audioFrameRef.current);
        audioFrameRef.current = null;
      }
      
      if (shaderHelperRef.current) {
        shaderHelperRef.current = null;
      }
    };
  }, [isActive, geometry]);

  // Update shader with HEG data and time
  useEffect(() => {
    if (!isActive || !shaderHelperRef.current) return;
    
    const updateShader = () => {
      if (!isActive || !shaderHelperRef.current) return;
      
      const time = performance.now() / 1000;
      const helper = shaderHelperRef.current;
      
      // Set time and HEG-related uniforms
      helper.setUniforms({
        iTime: time,
        hegValue: hegData?.hegScore || 0.5,
        hegEffort: hegData?.hegEffort || 0.5,
        audioVolume: volume,
        bassPower: bassLevel,
        midPower: midLevel,
        treblePower: trebleLevel
      });
      
      // Render the frame
      helper.render();
      
      // Resize canvas based on HEG effort and audio volume
      const baseSize = Math.min(width, height);
      const hegFactor = hegData?.hegEffort || 0.5;
      const audioFactor = volume;
      const sizeFactor = 0.5 + Math.max(hegFactor, audioFactor) * 0.5;
      
      if (canvasRef.current) {
        canvasRef.current.style.width = `${baseSize * sizeFactor}px`;
        canvasRef.current.style.height = `${baseSize * sizeFactor}px`;
      }
      
      animationFrameRef.current = requestAnimationFrame(updateShader);
    };
    
    animationFrameRef.current = requestAnimationFrame(updateShader);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isActive, hegData, width, height, volume, bassLevel, midLevel, trebleLevel]);

  // Handle geometry changes
  useEffect(() => {
    if (!isActive || !shaderHelperRef.current) return;
    
    shaderHelperRef.current.setGeometry(geometry || "plane");
  }, [geometry, isActive]);

  // Set up audio analysis
  useEffect(() => {
    if (!isActive || !audioContext || !sourceNode) return;

    try {
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      sourceNode.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateAudioData = () => {
        if (!isActive) return;
        
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate volume (overall amplitude)
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avgVolume = sum / dataArray.length / 255; // Normalize to 0-1
        setVolume(avgVolume);
        
        // Calculate frequency bands
        // Bass: 0-150Hz (roughly first 1/8 of array)
        const bassEnd = Math.floor(dataArray.length / 8);
        let bassSum = 0;
        for (let i = 0; i < bassEnd; i++) {
          bassSum += dataArray[i];
        }
        const bassAvg = bassSum / bassEnd / 255;
        setBassLevel(bassAvg);
        
        // Mids: 150Hz-2kHz (roughly next 3/8 of array)
        const midEnd = Math.floor(dataArray.length / 2);
        let midSum = 0;
        for (let i = bassEnd; i < midEnd; i++) {
          midSum += dataArray[i];
        }
        const midAvg = midSum / (midEnd - bassEnd) / 255;
        setMidLevel(midAvg);
        
        // Treble: 2kHz+ (roughly last half of array)
        let trebleSum = 0;
        for (let i = midEnd; i < dataArray.length; i++) {
          trebleSum += dataArray[i];
        }
        const trebleAvg = trebleSum / (dataArray.length - midEnd) / 255;
        setTrebleLevel(trebleAvg);
        
        audioFrameRef.current = requestAnimationFrame(updateAudioData);
      };
      
      audioFrameRef.current = requestAnimationFrame(updateAudioData);
      
      return () => {
        if (audioFrameRef.current) {
          cancelAnimationFrame(audioFrameRef.current);
          audioFrameRef.current = null;
        }
        // Disconnect analyzer when done
        sourceNode.disconnect(analyser);
      };
    } catch (error) {
      console.error('Audio analysis error:', error);
    }
  }, [isActive, audioContext, sourceNode]);
  
  // Cleanup resources on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (audioFrameRef.current) {
        cancelAnimationFrame(audioFrameRef.current);
      }
      
      if (analyzerRef.current && sourceNode) {
        try {
          sourceNode.disconnect(analyzerRef.current);
          analyzerRef.current = null;
        } catch (e) {
          console.error("Error disconnecting analyzer:", e);
        }
      }
      
      if (shaderHelperRef.current) {
        // Clean up shader helper if possible
        if (typeof shaderHelperRef.current.dispose === 'function') {
          shaderHelperRef.current.dispose();
        }
        
        shaderHelperRef.current = null;
      }
      
      setIsInitialized(false);
    };
  }, [sourceNode]);
  
  // Analyze audio and update shader
  const updateAudioData = useCallback(() => {
    if (!analyzerRef.current || !frequencyDataRef.current) return [];
    
    analyzerRef.current.getByteFrequencyData(frequencyDataRef.current);
    
    // Extract bass, mid, and treble
    const bass = Array.from(frequencyDataRef.current.slice(0, 8)).reduce((a, b) => a + b, 0) / 8;
    const mid = Array.from(frequencyDataRef.current.slice(8, 24)).reduce((a, b) => a + b, 0) / 16;
    const treble = Array.from(frequencyDataRef.current.slice(24, 64)).reduce((a, b) => a + b, 0) / 40;
    
    return [
      bass / 255, // Normalize to 0-1
      mid / 255,
      treble / 255
    ];
  }, []);
  
  // Initialize shader helper
  useEffect(() => {
    if (!isActive || !canvasRef.current) return;
    
    shaderHelperRef.current = new THREEShaderHelper(canvasRef.current);
    shaderHelperRef.current.init(geometry);
    
    const animate = () => {
      if (!shaderHelperRef.current) return;
      
      const audioIndicators = updateAudioData();
      setAudioData(prev => ({
        ...prev,
        frequency: frequencyDataRef.current,
        waveform: frequencyDataRef.current,
        volume: audioIndicators[0] || 0
      }));
      
      // Update shader uniforms
      const time = performance.now() / 1000;
      const hegFactor = hegData?.hegEffort || 0.5;
      shaderHelperRef.current.updateUniforms({
        u_time: time,
        u_effort: hegFactor,
        u_bass: audioIndicators[0] || 0,
        u_mid: audioIndicators[1] || 0,
        u_treble: audioIndicators[2] || 0,
      });
      
      // Resize canvas based on HEG effort
      const baseSize = Math.min(width, height);
      const size = baseSize * (0.8 + (hegFactor * 0.4));
      canvasRef.current!.style.width = `${size}px`;
      canvasRef.current!.style.height = `${size}px`;
      
      shaderHelperRef.current.render();
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      
      if (shaderHelperRef.current) {
        shaderHelperRef.current = null;
      }
    };
  }, [isActive, geometry, width, height, hegData?.hegScore, updateAudioData]);
  
  return (
    <div className="shader-visualizer">
      <canvas 
        ref={canvasRef}
        className="shader-visualizer-canvas"
        width={width}
        height={height}
      />
      {isActive && (
        <div className="audio-indicators">
          {audioData.map((level, index) => (
            <div
              key={index}
              className={`audio-indicator ${index === 0 ? 'bass' : index === 1 ? 'mid' : 'treble'}`}
              style={{ height: `${Math.max(5, level * 50)}px` }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ShaderVisualizer; 