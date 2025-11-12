// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import Container from "react-bootstrap/Container";

function Footer() {
  const handleNavClick = (callback) => {
    callback?.();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="footer">
      <div className="footer-contents">
        <Container>
          <div className="row">
            <div className="col-md-6">
              <h5>Product Catalogue</h5>
              <p>
                Discover enterprise-grade software solutions for your business.
              </p>
            </div>
            <div className="col-md-3">
              <h6>Quick Links</h6>
              <ul className="list-unstyled">
                <li>
                  <a
                    className="footer-navlink"
                    href="#home"
                    onClick={() => handleNavClick(window.showHomePage)}
                  >
                    Home
                  </a>
                </li>
                <li>
                  <a
                    className="footer-navlink"
                    href="#shop"
                    onClick={() => handleNavClick(window.showShopPage)}
                  >
                    Shop
                  </a>
                </li>
                <li>
                  <a
                    className="footer-navlink"
                    href="#about"
                    onClick={() => handleNavClick(window.showAboutPage)}
                  >
                    About Us
                  </a>
                </li>
              </ul>
            </div>
            <div className="col-md-3">
              <h6>Support</h6>
              <ul className="list-unstyled">
                <li>
                  <a
                    className="footer-navlink"
                    href="#help"
                    onClick={() => handleNavClick(window.showHelpCenterPage)}
                  >
                    Help Center
                  </a>
                </li>
                <li>
                  <a
                    className="footer-navlink"
                    href="#contact"
                    onClick={() => handleNavClick(window.showContactPage)}
                  >
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <hr className="my-3" />
          <div className="text-center">
            <small>&copy; 2024 Product Catalogue. All rights reserved.</small>
          </div>
        </Container>
      </div>
    </footer>
  );
}

export default Footer;
