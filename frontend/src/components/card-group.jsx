// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useState, useCallback, useEffect } from "react";
import gitlabLogo from "../assets/gitlab-logo.svg";
import oktaLogo from "../assets/okta-logo.svg";
import newRelicLogo from "../assets/new-relic-logo.png";
import { apiEndpoint } from "../config/api";

const products = [
  {
    id: 1,
    name: "GitLab Premium Self Managed",
    description:
      "GitLab is the most comprehensive AI-powered DevSecOps platform. GitLab provides customers with enterprise agile planning, source code management, CI/CD, and monitoring - all in one place.",
    vendor: "GitLab",
    image: gitlabLogo,
  },
  {
    id: 2,
    name: "Okta Platform",
    description:
      "Okta Workforce Identity delivers a unified identity security platform that protects customer environments before, during, and after authentication and with continuous assessment of user and session risk",
    vendor: "Okta, Inc",
    image: oktaLogo,
  },
  {
    id: 3,
    name: "New Relic: The Observability Platform",
    description:
      "New Relic is the industry's most comprehensive cloud-based observability platform providing engineers with full visibility into the performance of their AWS cloud services alongside their entire stack.",
    vendor: "New Relic",
    image: newRelicLogo,
  },
];

function CardBody({ token }) {
  const [loadingProducts, setLoadingProducts] = useState(new Set());

  // Clear loading state when returning from marketplace
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && sessionStorage.getItem('marketplaceRedirect')) {
        setLoadingProducts(new Set());
        sessionStorage.removeItem('marketplaceRedirect');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also clear on component mount if redirect flag exists
    if (sessionStorage.getItem('marketplaceRedirect')) {
      setLoadingProducts(new Set());
      sessionStorage.removeItem('marketplaceRedirect');
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleMarketplaceRedirect = useCallback(async (product) => {
    if (!token) return;
    
    // Add this product to loading set
    setLoadingProducts(prev => new Set([...prev, product.id]));
    
    try {
        // Map product names to product types
        const productTypeMap = {
          'GitLab Premium Self Managed': 'gitlab',
          'Okta Platform': 'okta',
          'New Relic: The Observability Platform': 'newrelic'
        };
        
        const productType = productTypeMap[product.name] || 'gitlab';
        
        const response = await fetch(`${apiEndpoint}marketplace-url?product=${productType}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.federationUrl) {
          // Store the redirect state to handle return
          sessionStorage.setItem('marketplaceRedirect', 'true');
          window.location.href = data.federationUrl;
        }
    } catch (error) {
      console.error('Marketplace redirect error:', error);
      // Remove this product from loading set on error
      setLoadingProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(product.id);
        return newSet;
      });
    }
  }, [token]);

  const handleNavClick = (callback) => {
    callback?.();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <div className={`products-container ${loadingProducts.size > 0 ? 'blurred' : ''}`}>
        <div className="section-header">
          <div className="card-group-text">
            <h2>Featured Solutions</h2>
            <p>
              Discover enterprise-grade software solutions trusted by thousands of
              organizations worldwide
            </p>
          </div>
        </div>
        <div className="products-grid">
          {products.map((product) => (
            <div key={product.id} className="product-card">
              <div className="product-header">
                <img
                  src={product.image}
                  alt={product.vendor}
                  className={
                    product.vendor === "New Relic"
                      ? "product-logo-large"
                      : "product-logo"
                  }
                />
                <div>
                  <h3 className="product-title">{product.name}</h3>
                  <p className="product-vendor">by {product.vendor}</p>
                </div>
              </div>
              <p className="product-description">{product.description}</p>
              <div className="product-actions">
                <button 
                  className="btn-primary" 
                  onClick={() => handleMarketplaceRedirect(product)}
                  disabled={loadingProducts.has(product.id)}
                >
                  {loadingProducts.has(product.id) ? 'Redirecting...' : 'Shop Now'}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => handleNavClick(window.showShopPage)}
                >
                  Discover More..
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {loadingProducts.size > 0 && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Redirecting to AWS Marketplace..</p>
          </div>
        </div>
      )}
    </>
  );
}

export default CardBody;
