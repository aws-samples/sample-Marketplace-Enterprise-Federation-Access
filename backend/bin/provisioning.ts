#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import * as dotenv from "dotenv";
import { APIStack } from "../lib/api";
import { AuthStack } from "../lib/auth";
import { FrontendStack } from "../lib/frontend";

// Load environment variables from .env file
dotenv.config();

const app = new cdk.App();

// Primary region for application resources (Cognito, API Gateway, Lambda, DynamoDB)
// Can be any AWS region based on your requirements
const primaryRegion = process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION || "us-east-1";

// WAF configuration (can be disabled via environment variable)
// Set ENABLE_WAF=false to disable WAF for development/testing
const enableWaf = process.env.ENABLE_WAF !== "false";

// Environment for primary application stacks
const primaryEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: primaryRegion,
};

// Environment for CloudFront WAF (MUST be us-east-1 due to AWS CloudFront WAF requirements)
// This is an AWS service limitation - CloudFront WAF Web ACLs must be in us-east-1
const cloudfrontWafEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: "us-east-1",
};

// Deploy application stacks in primary region
const auth = new AuthStack(app, "AuthStack", { env: primaryEnv });
const api = new APIStack(app, "APIStack", {
  userPool: auth.userPool,
  env: primaryEnv,
  enableWaf: enableWaf,
});

// Deploy frontend stack
// If primary region is us-east-1, deploy everything in one stack
// Otherwise, deploy with cross-region CloudFront WAF reference
new FrontendStack(app, "FrontendStack", {
  env: primaryRegion === "us-east-1" ? primaryEnv : cloudfrontWafEnv,
  userPool: auth.userPool,
  userPoolClient: auth.client,
  api: api.api,
  primaryRegion: primaryRegion,
  enableWaf: enableWaf,
});
