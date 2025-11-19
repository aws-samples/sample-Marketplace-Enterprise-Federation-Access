# Multi-Region Deployment Guide

## Overview

This application supports deployment in **any AWS region**, with one important constraint: CloudFront WAF Web ACLs must be created in **us-east-1** due to AWS service requirements.

## Region Requirements

### ✅ Can Deploy in Any Region
- **Cognito User Pool** - Authentication service
- **API Gateway** - REST API endpoints
- **Lambda Functions** - Business logic
- **DynamoDB** - Session storage
- **S3 Buckets** - Configuration and static assets
- **Regional WAF** - API Gateway protection

### ⚠️ Must Deploy in us-east-1
- **CloudFront WAF Web ACL** - Global CDN protection (AWS requirement)

## Why us-east-1 for CloudFront WAF?

AWS CloudFront is a **global service** that operates from edge locations worldwide. When you create a WAF Web ACL with `scope: "CLOUDFRONT"`, AWS requires it to be in **us-east-1** because:

1. CloudFront is a global service managed from us-east-1
2. WAF rules need to be replicated to all CloudFront edge locations
3. AWS uses us-east-1 as the control plane for global CloudFront configurations

This is **not a limitation of this application** - it's an AWS service requirement that applies to all CloudFront WAF deployments.

## Deployment Options

### Option 1: Single Region (us-east-1) - Simplest
Deploy everything in us-east-1 for the simplest setup.

```bash
# Deploy to us-east-1 (default)
cd backend
npx cdk deploy --all
```

**Pros:**
- ✅ Simplest deployment
- ✅ All resources in one region
- ✅ CloudFront WAF enabled by default

**Cons:**
- ❌ May have higher latency for users far from us-east-1
- ❌ Not optimal for international users

### Option 2: Multi-Region - Optimal for Global Users
Deploy application resources in your preferred region, CloudFront WAF in us-east-1.

```bash
# Deploy to your preferred region (e.g., eu-west-1 for Europe)
cd backend
export CDK_DEPLOY_REGION=eu-west-1
npx cdk deploy --all
```

**Pros:**
- ✅ Lower latency for regional users
- ✅ Data residency compliance
- ✅ CloudFront still provides global CDN
- ✅ CloudFront WAF enabled

**Cons:**
- ⚠️ Slightly more complex (handled automatically by CDK)

### Option 3: Regional Only (No WAF)
Deploy everything in your region without WAF for development/testing.

```bash
# Deploy without WAF (saves costs for dev/test)
cd backend
export CDK_DEPLOY_REGION=ap-southeast-2
export ENABLE_WAF=false
npx cdk deploy --all
```

**Pros:**
- ✅ Fully regional deployment
- ✅ Lower costs (no WAF charges)
- ✅ Simplest for non-production environments

**Cons:**
- ❌ No WAF protection
- ❌ Not recommended for production

## Supported Regions

This application can be deployed in **any AWS region** that supports:
- AWS Cognito
- AWS Lambda
- Amazon API Gateway
- Amazon DynamoDB
- Amazon S3

### Recommended Regions by Geography

**North America:**
- `us-east-1` (N. Virginia) - Default, lowest latency for US East Coast
- `us-west-2` (Oregon) - Best for US West Coast
- `ca-central-1` (Canada) - Best for Canadian users

**Europe:**
- `eu-west-1` (Ireland) - Best for Western Europe
- `eu-central-1` (Frankfurt) - Best for Central Europe
- `eu-west-2` (London) - Best for UK

**Asia Pacific:**
- `ap-northeast-1` (Tokyo) - Best for Japan
- `ap-southeast-1` (Singapore) - Best for Southeast Asia
- `ap-southeast-2` (Sydney) - Best for Australia
- `ap-south-1` (Mumbai) - Best for India

**South America:**
- `sa-east-1` (São Paulo) - Best for South America

**Middle East:**
- `me-south-1` (Bahrain) - Best for Middle East

## How to Deploy to a Specific Region

### Method 1: Environment Variable (Recommended)

```bash
cd backend

# Set your preferred region
export CDK_DEPLOY_REGION=eu-west-1

# Deploy all stacks
npx cdk deploy --all
```

### Method 2: CDK Context

```bash
cd backend

# Deploy with context parameter
npx cdk deploy --all --context region=ap-southeast-2
```

### Method 3: Modify provisioning.ts

Edit `backend/bin/provisioning.ts`:

```typescript
const primaryRegion = "eu-west-1"; // Your preferred region
```

## What Happens During Multi-Region Deployment

When you deploy to a region other than us-east-1:

1. **AuthStack** deploys to your chosen region (e.g., eu-west-1)
   - Cognito User Pool
   - Identity Pool
   - IAM roles

2. **APIStack** deploys to your chosen region (e.g., eu-west-1)
   - API Gateway with Regional WAF
   - Lambda functions
   - DynamoDB table
   - S3 config bucket

3. **FrontendStack** deploys to us-east-1
   - S3 bucket for static assets
   - CloudFront distribution (global)
   - CloudFront WAF Web ACL (must be us-east-1)
   - Automatically references Cognito/API from your chosen region

## Verifying Your Deployment

After deployment, check the outputs:

```bash
# Check which regions were used
npx cdk list

# View stack outputs
aws cloudformation describe-stacks --stack-name AuthStack --query 'Stacks[0].Outputs'
```

Expected outputs:
```json
{
  "CognitoRegion": "eu-west-1",        // Your chosen region
  "CognitoUserPoolId": "eu-west-1_xxx",
  "ApiUrl": "https://xxx.execute-api.eu-west-1.amazonaws.com/api/"
}
```

## Performance Considerations

### Latency by Region

| User Location | Recommended Region | Typical Latency |
|--------------|-------------------|-----------------|
| US East Coast | us-east-1 | 10-30ms |
| US West Coast | us-west-2 | 10-30ms |
| Europe | eu-west-1 | 10-40ms |
| Asia Pacific | ap-southeast-1 | 20-60ms |
| Australia | ap-southeast-2 | 20-60ms |
| South America | sa-east-1 | 30-80ms |

**Note:** CloudFront provides global CDN caching, so static assets are served from edge locations near your users regardless of your chosen region.

## Cost Considerations

Deploying in different regions has minimal cost impact:

- **Data Transfer:** CloudFront edge locations are worldwide regardless of region
- **Lambda/API Gateway:** Pricing is similar across regions (within 10%)
- **DynamoDB:** On-demand pricing is consistent across regions
- **S3:** Storage costs are similar across regions

**Cross-Region Considerations:**
- If FrontendStack is in us-east-1 and other stacks are elsewhere, there's minimal cross-region data transfer
- CloudFront to origin (S3) traffic is optimized by AWS

### WAF Costs

AWS WAF adds additional costs:

**CloudFront WAF (per month):**
- Web ACL: $5.00
- Rules: $1.00 per rule (4 rules = $4.00)
- Requests: $0.60 per million requests
- **Estimated:** ~$10-20/month for low traffic

**API Gateway WAF (per month):**
- Web ACL: $5.00
- Rules: $1.00 per rule (5 rules = $5.00)
- Requests: $0.60 per million requests
- **Estimated:** ~$10-20/month for low traffic

**Total WAF Cost:** ~$20-40/month

**To disable WAF (for development):**
```bash
export ENABLE_WAF=false
npx cdk deploy --all
```

**Reference:** [AWS WAF Pricing](https://aws.amazon.com/waf/pricing/)

## Compliance and Data Residency

For organizations with data residency requirements:

### GDPR (Europe)
```bash
export CDK_DEPLOY_REGION=eu-west-1  # Ireland
# or
export CDK_DEPLOY_REGION=eu-central-1  # Frankfurt
```

### Australian Privacy Principles
```bash
export CDK_DEPLOY_REGION=ap-southeast-2  # Sydney
```

### Canadian Data Residency
```bash
export CDK_DEPLOY_REGION=ca-central-1  # Canada
```

**Important:** User authentication data (Cognito) and session data (DynamoDB) will be stored in your chosen region. CloudFront is a global CDN and caches content at edge locations worldwide.

## Troubleshooting

### Issue: "WAF Web ACL must be in us-east-1"

**Cause:** Trying to create CloudFront WAF in a region other than us-east-1.

**Solution:** The code automatically handles this. If you see this warning, it means WAF is disabled. To enable:

```bash
# Ensure FrontendStack deploys to us-east-1
cd backend
export CDK_DEPLOY_REGION=your-region
npx cdk deploy --all
# FrontendStack will automatically deploy to us-east-1
```

### Issue: "Cross-region references not supported"

**Cause:** CDK trying to reference resources across regions incorrectly.

**Solution:** The updated code uses stack exports and imports. Ensure you're using the latest version:

```bash
cd backend
npm install
npm run build
npx cdk deploy --all
```

### Issue: High latency for API calls

**Cause:** API Gateway deployed far from your users.

**Solution:** Deploy to a region closer to your users:

```bash
export CDK_DEPLOY_REGION=<region-near-users>
npx cdk deploy --all
```

## Migration Between Regions

To migrate an existing deployment to a new region:

1. **Deploy to new region:**
   ```bash
   export CDK_DEPLOY_REGION=new-region
   npx cdk deploy --all --require-approval never
   ```

2. **Update DNS/URLs** (if using custom domain)

3. **Migrate users** (if needed):
   ```bash
   # Export users from old Cognito pool
   # Import to new Cognito pool
   ```

4. **Destroy old stacks:**
   ```bash
   export CDK_DEPLOY_REGION=old-region
   npx cdk destroy --all
   ```

## Best Practices

1. **Choose region based on user location** - Deploy where most users are located
2. **Use CloudFront** - Provides global CDN regardless of region
3. **Enable WAF** - Keep CloudFront WAF enabled for security
4. **Test latency** - Measure API response times from user locations
5. **Consider compliance** - Choose regions that meet data residency requirements
6. **Monitor costs** - Cross-region data transfer is minimal but monitor it
7. **Use environment variables** - Don't hardcode regions in code

## Summary

- ✅ **Application resources** can deploy to any AWS region
- ⚠️ **CloudFront WAF** must be in us-east-1 (AWS requirement)
- 🌍 **CloudFront CDN** is global regardless of region
- 🚀 **Deployment is automatic** - just set `CDK_DEPLOY_REGION`
- 📊 **Choose region based on users** - lower latency = better UX

For most users, deploying to your nearest region provides the best experience while maintaining CloudFront's global CDN benefits.
