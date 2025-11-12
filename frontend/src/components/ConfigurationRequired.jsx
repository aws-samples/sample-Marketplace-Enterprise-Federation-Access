// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React from "react";

const ConfigurationRequired = () => {
  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      backgroundColor: "#f5f5f5",
      padding: "20px"
    }}>
      <div style={{
        maxWidth: "600px",
        backgroundColor: "white",
        padding: "40px",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
      }}>
        <h1 style={{ color: "#d32f2f", marginBottom: "20px" }}>
          ⚙️ Configuration Required
        </h1>
        <p style={{ marginBottom: "20px", lineHeight: "1.6" }}>
          This application needs to be configured before it can run.
        </p>
        
        <div style={{
          backgroundColor: "#fff3cd",
          border: "1px solid #ffc107",
          borderRadius: "4px",
          padding: "15px",
          marginBottom: "20px"
        }}>
          <strong>Quick Setup:</strong>
          <ol style={{ marginTop: "10px", marginBottom: "0", paddingLeft: "20px" }}>
            <li>Deploy the backend: <code>cd backend && npm run deploy</code></li>
            <li>Run the configuration script: <code>./configure.sh</code></li>
            <li>Rebuild the frontend: <code>cd frontend && npm run build</code></li>
          </ol>
        </div>

        <details style={{ marginBottom: "20px" }}>
          <summary style={{ cursor: "pointer", fontWeight: "bold", marginBottom: "10px" }}>
            Manual Configuration
          </summary>
          <p style={{ marginTop: "10px", lineHeight: "1.6" }}>
            Edit <code>frontend/public/config.js</code> and replace the placeholder values with your AWS resource IDs:
          </p>
          <ul style={{ paddingLeft: "20px", lineHeight: "1.8" }}>
            <li><code>COGNITO_REGION</code></li>
            <li><code>COGNITO_USER_POOL_ID</code></li>
            <li><code>COGNITO_USER_POOL_WEB_CLIENT_ID</code></li>
            <li><code>API_ENDPOINT</code></li>
          </ul>
        </details>

        <p style={{ fontSize: "14px", color: "#666", marginTop: "20px" }}>
          For detailed instructions, see <code>CONFIGURATION.md</code> in the project root.
        </p>
      </div>
    </div>
  );
};

export default ConfigurationRequired;
