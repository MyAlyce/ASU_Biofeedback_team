import React, { useState, useEffect } from 'react';
import { StandaloneShaderVisualizer } from './visualizations/StandaloneShaderVisualizer';
import '../styles/shaderVisualizer.css';

const ShaderTestPage: React.FC = () => {
  // Mock HEG data state
  const [hegData, setHegData] = useState({
    heg: 0.5,
    hegAvg2s: 0.5,
    hegAvg4s: 0.5,
    hegEffort: 0.5,
    hegScore: 0.5
  });
  
  // Simulate changing HEG data over time
  useEffect(() => {
    let animationId: number;
    let startTime = Date.now();
    
    const animate = () => {
      const currentTime = Date.now();
      const elapsedTime = (currentTime - startTime) / 1000;
      
      // Create oscillating values between 0.2 and 0.8
      const oscillation = (Math.sin(elapsedTime * 0.5) + 1) * 0.3 + 0.2;
      const slowOscillation = (Math.sin(elapsedTime * 0.2) + 1) * 0.3 + 0.2;
      const fastOscillation = (Math.sin(elapsedTime * 0.8) + 1) * 0.3 + 0.2;
      
      setHegData({
        heg: oscillation,
        hegAvg2s: slowOscillation,
        hegAvg4s: (slowOscillation + oscillation) / 2,
        hegEffort: fastOscillation,
        hegScore: (fastOscillation + oscillation) / 2
      });
      
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);
  
  return (
    <div className="shader-test-page">
      <header className="shader-header">
        <h1>Shader Visualizer Test</h1>
      </header>
      
      <div className="visualizer-container">
        <StandaloneShaderVisualizer 
          hegData={hegData}
          width={600}
          height={400}
          defaultGeometry="sphere"
        />
      </div>
      
      <div className="info-panel">
        <h2>Using the Shader Visualizer</h2>
        <p>This is a standalone test of the shader visualizer using simulated HEG data.</p>
        <p>The visualizer can be integrated with real HEG data for actual biofeedback visualization.</p>
        <p>Use the dropdown to change the geometry and observe how the visualization responds to the simulated HEG data.</p>
      </div>
    </div>
  );
};

export default ShaderTestPage; 