// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from "aws-cdk-lib";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";
import { Construct } from "constructs";

export interface WafStackProps extends cdk.StackProps {
  readonly scope: "CLOUDFRONT" | "REGIONAL";
  readonly resourceArn?: string;
}

export class WafStack extends cdk.Stack {
  public readonly webAcl: wafv2.CfnWebACL;

  constructor(scope: Construct, id: string, props: WafStackProps) {
    super(scope, id, props);

    // Create WAF Web ACL
    this.webAcl = new wafv2.CfnWebACL(this, "WebACL", {
      scope: props.scope,
      defaultAction: { allow: {} },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: "MarketplaceWebACL",
      },
      name: `marketplace-waf-${props.scope.toLowerCase()}`,
      description: "WAF rules for Marketplace application",
      rules: [
        // AWS Managed Rules - Core Rule Set
        {
          name: "AWSManagedRulesCommonRuleSet",
          priority: 1,
          statement: {
            managedRuleGroupStatement: {
              vendorName: "AWS",
              name: "AWSManagedRulesCommonRuleSet",
              excludedRules: [],
            },
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: "AWSManagedRulesCommonRuleSetMetric",
          },
        },
        // AWS Managed Rules - Known Bad Inputs
        {
          name: "AWSManagedRulesKnownBadInputsRuleSet",
          priority: 2,
          statement: {
            managedRuleGroupStatement: {
              vendorName: "AWS",
              name: "AWSManagedRulesKnownBadInputsRuleSet",
              excludedRules: [],
            },
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: "AWSManagedRulesKnownBadInputsRuleSetMetric",
          },
        },
        // AWS Managed Rules - SQL Injection
        {
          name: "AWSManagedRulesSQLiRuleSet",
          priority: 3,
          statement: {
            managedRuleGroupStatement: {
              vendorName: "AWS",
              name: "AWSManagedRulesSQLiRuleSet",
              excludedRules: [],
            },
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: "AWSManagedRulesSQLiRuleSetMetric",
          },
        },
        // Rate Limiting - 2000 requests per 5 minutes per IP
        {
          name: "RateLimitRule",
          priority: 4,
          statement: {
            rateBasedStatement: {
              limit: 2000,
              aggregateKeyType: "IP",
            },
          },
          action: {
            block: {
              customResponse: {
                responseCode: 429,
                customResponseBodyKey: "rate-limit-response",
              },
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: "RateLimitRuleMetric",
          },
        },
        // Block requests with no User-Agent
        {
          name: "BlockNoUserAgent",
          priority: 5,
          statement: {
            notStatement: {
              statement: {
                sizeConstraintStatement: {
                  fieldToMatch: {
                    singleHeader: { name: "user-agent" },
                  },
                  comparisonOperator: "GT",
                  size: 0,
                  textTransformations: [
                    {
                      priority: 0,
                      type: "NONE",
                    },
                  ],
                },
              },
            },
          },
          action: { block: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: "BlockNoUserAgentMetric",
          },
        },
        // Geographic restriction (optional - customize as needed)
        {
          name: "GeoBlockRule",
          priority: 6,
          statement: {
            geoMatchStatement: {
              // Block high-risk countries (customize this list)
              countryCodes: ["KP", "IR", "SY", "CU"],
            },
          },
          action: { block: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: "GeoBlockRuleMetric",
          },
        },
        // IP Reputation List
        {
          name: "AWSManagedRulesAmazonIpReputationList",
          priority: 7,
          statement: {
            managedRuleGroupStatement: {
              vendorName: "AWS",
              name: "AWSManagedRulesAmazonIpReputationList",
              excludedRules: [],
            },
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: "AWSManagedRulesAmazonIpReputationListMetric",
          },
        },
        // Anonymous IP List
        {
          name: "AWSManagedRulesAnonymousIpList",
          priority: 8,
          statement: {
            managedRuleGroupStatement: {
              vendorName: "AWS",
              name: "AWSManagedRulesAnonymousIpList",
              excludedRules: [],
            },
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: "AWSManagedRulesAnonymousIpListMetric",
          },
        },
      ],
      customResponseBodies: {
        "rate-limit-response": {
          contentType: "APPLICATION_JSON",
          content: JSON.stringify({
            message: "Too many requests. Please try again later.",
          }),
        },
      },
    });

    // Associate WAF with resource if ARN provided
    if (props.resourceArn) {
      new wafv2.CfnWebACLAssociation(this, "WebACLAssociation", {
        resourceArn: props.resourceArn,
        webAclArn: this.webAcl.attrArn,
      });
    }

    // Outputs
    new cdk.CfnOutput(this, "WebACLId", {
      value: this.webAcl.attrId,
      description: "WAF Web ACL ID",
      exportName: `${this.stackName}-WebACLId`,
    });

    new cdk.CfnOutput(this, "WebACLArn", {
      value: this.webAcl.attrArn,
      description: "WAF Web ACL ARN",
      exportName: `${this.stackName}-WebACLArn`,
    });
  }
}
