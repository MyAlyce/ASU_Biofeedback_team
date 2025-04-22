import React, { useState, useEffect } from 'react';
import { StandaloneShaderVisualizer } from '../components/visualizations/StandaloneShaderVisualizer';
import '../styles/shaderVisualizer.css';

export default function ShaderTestPage() {
  const [hegData, setHegData] = useState({
    heg: 0,
    hegAvg2s: 0,
    hegAvg4s: 0,
    hegEffort: 0,
    hegScore: 0
  });

  // Generate fake HEG data
  useEffect(() => {
    let frameId: number;
    let t = 0;

    const animate = () => {
      // Create oscillating values
      const heg = Math.sin(t * 0.1) * 0.5 + 0.5;
      const hegAvg2s = Math.sin(t * 0.05) * 0.3 + 0.6;
      const hegAvg4s = Math.sin(t * 0.03) * 0.2 + 0.7;
      const hegEffort = Math.sin(t * 0.08) * 0.7 + 0.7;
      const hegScore = Math.cos(t * 0.04) * 0.5 + 0.8;

      setHegData({
        heg,
        hegAvg2s,
        hegAvg4s, 
        hegEffort,
        hegScore
      });

      t += 0.1;
      frameId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '1200px', 
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ 
        color: '#333', 
        marginBottom: '20px',
        fontSize: '24px'
      }}>
        HEG Data Shader Visualization
      </h1>
      
      <div style={{ 
        height: '500px', 
        marginBottom: '20px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <StandaloneShaderVisualizer 
          hegData={hegData}
          width={1200}
          height={500}
        />
      </div>

      <div style={{
        background: '#f5f5f5',
        padding: '15px',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
        marginTop: '20px'
      }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>Usage Instructions</h3>
        <p>
          This page demonstrates a standalone shader visualization that responds to HEG biofeedback data.
          The visualizer is currently using simulated data that oscillates over time to demonstrate responsiveness.
          Use the geometry selector to change the visualization shape.
        </p>
        <p style={{ marginTop: '10px' }}>
          In a real application, replace the simulated data with actual HEG readings from your device.
        </p>
      </div>
    </div>
  );
} 