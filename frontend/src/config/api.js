// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

// Get API endpoint from runtime config or env var
const getApiEndpoint = () => {
  if (window.APP_CONFIG && 
      !window.APP_CONFIG.API_ENDPOINT?.includes('YOUR_') && 
      !window.APP_CONFIG.API_ENDPOINT?.includes('__')) {
    return window.APP_CONFIG.API_ENDPOINT;
  }
  const envEndpoint = import.meta.env.VITE_API_ENDPOINT;
  if (envEndpoint && !envEndpoint.includes('YOUR_')) {
    return envEndpoint;
  }
  console.warn("⚠️ API endpoint not configured");
  return null;
};

export const apiEndpoint = getApiEndpoint();