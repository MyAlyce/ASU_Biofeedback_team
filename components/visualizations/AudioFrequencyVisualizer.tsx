import React, { useEffect, useRef, useState } from 'react';

interface AudioFrequencyVisualizerProps {
  audioContext: AudioContext | null;
  sourceNode: MediaElementAudioSourceNode | null;
  isActive: boolean;
}

const AudioFrequencyVisualizer: React.FC<AudioFrequencyVisualizerProps> = ({ 
  audioContext, 
  sourceNode,
  isActive
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const [frequencyBins, setFrequencyBins] = useState<Uint8Array | null>(null);
  const [timeData, setTimeData] = useState<Uint8Array | null>(null);
  
  // Peak data history for consistent waveform display
  const [peakData, setPeakData] = useState<number[]>([]);
  const [waveformHistory, setWaveformHistory] = useState<number[]>([]);
  
  // Canvas styles
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [progress, setProgress] = useState(0); // 0-1 for playback progress
  
  // Colors
  const baseColor = '#81D8D0';    // SoundCloud style teal
  const playedColor = '#f50';     // SoundCloud style orange for played portion
  const bgColor = '#f5f5f5';      // Light background
  
  // Set up analyzer and data arrays
  useEffect(() => {
    if (!audioContext || !sourceNode || !isActive) return;
    
    try {
      // Create analyzer if it doesn't exist
      if (!analyzerRef.current) {
        analyzerRef.current = audioContext.createAnalyser();
        analyzerRef.current.fftSize = 2048; // Higher value for smoother waveform
        analyzerRef.current.smoothingTimeConstant = 0.2;
        
        // Connect source to analyzer
        sourceNode.connect(analyzerRef.current);
        
        // Create data arrays
        const bufferLength = analyzerRef.current.frequencyBinCount;
        setFrequencyBins(new Uint8Array(bufferLength));
        setTimeData(new Uint8Array(bufferLength));
        
        // Initialize peak data array
        setPeakData(Array(200).fill(0)); // Start with 200 data points
        setWaveformHistory(Array(200).fill(0.5)); // Middle value for waveform
        
        console.log('Audio frequency analyzer set up, buffer length:', bufferLength);
      }
    } catch (error) {
      console.error('Error setting up audio analyzer:', error);
    }
    
    // Clean up
    return () => {
      if (analyzerRef.current && sourceNode) {
        try {
          sourceNode.disconnect(analyzerRef.current);
          analyzerRef.current = null;
        } catch (e) {
          console.error('Error disconnecting analyzer:', e);
        }
      }
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioContext, sourceNode, isActive]);
  
  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        setDimensions({
          width: canvasRef.current.clientWidth,
          height: canvasRef.current.clientHeight
        });
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Update dimensions on the canvas element when they change
  useEffect(() => {
    if (canvasRef.current && dimensions.width > 0 && dimensions.height > 0) {
      canvasRef.current.width = dimensions.width;
      canvasRef.current.height = dimensions.height;
    }
  }, [dimensions]);
  
  // Fake a tracking progress value for demonstration (remove this in production)
  useEffect(() => {
    const interval = setInterval(() => {
      if (sourceNode?.mediaElement) {
        const element = sourceNode.mediaElement;
        if (!element.paused && element.duration) {
          setProgress(element.currentTime / element.duration);
        }
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [sourceNode]);
  
  // Main drawing function
  useEffect(() => {
    if (!isActive || !canvasRef.current || !analyzerRef.current || !frequencyBins || !timeData) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Animation function
    const draw = () => {
      if (!analyzerRef.current || !ctx || !frequencyBins || !timeData) return;
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      try {
        // Get frequency and time domain data
        analyzerRef.current.getByteFrequencyData(frequencyBins);
        analyzerRef.current.getByteTimeDomainData(timeData);
        
        // Calculate peak data (average of frequency bins)
        const newPeakData = [...peakData];
        newPeakData.shift(); // Remove oldest data point
        
        // Calculate a new peak value based on frequency data
        let sum = 0;
        for (let i = 0; i < frequencyBins.length; i++) {
          sum += frequencyBins[i];
        }
        const average = sum / frequencyBins.length / 255; // Normalize to 0-1
        newPeakData.push(average);
        setPeakData(newPeakData);
        
        // Calculate a new waveform value based on time domain data
        const newWaveformHistory = [...waveformHistory];
        newWaveformHistory.shift();
        
        let waveformSum = 0;
        for (let i = 0; i < timeData.length; i++) {
          waveformSum += Math.abs((timeData[i] / 128.0) - 1.0); // Normalize to 0-1 from center
        }
        const waveformAvg = Math.min(1, waveformSum / timeData.length * 2);
        newWaveformHistory.push(waveformAvg);
        setWaveformHistory(newWaveformHistory);
        
        // Draw SoundCloud style waveform
        drawWaveform(ctx, width, height, newPeakData, progress);
        
        // Draw oscilloscope style waveform overlay
        drawOscilloscope(ctx, width, height, timeData);
      } catch (error) {
        console.error('Error in visualization loop:', error);
      }
      
      // Continue animation
      animationRef.current = requestAnimationFrame(draw);
    };
    
    // Start animation
    draw();
    
    // Clean up on unmount or when dependencies change
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isActive, frequencyBins, timeData, peakData, waveformHistory, dimensions, progress]);
  
  // Draw SoundCloud style waveform
  const drawWaveform = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    data: number[], 
    progress: number
  ) => {
    // Fill background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    
    const barWidth = width / data.length;
    const progressPosition = width * progress;
    
    // Draw each bar
    for (let i = 0; i < data.length; i++) {
      const x = i * barWidth;
      const barHeight = data[i] * height * 0.8; // 80% of height max
      const y = (height - barHeight) / 2;
      
      // Use played color for the portion that's been played
      if (x < progressPosition) {
        ctx.fillStyle = playedColor;
      } else {
        ctx.fillStyle = baseColor;
      }
      
      // Draw a rounded bar
      ctx.beginPath();
      const radius = Math.min(barWidth / 2, barHeight / 8); // Subtle rounding
      
      if (barHeight > 0) {
        // Draw a rounded rectangle for each bar
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + barWidth - radius, y);
        ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
        ctx.lineTo(x + barWidth, y + barHeight - radius);
        ctx.quadraticCurveTo(x + barWidth, y + barHeight, x + barWidth - radius, y + barHeight);
        ctx.lineTo(x + radius, y + barHeight);
        ctx.quadraticCurveTo(x, y + barHeight, x, y + barHeight - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.fill();
      }
    }
  };
  
  // Draw oscilloscope style waveform overlay
  const drawOscilloscope = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    timeData: Uint8Array
  ) => {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    const sliceWidth = width / timeData.length;
    let x = 0;
    
    for (let i = 0; i < timeData.length; i++) {
      const v = timeData[i] / 128.0;
      const y = v * height / 2;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      x += sliceWidth;
    }
    
    ctx.stroke();
  };
  
  return (
    <canvas 
      ref={canvasRef} 
      className="audio-frequency-visualizer"
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '8px',
        backgroundColor: bgColor
      }}
    />
  );
};

export default AudioFrequencyVisualizer; 