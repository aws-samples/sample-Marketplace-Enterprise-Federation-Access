// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";

function NavbarComponent({ signOut, user }) {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
  };

  return (
    <>
      <Navbar expand="lg" data-bs-theme="light" className="responsive-navbar">
        <Container fluid className="px-3 px-md-4">
          <Navbar.Brand
            href="#home"
            onClick={() => window.showHomePage?.()}
            className="navbar-brand-responsive"
          >
            <span className="d-none d-sm-inline">Product Catalogue</span>
            <span className="d-inline d-sm-none">Product Catalogue</span>
          </Navbar.Brand>

          <Navbar.Toggle
            aria-controls="basic-navbar-nav"
            className="border-0"
          />

          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link
                href="#shop"
                onClick={() => window.showShopPage?.()}
                className="nav-link-responsive"
              >
                Shop
              </Nav.Link>
              <Nav.Link
                href="#about"
                onClick={() => window.showAboutPage?.()}
                className="nav-link-responsive"
              >
                About Us
              </Nav.Link>
              <Nav.Link
                href="#contact"
                onClick={() => window.showContactPage?.()}
                className="nav-link-responsive"
              >
                Contact Us
              </Nav.Link>
            </Nav>

            <Nav className="signout-btn-responsive">
              <Nav.Link
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="signout-link"
              >
                <span className="d-none d-md-inline">
                  {isSigningOut
                    ? "Signing Out.."
                    : `Sign Out ${user?.username ? `(${user.username})` : ""}`}
                </span>
                <span className="d-inline d-md-none">
                  {isSigningOut ? "Signing Out.." : "Sign Out"}
                </span>
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {isSigningOut && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Signing out..</p>
          </div>
        </div>
      )}
    </>
  );
}

export default NavbarComponent;
