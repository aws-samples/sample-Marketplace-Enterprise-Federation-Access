// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

# Marketplace Configuration

This directory contains configuration files that are automatically deployed to S3 during CDK deployment.

## marketplace-products.json

This file contains the AWS Marketplace product IDs for all supported products. The Lambda function loads this configuration from S3 at runtime with caching.

### Structure

```json
{
  "products": {
    "productKey": {
      "id": "prodview-xxxxx",
      "name": "Product Display Name",
      "vendor": "Vendor Name"
    }
  }
}
```

### Adding New Products

1. Add a new entry to `marketplace-products.json`
2. Update the `ProductType` type in `backend/lambda/marketplace/redirect.ts`
3. Update the frontend product mapping in `frontend/src/components/shop.jsx`
4. Deploy: `npm run deploy`

The configuration is automatically uploaded to S3 during deployment and cached by the Lambda function for 5 minutes.

### Benefits

- No need for environment variables
- Easy to update product IDs without redeployment (just update S3)
- Centralized configuration
- Version controlled
- Automatic deployment with CDK

### Manual Updates

If you need to update product IDs without redeploying:

```bash
aws s3 cp marketplace-products.json s3://YOUR-CONFIG-BUCKET/config/marketplace-products.json
```

The Lambda function will pick up the changes within 5 minutes (cache TTL).
