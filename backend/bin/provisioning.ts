// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import * as dotenv from "dotenv";
import { APIStack } from "../lib/api";
import { AuthStack } from "../lib/auth";
import { FrontendStack } from "../lib/frontend";

// Load environment variables from .env file
dotenv.config();

const app = new cdk.App();
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: "us-east-1", // Deploy everything in us-east-1 for CloudFront WAF compatibility
};

// Deploy stacks in order
const auth = new AuthStack(app, "AuthStack", { env });
const api = new APIStack(app, "APIStack", {
  userPool: auth.userPool,
  env,
});
const frontend = new FrontendStack(app, "FrontendStack", {
  env,
  userPool: auth.userPool,
  userPoolClient: auth.client,
  api: api.api,
});
