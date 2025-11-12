// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

# Changelog

All notable changes to the Marketplace Enterprise Federation Access project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2024-11-12

### Added
- Initial release of Marketplace Enterprise Federation Access application
- React-based frontend with AWS Cloudscape design system
- AWS CDK backend infrastructure with TypeScript
- Support for 12 AWS Marketplace products across 4 categories:
  - SaaS Solutions (GitLab, Okta, New Relic)
  - Security & Compliance (CrowdStrike, Trend, WIZ)
  - Analytics & BI (Sisense, Teradata, IBM Planning Analytics)
  - DevOps & CI/CD (Jenkins, Red Hat OpenShift, Grafana Cloud)
- AWS Cognito authentication with MFA support
- AWS STS federation for temporary marketplace access
- DynamoDB session management with automatic TTL cleanup
- API Gateway with Lambda backend for federation URL generation
- Individual product loading states and session persistence
- Comprehensive deployment and cleanup documentation
- Security features including JWT tokens and role-based access
- CloudWatch monitoring and alarms
- Automated CDK deployment scripts

### Security
- Multi-factor authentication (MFA) enforcement
- Temporary credentials with 1-hour expiration
- Session tracking and automatic cleanup
- IAM role separation for different access levels
- CORS configuration for secure API access

### Infrastructure
- AWS CDK for Infrastructure as Code
- Serverless architecture with Lambda functions
- API Gateway for REST API endpoints
- DynamoDB for session storage
- CloudWatch for monitoring and logging
- S3 and CloudFront ready for frontend deployment

### Documentation
- Complete README with deployment guide
- Architecture diagrams and flow documentation
- Troubleshooting guide and common issues
- API endpoint documentation
- Security implementation details
- Clean up procedures for cost management