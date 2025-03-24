import React from "react";
import { Outlet, NavLink } from "react-router-dom";
import { Navbar, Nav, Container } from "react-bootstrap";
import { Chart } from "./chart/Chart";
import { HEGscore } from "./HEGscore";
import Espruino from "./espruino";

const Layout = () => {
  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
        <Container>
          <Navbar.Brand as={NavLink} to="/">
            🧠 Biofeedback App
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto">
              <Nav.Link as={NavLink} to="/" end>
                Home
              </Nav.Link>
              <Nav.Link as={NavLink} to="/games">
                Games
              </Nav.Link>
              <Nav.Link as={NavLink} to="/playSound">
                Play Sound
              </Nav.Link>
              <Nav.Link as={NavLink} to="/settings">
                Settings
              </Nav.Link>
              <Nav.Link as={NavLink} to="/score">
                Score
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container className="pb-4">
        <Outlet />
        <HEGscore />
        <Chart presets={["heg_playback"]} />
        <Chart presets={["hr"]} />
        <Chart presets={["ppg"]} />
      </Container>
      <Container>
        <Espruino /> {/* ← This renders the BLE/USB selector */}
      </Container>
    </>
  );
};

export default Layout;
