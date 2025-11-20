// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as agw from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";
import * as path from "path";

interface APIStackProps extends cdk.StackProps {
  userPool: cognito.UserPool;
  enableWaf?: boolean;
}

export class APIStack extends cdk.Stack {
  public readonly api: agw.RestApi;
  public readonly webAcl?: wafv2.CfnWebACL;
  public readonly userPool: cognito.UserPool;

  constructor(scope: Construct, id: string, props: APIStackProps) {
    super(scope, id, props);

    const enableWaf = props.enableWaf ?? true;
    this.userPool = props.userPool;

    // S3 bucket for configuration files
    const configBucket = new s3.Bucket(this, "ConfigBucket", {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      versioned: true,
      enforceSSL: true,
    });

    // Upload marketplace products config to S3
    new s3deploy.BucketDeployment(this, "DeployConfig", {
      sources: [s3deploy.Source.asset(path.join(__dirname, "../config"))],
      destinationBucket: configBucket,
      destinationKeyPrefix: "config/",
    });

    // DynamoDB table for federation URLs
    const urlsTable = new dynamodb.Table(this, "FederationUrlsTable", {
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "expirationTime",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
    });

    // Create Lambda role with basic execution permissions
    const lambdaRole = new iam.Role(this, "MarketplaceRedirectRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: "Role for Marketplace Redirect Lambda",
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
      inlinePolicies: {
        "sts-permissions": new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                "sts:AssumeRole",
                "sts:TagSession",
                "sts:GetFederationToken",
              ],
              resources: ["*"],
            }),
          ],
        }),
      },
    });

    // Create marketplace role that can be assumed by Lambda
    const marketplaceRole = new iam.Role(this, "MarketplaceRole", {
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal("lambda.amazonaws.com"),
        new iam.ArnPrincipal(lambdaRole.roleArn)
      ),
      description: "Role for Marketplace Access",
      maxSessionDuration: cdk.Duration.hours(12),
      inlinePolicies: {
        "marketplace-access": new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                "aws-marketplace:Subscribe",
                "aws-marketplace:ViewSubscriptions",
                "aws-marketplace:Unsubscribe",
                "aws-marketplace:GetEntitlements",
              ],
              resources: ["*"],
            }),
          ],
        }),
        "sts-permissions": new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ["sts:TagSession", "sts:AssumeRole"],
              resources: ["*"],
            }),
          ],
        }),
      },
    });

    // Add trust relationship to marketplace role
    marketplaceRole.assumeRolePolicy?.addStatements(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.ArnPrincipal(lambdaRole.roleArn)],
        actions: ["sts:AssumeRole", "sts:TagSession"],
        conditions: {
          StringEquals: {
            "aws:PrincipalArn": lambdaRole.roleArn,
          },
        },
      })
    );

    // Add additional permissions to Lambda role
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["sts:AssumeRole", "sts:TagSession", "sts:GetFederationToken"],
        resources: [marketplaceRole.roleArn],
      })
    );

    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["iam:PutRolePolicy", "iam:DeleteRolePolicy"],
        resources: [marketplaceRole.roleArn],
      })
    );

    // Add Cognito permissions to Lambda role
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["cognito-idp:GlobalSignOut", "cognito-idp:RevokeToken"],
        resources: [props.userPool.userPoolArn],
      })
    );

    // Grant DynamoDB permissions to Lambda role
    urlsTable.grantReadWriteData(lambdaRole);

    // Grant S3 read permissions to Lambda role for config bucket
    configBucket.grantRead(lambdaRole);

    // Create Lambda function
    const marketplaceRedirectFunction = new lambdaNodejs.NodejsFunction(
      this,
      "marketplaceRedirect",
      {
        runtime: lambda.Runtime.NODEJS_22_X,
        entry: "./lambda/marketplace/redirect.ts",
        handler: "handler",
        environment: {
          CONFIG_BUCKET: configBucket.bucketName,
          CONFIG_KEY: "config/marketplace-products.json",
          MARKETPLACE_ROLE_ARN: marketplaceRole.roleArn,
          REGION: this.region,
          PRESIGNED_URLS_TABLE: urlsTable.tableName,
          ISSUER: process.env.ISSUER || "YourApplication",
          USER_POOL_ID: props.userPool.userPoolId,
          NODE_ENV: process.env.NODE_ENV || "production",
        },
        memorySize: 1024,
        timeout: cdk.Duration.seconds(30),
        role: lambdaRole,
        tracing: lambda.Tracing.ACTIVE,
        bundling: {
          minify: true,
          sourceMap: true,
          nodeModules: [
            "@aws-sdk/client-sts",
            "@aws-sdk/client-dynamodb",
            "@aws-sdk/lib-dynamodb",
            "@aws-sdk/client-cognito-identity-provider",
            "@aws-sdk/client-iam",
            "@aws-sdk/client-s3",
            "node-fetch",
          ],
          externalModules: ["aws-sdk"],
        },
      }
    );

    // Create API Gateway
    this.api = new agw.RestApi(this, "api", {
      deployOptions: {
        stageName: "api",
        metricsEnabled: true,
        loggingLevel: agw.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        tracingEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: agw.Cors.ALL_ORIGINS,
        allowMethods: agw.Cors.ALL_METHODS,
        allowHeaders: [
          "Content-Type",
          "X-Amz-Date",
          "Authorization",
          "X-Api-Key",
          "X-Amz-Security-Token",
        ],
        maxAge: cdk.Duration.days(1),
      },
    });

    // Create WAF Web ACL for API Gateway (REGIONAL scope)
    if (enableWaf) {
      this.webAcl = new wafv2.CfnWebACL(this, "ApiGatewayWebACL", {
        scope: "REGIONAL",
        defaultAction: { allow: {} },
        visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: "MarketplaceApiWebACL",
        },
        name: `marketplace-api-waf-${this.region}`,
        description: "WAF rules for Marketplace API Gateway",
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
              metricName: "ApiCommonRuleSetMetric",
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
              metricName: "ApiKnownBadInputsMetric",
            },
          },
          {
            name: "AWSManagedRulesSQLiRuleSet",
            priority: 3,
            statement: {
              managedRuleGroupStatement: {
                vendorName: "AWS",
                name: "AWSManagedRulesSQLiRuleSet",
              },
            },
            overrideAction: { none: {} },
            visibilityConfig: {
              sampledRequestsEnabled: true,
              cloudWatchMetricsEnabled: true,
              metricName: "ApiSQLiRuleSetMetric",
            },
          },
          {
            name: "ApiRateLimitRule",
            priority: 4,
            statement: {
              rateBasedStatement: {
                limit: 1000,
                aggregateKeyType: "IP",
              },
            },
            action: { block: {} },
            visibilityConfig: {
              sampledRequestsEnabled: true,
              cloudWatchMetricsEnabled: true,
              metricName: "ApiRateLimitMetric",
            },
          },
          {
            name: "AWSManagedRulesAmazonIpReputationList",
            priority: 5,
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
              metricName: "ApiIpReputationMetric",
            },
          },
        ],
      });

      // Associate WAF with API Gateway stage
      new wafv2.CfnWebACLAssociation(this, "ApiGatewayWafAssociation", {
        resourceArn: `arn:aws:apigateway:${this.region}::/restapis/${this.api.restApiId}/stages/${this.api.deploymentStage.stageName}`,
        webAclArn: this.webAcl.attrArn,
      });
    }

    // Create Cognito authorizer
    const authorizer = new agw.CognitoUserPoolsAuthorizer(this, "Authorizer", {
      cognitoUserPools: [props.userPool],
      resultsCacheTtl: cdk.Duration.minutes(5),
      identitySource: "method.request.header.Authorization",
    });

    // Create API endpoints
    const marketplaceResource = this.api.root.addResource("marketplace-url");

    // Add revoke endpoint
    const revokeResource = marketplaceResource.addResource("revoke");

    // Create Lambda integration with proper error handling
    const integration = new agw.LambdaIntegration(marketplaceRedirectFunction, {
      proxy: true,
      integrationResponses: [
        {
          statusCode: "200",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": "'*'",
            "method.response.header.Access-Control-Allow-Headers":
              "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'",
            "method.response.header.Access-Control-Allow-Methods":
              "'GET,POST,DELETE,OPTIONS'",
          },
        },
        {
          selectionPattern: ".*",
          statusCode: "500",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": "'*'",
            "method.response.header.Access-Control-Allow-Headers":
              "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'",
            "method.response.header.Access-Control-Allow-Methods":
              "'GET,POST,DELETE,OPTIONS'",
          },
        },
      ],
    });

    // Add methods with proper responses
    const methodOptions = {
      authorizer,
      authorizationType: agw.AuthorizationType.COGNITO,
      methodResponses: [
        {
          statusCode: "200",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
            "method.response.header.Access-Control-Allow-Headers": true,
            "method.response.header.Access-Control-Allow-Methods": true,
          },
        },
        {
          statusCode: "500",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
            "method.response.header.Access-Control-Allow-Headers": true,
            "method.response.header.Access-Control-Allow-Methods": true,
          },
        },
      ],
    };

    // Add main endpoint methods
    marketplaceResource.addMethod("GET", integration, methodOptions);
    marketplaceResource.addMethod("DELETE", integration, methodOptions);

    // Add revoke endpoint method
    revokeResource.addMethod("POST", integration, methodOptions);

    // Add CloudWatch Alarms
    new cdk.aws_cloudwatch.Alarm(this, "ApiErrorAlarm", {
      metric: this.api.metricServerError(),
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: "API Gateway 5XX errors",
      treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    new cdk.aws_cloudwatch.Alarm(this, "LambdaErrorAlarm", {
      metric: marketplaceRedirectFunction.metricErrors(),
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: "Lambda function errors",
      treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Stack outputs
    new cdk.CfnOutput(this, "ApiUrl", {
      value: this.api.url,
      description: "API Gateway URL",
      exportName: `${this.stackName}-ApiUrl`,
    });

    if (enableWaf && this.webAcl) {
      new cdk.CfnOutput(this, "ApiWebACLArn", {
        value: this.webAcl.attrArn,
        description: "API Gateway WAF Web ACL ARN",
        exportName: `${this.stackName}-ApiWebACLArn`,
      });
    }

    new cdk.CfnOutput(this, "UrlsTableName", {
      value: urlsTable.tableName,
      description: "DynamoDB Table Name",
      exportName: `${this.stackName}-UrlsTableName`,
    });

    new cdk.CfnOutput(this, "MarketplaceRoleArn", {
      value: marketplaceRole.roleArn,
      description: "Marketplace Role ARN",
      exportName: `${this.stackName}-MarketplaceRoleArn`,
    });

    new cdk.CfnOutput(this, "LambdaRoleArn", {
      value: lambdaRole.roleArn,
      description: "Lambda Role ARN",
      exportName: `${this.stackName}-LambdaRoleArn`,
    });

    new cdk.CfnOutput(this, "ConfigBucketName", {
      value: configBucket.bucketName,
      description: "Configuration S3 Bucket Name",
      exportName: `${this.stackName}-ConfigBucketName`,
    });
  }
}
