// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useState, useEffect, useCallback } from "react";
import { Amplify } from "aws-amplify";
import { fetchAuthSession, signOut as amplifySignOut } from "aws-amplify/auth";
import { withAuthenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import "../styles/App.css";
import "@cloudscape-design/global-styles/index.css";
import Navbar from "../components/top-navbar";
import CardBody from "../components/card-group";
import Footer from "../components/footer";
import Contact from "../components/contact";
import About from "../components/about";
import Shop from "../components/shop";
import HelpCenter from "../components/help-center";
import ConfigurationRequired from "../components/ConfigurationRequired";
import frontpageImage from "../assets/frontpage-image.jpg";
import { apiEndpoint } from "../config/api";
import "../styles/App.css";

// Get config from runtime (injected by CDK deployment)
const getConfig = () => {
  if (window.APP_CONFIG && !window.APP_CONFIG.COGNITO_USER_POOL_ID?.includes('YOUR_')) {
    return window.APP_CONFIG;
  }
  // Fallback to env vars for local development
  return {
    COGNITO_REGION: import.meta.env.VITE_COGNITO_REGION || "us-east-1",
    COGNITO_USER_POOL_ID: import.meta.env.VITE_COGNITO_USER_POOL_ID,
    COGNITO_USER_POOL_WEB_CLIENT_ID: import.meta.env.VITE_COGNITO_USER_POOL_WEB_CLIENT_ID,
    API_ENDPOINT: import.meta.env.VITE_API_ENDPOINT
  };
};

const config = getConfig();

// Check if we have valid configuration
const hasValidConfig = 
  config.COGNITO_USER_POOL_ID && 
  config.COGNITO_USER_POOL_WEB_CLIENT_ID &&
  !config.COGNITO_USER_POOL_ID.includes('YOUR_') &&
  !config.COGNITO_USER_POOL_ID.includes('mock');

// Configure Amplify v6 only if we have valid config
if (hasValidConfig) {
  const amplifyConfig = {
    Auth: {
      Cognito: {
        userPoolId: config.COGNITO_USER_POOL_ID,
        userPoolClientId: config.COGNITO_USER_POOL_WEB_CLIENT_ID,
        region: config.COGNITO_REGION || "us-east-1",
      }
    },
  };
  
  try {
    Amplify.configure(amplifyConfig);
    console.log("Amplify configured successfully");
  } catch (error) {
    console.error("Error configuring Amplify:", error);
  }
} else {
  console.warn("⚠️ Amplify configuration skipped - missing or invalid environment variables");
  console.warn("Please configure frontend/public/config.js or frontend/.env.local");
  console.warn("See CONFIGURATION.md for setup instructions");
}

function AppContent({ signOut, user }) {
  const [currentPage, setCurrentPage] = useState("home");
  const [token, setToken] = useState(null);

  useEffect(() => {
    const getToken = async () => {
      try {
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken?.toString();
        setToken(idToken);
      } catch (error) {
        console.error("Token error:", error);
      }
    };

    getToken();
  }, []);

  // Enhanced logout function with safety checks
  const handleSignOut = useCallback(async () => {
    try {
      if (token) {
        // First revoke the sessions
        try {
          await fetch(`${apiEndpoint}marketplace-url/revoke`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
        } catch (error) {
          console.error("Error revoking sessions:", error);
        }

        // Then invalidate federation URL
        try {
          await fetch(`${apiEndpoint}marketplace-url`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
        } catch (error) {
          console.error("Error invalidating federation URL:", error);
        }
      }

      // Clear any stored state
      localStorage.removeItem("marketplaceRedirectState");
      sessionStorage.removeItem("hasAuthenticated");

      // Finally sign out from Cognito - check if signOut is a function
      if (typeof signOut === "function") {
        await signOut();
      } else {
        // Fallback to amplifySignOut if signOut prop is not available
        await amplifySignOut();
        window.location.reload();
      }
    } catch (error) {
      console.error("Logout error:", error);
      // Force sign out even if API calls fail
      try {
        if (typeof signOut === "function") {
          await signOut();
        } else {
          await amplifySignOut();
          window.location.reload();
        }
      } catch (fallbackError) {
        console.error("Fallback logout error:", fallbackError);
        window.location.reload();
      }
    }
  }, [token, signOut]);

  const showPage = (page) => {
    setCurrentPage(page);
  };

  const handleNavClick = (callback) => {
    callback?.();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Expose navigation functions globally
  window.showContactPage = () => showPage("contact");
  window.showShopPage = () => showPage("shop");
  window.showAboutPage = () => showPage("about");
  window.showHelpCenterPage = () => showPage("help");
  window.showHomePage = () => showPage("home");

  const renderPage = () => {
    switch (currentPage) {
      case "contact":
        return <Contact />;
      case "about":
        return <About />;
      case "shop":
        return <Shop token={token} />;
      case "help":
        return <HelpCenter />;
      default:
        return (
          <>
            <section className="hero-section">
              <div className="hero-content">
                <div className="hero-text">
                  <p className="hero-text-p1">Software solutions,</p>
                  <p className="hero-text-p2">Digital transformation</p>

                  {/* Mobile/Tablet Image - Visible on small screens */}
                  <div className="frontpage-image-mobile d-block d-lg-none">
                    <img
                      src={frontpageImage}
                      alt="Working people"
                      className="img-fluid"
                    />
                  </div>

                  {/* Mobile Browse Solutions Button - Right after image */}
                  <div className="cta-button-container d-block d-lg-none">
                    <button
                      className="cta-button"
                      onClick={() => handleNavClick(window.showShopPage)}
                    >
                      Browse Solutions
                    </button>
                  </div>

                  {/* Desktop Image - Hidden on small screens */}
                  <div className="frontpage-image d-none d-lg-block">
                    <img
                      src={frontpageImage}
                      alt="Working people"
                      className="img-fluid"
                    />
                  </div>

                  <p className="hero-description">
                    Discover, deploy and manage software solutions that
                    accelerate your digital transformation. Our curated
                    marketplace features enterprise-grade applications,
                    development tools, and cloud-native services designed for
                    scale, security, and seamless AWS integration.
                  </p>

                  <div className="cta-button-container d-none d-lg-block">
                    <button
                      className="cta-button"
                      onClick={() => handleNavClick(window.showShopPage)}
                    >
                      Browse Solutions
                    </button>
                  </div>
                </div>
                <div className="hero-visual d-none d-lg-block">
                  {/* <div className="hero-line-top" />
                  <div className="hero-line-left" />
                  <div className="hero-line-right" />
                  <div className="hero-line-bottom" /> */}
                </div>
              </div>
            </section>
            <section className="products-section">
              <CardBody token={token} />
            </section>
          </>
        );
    }
  };

  return (
    <div className="app-container">
      <Navbar signOut={handleSignOut} user={user} />
      <main className="main-content">{renderPage()}</main>
      <Footer />
    </div>
  );
}

function App() {
  // Show configuration required screen if config is missing
  if (!hasValidConfig) {
    return <ConfigurationRequired />;
  }
  
  return <AppContent />;
}

// Only apply withAuthenticator if we have valid config
const AuthenticatedApp = hasValidConfig 
  ? withAuthenticator(App, {
      signUpAttributes: ["email"],
    })
  : App;

export default AuthenticatedApp;
