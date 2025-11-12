// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useState, useEffect } from "react";
import gitlabLogo from "../assets/gitlab-logo.svg";
import oktaLogo from "../assets/okta-logo.svg";
import newRelicLogo from "../assets/new-relic-logo.png";
import crowdstrikeLogo from "../assets/crowdstrike-logo.png";
import trendLogo from "../assets/trend-logo.svg";
import wizLogo from "../assets/wiz-logo.png";
import sisenseLogo from "../assets/sisense-logo.png";
import teradataLogo from "../assets/teradata-logo.png";
import redHatLogo from "../assets/redhat-logo.svg";
import ibmLogo from "../assets/ibm-logo.png";
import jenkinsLogo from "../assets/jenkins-logo.svg";
import grafanaLogo from "../assets/grafana-logo.svg";
import { apiEndpoint } from "../config/api";

const productCategories = {
  saas: [
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
      name: "New Relic: the Observability Platform",
      description:
        "New Relic is the industry's most comprehensive cloud-based observability platform providing engineers with full visibility into the performance of their AWS cloud services alongside their entire stack.",
      vendor: "New Relic",
      image: newRelicLogo,
    },
  ],
  security: [
    {
      id: 4,
      name: "CrowdStrike Falcon Endpoint Protection",
      description:
        "Stop breaches with unified endpoint protection delivered from the cloud. CrowdStrike aims to revolutionize endpoint protection by unifying next-generation antivirus (AV), endpoint detection and response (EDR), and a 24/7 managed hunting service.",
      vendor: "CrowdStrike",
      image: crowdstrikeLogo,
    },
    {
      id: 5,
      name: "Trend Enterprise Security Solutions",
      description:
        "Trend Micro, a global cybersecurity leader, helps make the world safe for exchanging digital information. Fueled by decades of security expertise, global threat research, and continuous innovation, our cybersecurity platform protects 500,000+ organizations",
      vendor: "Trend Micro",
      image: trendLogo,
    },
    {
      id: 6,
      name: "WIZ Infrastructure Security Platform",
      description:
        "Wiz performs a deep assessment of your entire cloud and then correlates a vast number of security signals to trace the real infiltration vectors that attackers can use to break in. Wiz also gives you the tools to bring your DevOps and development teams into the process to fix these risks.",
      vendor: "Wiz",
      image: wizLogo,
    },
  ],
  analytics: [
    {
      id: 7,
      name: "Sisense Fusion Analytics Platform",
      description:
        "Sisense is an API-first analytics platform that modernizes businesses by seamlessly integrating in-context analytics within applications, leading to action-oriented insights that enhance decision intelligence. Email us at awssales@sisense.com ",
      vendor: "Sisense",
      image: sisenseLogo,
    },
    {
      id: 8,
      name: "Teradata Vantage Enterprise (DIY)",
      description:
        "VantageCloud is the connected multi-cloud data platform for enterprise analytics. Includes Native Object Store (NOS) Read/Write, VantageCloud Analytics Library, 4D analytics, nPath, sessionization, attribution, scoring, and more.",
      vendor: "Teradata",
      image: teradataLogo,
    },
    {
      id: 9,
      name: "IBM Planning Analytics as a Service",
      description:
        "Transform your business decision-making with unparalleled precision and foresight. With IBM Planning Analytics, you can plan, predict, partner, and prosper. Because better planning starts when everyone and everything is in sync.",
      vendor: "IBM Software",
      image: ibmLogo,
    },
  ],
  devops: [
    {
      id: 10,
      name: "Jenkins on Windows Server 2019",
      description:
        "Jenkins® on Windows Server 2019 Jenkins is the leading open source Continuous Integration and Continuous Delivery (CI/CD) server that enables the automation of building, testing, and shipping software projects.",
      vendor: "Cloud Infrastructure Services",
      image: jenkinsLogo,
    },
    {
      id: 11,
      name: "Red Hat OpenShift Kubernetes Engine (Arm)",
      description:
        "An enterprise-class Kubernetes production platform for running Linux containers outside of the EMEA regions. Red Hat® OpenShift® Kubernetes Engine provides you with the core functionality of Red Hat OpenShift.",
      vendor: "Red Hat",
      image: redHatLogo,
    },
    {
      id: 12,
      name: "Grafana Cloud Kubernetes Monitoring",
      description:
        "Grafana Kubernetes Monitoring is an out-of-the-box solution that promptly detects infrastructure issues, optimizes costs & efficiency, predicts resource usage, automates incident management, and adapts to your specific services.",
      vendor: "Grafana Labs",
      image: grafanaLogo,
    },
  ],
};

function CardGroup({ title, description, products, token }) {
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
  
  const getLogoClassName = (vendor) => {
    const largeLogoVendors = [
      "New Relic",
      "Teradata",
      "CrowdStrike",
      "Sisense",
      "Wiz",
    ];
    if (largeLogoVendors.includes(vendor)) {
      return "product-logo-large";
    }
    if (vendor === "GitLab") {
      return "product-logo-gitlab";
    }
    if (vendor === "Wiz") {
      return "product-logo-wiz";
    }
    return "product-logo";
  };

  const handleMarketplaceRedirect = async (product) => {
    if (!token) return;
    
    // Add this product to loading set
    setLoadingProducts(prev => new Set([...prev, product.id]));
    
    try {
      // Map product names to product types
      const productTypeMap = {
        'GitLab Premium Self Managed': 'gitlab',
        'Okta Platform': 'okta',
        'New Relic: the Observability Platform': 'newrelic',
        'CrowdStrike Falcon Endpoint Protection': 'crowdstrike',
        'Trend Enterprise Security Solutions': 'trend',
        'WIZ Infrastructure Security Platform': 'wiz',
        'Sisense Fusion Analytics Platform': 'sisense',
        'Teradata Vantage Enterprise (DIY)': 'teradata',
        'IBM Planning Analytics as a Service': 'ibm',
        'Jenkins on Windows Server 2019': 'jenkins',
        'Red Hat OpenShift Kubernetes Engine (Arm)': 'redhat',
        'Grafana Cloud Kubernetes Monitoring': 'grafana'
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
  };

  return (
    <div className="products-container">
      <div className="section-header">
        <div className="card-group-text">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      <div className="products-grid">
        {products.map((product) => (
          <div key={product.id} className="product-card">
            <div className="product-header">
              <img
                src={product.image}
                alt={product.vendor}
                className={getLogoClassName(product.vendor)}
              />
              <div>
                <h3 className="product-title">{product.name}</h3>
                <p className="product-vendor">by {product.vendor}</p>
              </div>
            </div>
            <p className="product-description">{product.description}</p>
            <div className="product-actions">
              <button
                className="btn-primary-shop"
                onClick={() => handleMarketplaceRedirect(product)}
                disabled={loadingProducts.has(product.id)}
              >
                {loadingProducts.has(product.id) ? 'Redirecting...' : 'Shop Now'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShopPage({ token }) {
  return (
    <div className="shop-page">
      <CardGroup
        title="SaaS Solutions"
        description="Discover enterprise-grade software solutions trusted by thousands of organizations worldwide"
        products={productCategories.saas}
        token={token}
      />
      <CardGroup
        title="Security & Compliance"
        description="Protect your infrastructure with industry-leading security solutions"
        products={productCategories.security}
        token={token}
      />
      <CardGroup
        title="Analytics & Business Intelligence"
        description="Transform your data into actionable insights with powerful analytics tools"
        products={productCategories.analytics}
        token={token}
      />
      <CardGroup
        title="DevOps & CI/CD"
        description="Streamline your development workflow with modern DevOps tools"
        products={productCategories.devops}
        token={token}
      />
    </div>
  );
}

export default ShopPage;
