// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as iam from "aws-cdk-lib/aws-iam";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";
import * as path from "path";
import * as fs from "fs";

export interface FrontendStackProps extends cdk.StackProps {
  readonly enableWaf?: boolean;
  readonly userPool: cognito.UserPool;
  readonly userPoolClient: cognito.UserPoolClient;
  readonly api: apigateway.RestApi;
}

export class FrontendStack extends cdk.Stack {
  public readonly distribution: cloudfront.Distribution;
  public readonly bucket: s3.Bucket;
  public readonly webAcl?: wafv2.CfnWebACL;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const enableWaf = props?.enableWaf ?? true;

    // Create WAF Web ACL for CloudFront (must be in us-east-1)
    if (enableWaf) {
      this.webAcl = new wafv2.CfnWebACL(this, "CloudFrontWebACL", {
        scope: "CLOUDFRONT",
        defaultAction: { allow: {} },
        visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: "MarketplaceCloudFrontWebACL",
        },
        name: "marketplace-cloudfront-waf",
        description: "WAF rules for Marketplace CloudFront distribution",
        rules: [
          {
            name: "AWSManagedRulesCommonRuleSet",
            priority: 1,
            statement: {
              managedRuleGroupStatement: {
                vendorName: "AWS",
                name: "AWSManagedRulesCommonRuleSet",
              },
            },
            overrideAction: { none: {} },
            visibilityConfig: {
              sampledRequestsEnabled: true,
              cloudWatchMetricsEnabled: true,
              metricName: "CommonRuleSetMetric",
            },
          },
          {
            name: "AWSManagedRulesKnownBadInputsRuleSet",
            priority: 2,
            statement: {
              managedRuleGroupStatement: {
                vendorName: "AWS",
                name: "AWSManagedRulesKnownBadInputsRuleSet",
              },
            },
            overrideAction: { none: {} },
            visibilityConfig: {
              sampledRequestsEnabled: true,
              cloudWatchMetricsEnabled: true,
              metricName: "KnownBadInputsMetric",
            },
          },
          {
            name: "RateLimitRule",
            priority: 3,
            statement: {
              rateBasedStatement: {
                limit: 2000,
                aggregateKeyType: "IP",
              },
            },
            action: { block: {} },
            visibilityConfig: {
              sampledRequestsEnabled: true,
              cloudWatchMetricsEnabled: true,
              metricName: "RateLimitMetric",
            },
          },
          {
            name: "AWSManagedRulesAmazonIpReputationList",
            priority: 4,
            statement: {
              managedRuleGroupStatement: {
                vendorName: "AWS",
                name: "AWSManagedRulesAmazonIpReputationList",
              },
            },
            overrideAction: { none: {} },
            visibilityConfig: {
              sampledRequestsEnabled: true,
              cloudWatchMetricsEnabled: true,
              metricName: "IpReputationMetric",
            },
          },
        ],
      });
    }

    // Create S3 bucket for hosting the React app
    this.bucket = new s3.Bucket(this, "ReactAppBucket", {
      bucketName: `marketplace-react-app-${this.account}-${this.region}`,
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "index.html", // For SPA routing
      publicReadAccess: false, // We'll use CloudFront OAC instead
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For dev/test environments
      autoDeleteObjects: true, // For dev/test environments
      versioned: false,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // Create Origin Access Control (OAC) for CloudFront
    const originAccessControl = new cloudfront.S3OriginAccessControl(
      this,
      "ReactAppOAC",
      {
        description: "OAC for React App S3 bucket",
      }
    );

    // Create CloudFront distribution
    this.distribution = new cloudfront.Distribution(
      this,
      "ReactAppDistribution",
      {
        defaultBehavior: {
          origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket, {
            originAccessControl,
          }),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          compress: true,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
          responseHeadersPolicy:
            cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
        },
        additionalBehaviors: {
          // Don't cache config.js - always fetch fresh
          "/config.js": {
            origin: origins.S3BucketOrigin.withOriginAccessControl(
              this.bucket,
              {
                originAccessControl,
              }
            ),
            viewerProtocolPolicy:
              cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
            compress: false,
          },
          // Cache static assets for longer
          "/static/*": {
            origin: origins.S3BucketOrigin.withOriginAccessControl(
              this.bucket,
              {
                originAccessControl,
              }
            ),
            viewerProtocolPolicy:
              cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
            compress: true,
          },
          // Don't cache API calls
          "/api/*": {
            origin: origins.S3BucketOrigin.withOriginAccessControl(
              this.bucket,
              {
                originAccessControl,
              }
            ),
            viewerProtocolPolicy:
              cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          },
        },
        defaultRootObject: "index.html",
        errorResponses: [
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
            ttl: cdk.Duration.minutes(30),
          },
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
            ttl: cdk.Duration.minutes(30),
          },
        ],
        priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // Use only North America and Europe
        enabled: true,
        comment: "CloudFront distribution for React Marketplace App",
        webAclId: enableWaf ? this.webAcl!.attrArn : undefined,
      }
    );

    // Grant CloudFront access to S3 bucket
    this.bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal("cloudfront.amazonaws.com")],
        actions: ["s3:GetObject"],
        resources: [this.bucket.arnForObjects("*")],
        conditions: {
          StringEquals: {
            "AWS:SourceArn": `arn:aws:cloudfront::${this.account}:distribution/${this.distribution.distributionId}`,
          },
        },
      })
    );

    // First, generate and upload config.js (this must happen before website deployment)
    const configDeployment = this.generateAndUploadConfig(props.userPool, props.userPoolClient, props.api);

    // Deploy frontend files to S3 (only if dist folder exists)
    const frontendPath = path.join(__dirname, "../../frontend/dist");
    const fs = require("fs");
    if (fs.existsSync(frontendPath)) {
      const websiteDeployment = new s3deploy.BucketDeployment(this, "DeployWebsite", {
        sources: [s3deploy.Source.asset(frontendPath)],
        destinationBucket: this.bucket,
        distribution: this.distribution,
        distributionPaths: ["/*"],
        cacheControl: [
          s3deploy.CacheControl.setPublic(),
          s3deploy.CacheControl.maxAge(cdk.Duration.days(365)),
        ],
        exclude: ["config.js"], // Don't deploy config.js from dist folder
        prune: false, // Don't delete config.js that was uploaded separately
        memoryLimit: 512,
      });
      
      // Ensure config is deployed after website
      websiteDeployment.node.addDependency(configDeployment);
    } else {
      console.warn(
        "⚠️  Frontend dist folder not found. Build the frontend first with: cd frontend && npm run build"
      );
    }

    // Stack outputs
    new cdk.CfnOutput(this, "BucketName", {
      value: this.bucket.bucketName,
      description: "S3 Bucket Name for React App",
      exportName: `${this.stackName}-BucketName`,
    });

    new cdk.CfnOutput(this, "DistributionId", {
      value: this.distribution.distributionId,
      description: "CloudFront Distribution ID",
      exportName: `${this.stackName}-DistributionId`,
    });

    new cdk.CfnOutput(this, "DistributionDomainName", {
      value: this.distribution.distributionDomainName,
      description: "CloudFront Distribution Domain Name",
      exportName: `${this.stackName}-DistributionDomainName`,
    });

    new cdk.CfnOutput(this, "WebsiteURL", {
      value: `https://${this.distribution.distributionDomainName}`,
      description: "Website URL",
      exportName: `${this.stackName}-WebsiteURL`,
    });

    if (enableWaf && this.webAcl) {
      new cdk.CfnOutput(this, "CloudFrontWebACLArn", {
        value: this.webAcl.attrArn,
        description: "CloudFront WAF Web ACL ARN",
        exportName: `${this.stackName}-CloudFrontWebACLArn`,
      });
    }

    // Output configuration values for reference
    new cdk.CfnOutput(this, "CognitoRegion", {
      value: this.region,
      description: "Cognito Region",
      exportName: `${this.stackName}-CognitoRegion`,
    });

    new cdk.CfnOutput(this, "CognitoUserPoolId", {
      value: props.userPool.userPoolId,
      description: "Cognito User Pool ID",
      exportName: `${this.stackName}-CognitoUserPoolId`,
    });

    new cdk.CfnOutput(this, "CognitoUserPoolClientId", {
      value: props.userPoolClient.userPoolClientId,
      description: "Cognito User Pool Client ID",
      exportName: `${this.stackName}-CognitoUserPoolClientId`,
    });

    new cdk.CfnOutput(this, "ApiEndpoint", {
      value: props.api.url,
      description: "API Endpoint",
      exportName: `${this.stackName}-ApiEndpoint`,
    });
  }

  private generateAndUploadConfig(
    userPool: cognito.UserPool,
    userPoolClient: cognito.UserPoolClient,
    api: apigateway.RestApi
  ): s3deploy.BucketDeployment {
    const configContent = `// Auto-generated configuration by CDK
// Generated at deployment time
// This file is automatically uploaded to S3 and served via CloudFront
window.APP_CONFIG = {
  COGNITO_REGION: '${this.region}',
  COGNITO_USER_POOL_ID: '${userPool.userPoolId}',
  COGNITO_USER_POOL_WEB_CLIENT_ID: '${userPoolClient.userPoolClientId}',
  API_ENDPOINT: '${api.url}'
};
`;

    // Write config.js to S3 using BucketDeployment
    const configDeployment = new s3deploy.BucketDeployment(this, "DeployConfig", {
      sources: [
        s3deploy.Source.data("config.js", configContent),
      ],
      destinationBucket: this.bucket,
      distribution: this.distribution,
      distributionPaths: ["/config.js"],
      cacheControl: [
        s3deploy.CacheControl.noCache(),
      ],
      prune: false, // Don't delete other files
      memoryLimit: 256,
    });

    // Also generate .env.local for local development
    const envFilePath = path.join(__dirname, "../../frontend/.env.local");
    const envContent = `# Auto-generated configuration for local development
# Generated on: ${new Date().toISOString()}
# Note: In production, config is loaded from /config.js at runtime

# Cognito Configuration
VITE_COGNITO_REGION=${this.region}
VITE_COGNITO_USER_POOL_ID=${userPool.userPoolId}
VITE_COGNITO_USER_POOL_WEB_CLIENT_ID=${userPoolClient.userPoolClientId}

# API Configuration
VITE_API_ENDPOINT=${api.url}
`;

    try {
      const frontendDir = path.join(__dirname, "../../frontend");
      if (fs.existsSync(frontendDir)) {
        fs.writeFileSync(envFilePath, envContent);
        console.log(`✅ Generated ${envFilePath} for local development`);
      }
    } catch (error) {
      console.warn("⚠️  Could not generate .env.local file:", error);
    }

    return configDeployment;
  }
}
