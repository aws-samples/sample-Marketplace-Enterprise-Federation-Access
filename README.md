<!--
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
-->

# Marketplace Enterprise Federation Access

A secure AWS marketplace federation application that provides authenticated access to multiple AWS Marketplace products through federated sign-in. This application enables users to securely access AWS Marketplace products with temporary federated credentials, eliminating the need for direct AWS account access.

## Website
<table><tr><td><img src="frontend/Frontend_Website_1.png" width="1000" style="border: 1px solid black"/></td></tr></table>

<table><tr><td><img src="frontend/Frontend_Website_2.png" width="1000" alt="Application Interface"/></td></tr></table>

## Architecture Diagram


<table><tr><td><img src="Architecture_Diagram.png" width="1000" alt="Architecture Diagram"/></td></tr></table>

## Features

- **Multi-Product Support**: Access to 12 different AWS Marketplace products across 4 categories
- **Secure Authentication**: AWS Cognito with MFA (Multi-Factor Authentication)
- **Federation**: AWS STS role assumption with temporary credentials
- **Session Management**: Automatic session cleanup and revocation
- **Modern UI**: React-based frontend with AWS Cloudscape design system
- **Individual Loading States**: Per-product loading indicators
- **Session Persistence**: Handles marketplace redirects and returns gracefully

## Supported Products

### SaaS Solutions
- **GitLab Premium Self Managed** - AI-powered DevSecOps platform
- **Okta Platform** - Workforce Identity security platform  
- **New Relic: The Observability Platform** - Cloud-based observability platform

### Security & Compliance
- **CrowdStrike Falcon Endpoint Protection** - Cloud-delivered endpoint protection
- **Trend Enterprise Security Solutions** - Comprehensive cybersecurity platform
- **WIZ Infrastructure Security Platform** - Cloud security assessment platform

### Analytics & Business Intelligence
- **Sisense Fusion Analytics Platform** - API-first analytics platform
- **Teradata Vantage Enterprise (DIY)** - Connected multi-cloud data platform
- **IBM Planning Analytics as a Service** - Business decision-making platform

### DevOps & CI/CD
- **Jenkins on Windows Server 2019** - Open source CI/CD server
- **Red Hat OpenShift Kubernetes Engine (Arm)** - Enterprise Kubernetes platform
- **Grafana Cloud Kubernetes Monitoring** - Kubernetes monitoring solution

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React App     │    │   API Gateway    │    │  Lambda Function│
│   (Frontend)    │───▶│   + Cognito      │───▶│   (Federation)  │
│                 │    │   Authorizer     │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  AWS Marketplace│◀───│      AWS STS     │◀───│   DynamoDB      │
│   Products      │    │   (Federation)   │    │   (Sessions)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Prerequisites

- **Node.js** 20.x, 22.x, 24.x or higher
- **AWS CLI** configured with appropriate permissions
- **Docker** (for CDK bundling)
- **npm** or **yarn** package manager

## 🌍 Multi-Region Support

This application supports deployment in **any AWS region**. By default, it deploys to us-east-1, but you can deploy to any region:

```bash
# Deploy to Europe
export CDK_DEPLOY_REGION=eu-west-1
npx cdk deploy --all

# Deploy to Asia Pacific
export CDK_DEPLOY_REGION=ap-southeast-2
npx cdk deploy --all
```

**Important:** CloudFront WAF Web ACLs must be in us-east-1 (AWS requirement), but all other resources (Cognito, API Gateway, Lambda, DynamoDB) can be in any region. The deployment automatically handles this.

📖 **See [REGION-DEPLOYMENT.md](REGION-DEPLOYMENT.md) for detailed multi-region deployment guide.**

## 🛡️ WAF Configuration

AWS WAF (Web Application Firewall) is **enabled by default** for both API Gateway and CloudFront. To disable WAF (e.g., for development):

```bash
# Disable WAF for all stacks
export ENABLE_WAF=false
npx cdk deploy --all
```

**Note:** Disabling WAF reduces security but can lower costs for development/testing environments.

## Deployment Guide

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd marketplace-enterprise-federation-access
```

### Step 2: Backend Deployment

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Install esbuild for local bundling
npm install esbuild

# Build the project
npm run build

# (Optional) Set your preferred AWS region
# If not set, defaults to us-east-1
export CDK_DEPLOY_REGION=us-west-2  # or eu-west-1, ap-southeast-2, etc.

# Bootstrap CDK (only needed once per AWS account/region)
npx cdk bootstrap

# Deploy all stacks
npx cdk deploy --all --require-approval never
```

**Region Selection:**
- Choose a region close to your users for lower latency
- All resources deploy to your chosen region
- CloudFront WAF automatically deploys to us-east-1 (AWS requirement)
- See [REGION-DEPLOYMENT.md](REGION-DEPLOYMENT.md) for detailed guidance

**Save the deployment outputs:**
```yaml
AuthStack:
  CognitoRegion: ap-northeast-1
  CognitoUserPoolId: ap-northeast-1_xxxxxxxxx
  CognitoUserPoolWebClientId: xxxxxxxxxxxxxxxxxxxxxxxxxx
  IdentityPoolId: ap-northeast-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

APIStack:
  ApiUrl: https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/api/
  MarketplaceRoleArn: arn:aws:iam::account:role/...
  UrlsTableName: APIStack-FederationUrlsTable...
```

### Step 3: Frontend Configuration

```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Create environment file with values from deployment outputs
cat > .env << EOF
VITE_API_ENDPOINT=<YOUR_API_GATEWAY_URL>
VITE_COGNITO_REGION=<YOUR_REGION>
VITE_COGNITO_USER_POOL_ID=<YOUR_USER_POOL_ID>
VITE_COGNITO_USER_POOL_WEB_CLIENT_ID=<YOUR_CLIENT_ID>
EOF

# Build the frontend
npm run build
```

### Step 4: Deploy Frontend (Optional)

**Option A: AWS S3 + CloudFront**
```bash
# Deploy to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

**Option B: Local Development**
```bash
# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Step 5: Verify Deployment

```bash
# Navigate back to backend
cd ../backend

# List deployed stacks
npx cdk list

# Expected output:
# AuthStack
# APIStack
```

## Configuration

### Environment Variables

#### Backend (CDK)
Set up environment variables before deployment:

```bash
# Copy environment template (REQUIRED)
cp backend/.env.example backend/.env

# Validate configuration
./validate-env.sh

# Customize marketplace product IDs if needed (optional)
# Default values are already configured in .env.example
```

The following environment variables are automatically configured in the Lambda function:
- `MARKETPLACE_PRODUCT_ID_*` - Marketplace product IDs (from .env or defaults)
- `MARKETPLACE_ROLE_ARN` - Auto-generated by CDK
- `REGION` - Auto-generated by CDK  
- `PRESIGNED_URLS_TABLE` - Auto-generated by CDK

#### Frontend (.env)
```bash
VITE_API_ENDPOINT=https://your-api-gateway-url.amazonaws.com/api/
VITE_COGNITO_REGION=ap-northeast-1
VITE_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxxx
VITE_COGNITO_USER_POOL_WEB_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Security Features

### Authentication Flow
1. **User Registration/Login**: Users authenticate via AWS Cognito
2. **MFA Enforcement**: Time-based OTP (TOTP) required for all users
3. **JWT Tokens**: Secure token-based authentication
4. **Role Assumption**: Lambda assumes marketplace role with STS
5. **Temporary Credentials**: Short-lived credentials (1 hour)
6. **Session Tracking**: DynamoDB stores session information with TTL

### IAM Permissions
The application creates the following IAM roles:

- **Lambda Execution Role**: Basic execution + STS assume role permissions
- **Marketplace Role**: AWS Marketplace access permissions
- **Cognito Authenticated Role**: Basic marketplace permissions for authenticated users

## API Endpoints

### GET /marketplace-url
Generate federation URL for marketplace access

**Query Parameters:**
- `product` (required): Product type (gitlab, okta, newrelic, etc.)

**Response:**
```json
{
  "federationUrl": "https://signin.aws.amazon.com/federation?...",
  "expiresAt": 1640995200
}
```

### DELETE /marketplace-url
Invalidate user sessions

### POST /marketplace-url/revoke
Revoke all active sessions for the user

## Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm run test
```

### Manual Testing
1. **User Registration**: Create a new user account
2. **MFA Setup**: Configure TOTP authenticator
3. **Product Access**: Click "Shop Now" on different products
4. **Session Management**: Test logout and session cleanup
5. **Return Navigation**: Navigate back from marketplace

## Clean Up Resources

When you're done with the application, follow these steps to remove all AWS resources and avoid ongoing charges.

### Step 1: Navigate to Backend Directory

```bash
cd marketplace-enterprise-federation-access/backend
```

### Step 2: Destroy CDK Stacks

AWS CDK automatically removes all provisioned resources including CloudFront, S3 buckets, Lambda functions, API Gateway, Cognito, and DynamoDB tables.

```bash
# Destroy all stacks at once
npx cdk destroy --all --force

# Or destroy stacks in reverse order
npx cdk destroy APIStack --force
npx cdk destroy AuthStack --force
```

### Step 3: Delete CDK Generated Files

```bash
# Ensure you're in the backend directory
cd marketplace-enterprise-federation-access/backend

# Delete CDK output directory
rm -rf cdk.out

# Delete node_modules
rm -rf node_modules

# Delete build artifacts
rm -rf *.js *.d.ts
rm -f lambda-code.zip
```

### Step 4: Delete Frontend Build Files

```bash
# Navigate to frontend directory
cd ../frontend

# Delete node_modules
rm -rf node_modules

# Delete build output
rm -rf dist
```

### Step 5: Verify Cleanup

```bash
# Navigate back to backend
cd ../backend

# Check if stacks are deleted
npx cdk list
```

**Expected output:** Empty or no stacks listed.

### Step 6: Optional - Remove Bootstrap Resources

If you no longer need CDK in this AWS account/region:

```bash
# Delete CDK bootstrap stack (use with caution)
aws cloudformation delete-stack --stack-name CDKToolkit
```

**Note:** Only delete the CDKToolkit stack if you're not using CDK for any other projects in this account/region.

## Troubleshooting

### Common Issues

#### CDK Version Compatibility
```bash
# Update CDK CLI
npm install -g aws-cdk@latest
```

#### CORS Issues
Ensure your API Gateway has proper CORS configuration. The CDK automatically configures CORS for all origins.

#### Loading State Issues
The application handles loading states per product and clears them when returning from marketplace using `sessionStorage` and visibility change events.

## Monitoring

### CloudWatch Metrics
- Lambda function invocations and errors
- API Gateway request/response metrics
- DynamoDB read/write capacity

### Alarms
The CDK automatically creates CloudWatch alarms for:
- API Gateway 5XX errors
- Lambda function errors

## Session Management

### Session Lifecycle
1. **Creation**: User clicks "Shop Now" → Lambda generates federation URL
2. **Storage**: Session stored in DynamoDB with 1-hour TTL
3. **Usage**: User redirected to AWS Marketplace with temporary credentials
4. **Cleanup**: Automatic cleanup via TTL or manual logout

### Session Data
```json
{
  "userId": "user123#gitlab",
  "federationUrl": "https://signin.aws.amazon.com/federation?...",
  "expirationTime": 1640995200,
  "username": "user@example.com",
  "productType": "gitlab",
  "createdAt": "2023-12-31T12:00:00Z",
  "lastAccessed": "2023-12-31T12:00:00Z"
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For support and questions:
1. Check the troubleshooting section
2. Review CloudWatch logs
3. Verify IAM permissions
4. Check environment variables

## Future Enhancements

- [ ] Additional marketplace products
- [ ] Advanced session analytics
- [ ] Custom branding options
- [x] Multi-region deployment (✅ Completed - see [REGION-DEPLOYMENT.md](REGION-DEPLOYMENT.md))
- [ ] Enhanced monitoring dashboard
- [ ] Automated testing pipeline

---

## Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [AWS Marketplace Documentation](https://docs.aws.amazon.com/marketplace/)
- [React + Vite Documentation](https://vitejs.dev/guide/)
- [AWS Cloudscape Design System](https://cloudscape.design/)

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.