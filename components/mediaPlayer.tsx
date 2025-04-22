import React, { useEffect, useRef, useState } from 'react';
import { subscribeHEGPlayback, unsubscribeHEGPlayback } from '../scripts/connect';
import '../styles/videocontrols.css';
import { SoundCloudPlayer } from './players/soundcloud';

const MediaPlayer = ({ id }: { id: string }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [volume, setVolume] = useState(100);
  const [collapsed, setCollapsed] = useState(false); // State for collapse
  let stateSub: number;

  // Handle HEG volume control
  useEffect(() => {
    stateSub = subscribeHEGPlayback((data) => {
      console.log('HEG Data:', data);
    
      const time = performance.now() / 1000;
      
      let newVolume = 100 * Math.sin(time + data.hegEffort[0]*1.5); // Range 0-100    
      newVolume = Math.max(0, Math.min(100, newVolume));
  
      setVolume(newVolume);
  
      if (videoRef.current) {
        videoRef.current.volume = newVolume / 100;
      }
    });

    return () => {
      unsubscribeHEGPlayback(stateSub);
    };
  }, [volume]);

  // Toggle collapsed state
  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  return (
    <div className={`media-player ${collapsed ? 'collapsed' : ''}`}>
      {/* Collapse Button */}
      <button className="collapse-btn" onClick={toggleCollapse}>
        {collapsed ? '⏵Expand' : '⏷Minimize'}
      </button>

      {/* Content inside the collapsible container */}
      <div className={`content ${collapsed ? 'hidden' : ''}`}>
        {/* SoundCloud Player */}
        <h2>Connect to SoundCloud</h2>
        <SoundCloudPlayer autoPlay={true} color="blue" />

        {/* Spotify */}
        <h2>Spotify</h2>
        <iframe
          src="https://open.spotify.com/embed/playlist/0EncHaaOPWyUSvpvwFRaS2?utm_source=generator"
          width="100%"
          height="152"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          style={{ borderRadius: '12px' }}
        ></iframe>
        
      </div>
    </div>
  );
};

export default MediaPlayer;
