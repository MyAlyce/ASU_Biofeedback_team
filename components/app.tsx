import React, {Component} from 'react'
import Espruino from './espruino'
import { SpotifyControl } from './players/spotify'
import { SoundCloudPlayer } from './players/soundcloud'
import { YouTubePlayer } from './players/youtube'
import {Chart} from './chart/Chart'
import { ShaderPlayer } from './threejs/threeshader'
import { HEGscore } from './hegscore'
import GamePage  from '../scripts/games/gamePage'
import HomePage from './homePage'
import SoundPage from './soundPage'
import SettingsPage from './settingsPage'
import TestingPage from './testingPage'
import '../styles/global.css';


export class App extends Component<{},{}> {
    
    state = {
        currentView: 'home',
    };

    switchRoute = (view) => {
        this.setState({ currentView: view});
    };

    // Handle back to main app from immersive view
    handleReturnFromImmersive = () => {
        this.setState({ currentView: 'home' });
    };

    render() {
         
        const{currentView} = this.state;
        
        // Check if we're in the testing view for immersive mode
        const isImmersiveView = currentView === 'testing';

            {/* <Espruino showLogger={false}/> */}
            {/* <SpotifyControl/> */}
            {/* <SoundCloudPlayer/>
            <YouTubePlayer/> */}

            const renderContent = () => {
                switch (currentView) {
                  case 'home':
                    return <HomePage/>;
                  case 'games':
                    return <GamePage />;
                  case 'playSound':
                    return <SoundPage />;
                  case 'settings':
                    return <SettingsPage />;
                  case 'testing':
                    return <TestingPage onReturn={this.handleReturnFromImmersive} />;
                  case 'score':
                    //return <ScorePage />;
                    break;
                  default:
                    return <HomePage />;
                }
              };

              
            // If we're in immersive mode, only render the TestingPage without navigation
            if (isImmersiveView) {
                return (
                    <div className="immersive-container">
                        <TestingPage onReturn={this.handleReturnFromImmersive} />
                    </div>
                );
            }
              
            // Regular app rendering with menu bar
            return (
                <div>
            <div className="menu-bar">
            <button onClick={() => this.switchRoute('home')}>Home</button>
            <button onClick={() => this.switchRoute('games')}>Games</button>
            <button onClick={() => this.switchRoute('playSound')}>Play Sound</button>
            <button onClick={() => this.switchRoute('settings')}>Settings</button>
            <button onClick={() => this.switchRoute('testing')}>Testing</button>
            <button onClick={() => this.switchRoute('score')}>Score</button>
                      </div>

                  {
                    <>
   
                      {/* Dynamic Content Container */}
             <div className="content-container">{renderContent()}</div>


                      <HEGscore />
                      <Chart presets={['heg_playback']} />
                      <Chart presets={['hr']} />
                      <Chart presets={['ppg']} />
                    </>
                  }
                </div>
              );
            }
          }