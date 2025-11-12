## Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
## SPDX-License-Identifier: MIT-0

#!/bin/bash

# Script to update marketplace configuration in S3
# Usage: ./scripts/update-config.sh [stack-name]

set -e

STACK_NAME=${1:-APIStack}

echo "Fetching config bucket name from CloudFormation stack: $STACK_NAME"

# Get the config bucket name from CloudFormation outputs
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='ConfigBucketName'].OutputValue" \
  --output text)

if [ -z "$BUCKET_NAME" ]; then
  echo "Error: Could not find ConfigBucketName output in stack $STACK_NAME"
  echo "Make sure the stack is deployed and the output exists"
  exit 1
fi

echo "Config bucket: $BUCKET_NAME"
echo "Uploading marketplace-products.json..."

# Upload the config file
aws s3 cp config/marketplace-products.json "s3://$BUCKET_NAME/config/marketplace-products.json"

echo "✓ Configuration updated successfully!"
echo "The Lambda function will pick up changes within 5 minutes (cache TTL)"
