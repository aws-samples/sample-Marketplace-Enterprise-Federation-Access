// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly client: cognito.UserPoolClient;
  public readonly identityPool: cognito.CfnIdentityPool;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create User Pool
    const userPool = new cognito.UserPool(this, "UserPoolV2", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      selfSignUpEnabled: true, // Allow users to sign up
      mfa: cognito.Mfa.REQUIRED,
      mfaSecondFactor: {
        otp: true,
        sms: false,
      },
      signInAliases: {
        username: true,
        email: true
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true
        }
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true
      }
    });

    // Add resource server for custom scopes
    const resourceServer = new cognito.UserPoolResourceServer(this, 'ResourceServer', {
      userPool,
      identifier: 'api',
      scopes: [
        new cognito.ResourceServerScope({
          scopeName: 'read',
          scopeDescription: 'Read access'
        })
      ],
    });

    // Create User Pool Client
    const client = new cognito.UserPoolClient(this, "WebClient", {
      userPool,
      userPoolClientName: "webClient",
      idTokenValidity: cdk.Duration.days(1),
      accessTokenValidity: cdk.Duration.days(1),
      authFlows: {
        userPassword: true,
        userSrp: true,
        custom: true,
      },
      oAuth: {
        flows: {
          implicitCodeGrant: true,
          authorizationCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
          cognito.OAuthScope.resourceServer(resourceServer, {
            scopeName: 'read',
            scopeDescription: 'Read access'
          })
        ],
        callbackUrls: ['http://localhost:3000'],
        logoutUrls: ['http://localhost:3000'],
      },
      preventUserExistenceErrors: true,
      generateSecret: false
    });

    // Create Identity Pool
    this.identityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [{
        clientId: client.userPoolClientId,
        providerName: userPool.userPoolProviderName,
        serverSideTokenCheck: true
      }]
    });

    // Create role for authenticated users
    const authenticatedRole = new iam.Role(this, 'CognitoAuthRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': this.identityPool.ref
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated'
          }
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
      description: 'Role for authenticated users'
    });

    // Add marketplace permissions to authenticated role
    authenticatedRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'aws-marketplace:Subscribe',
          'aws-marketplace:ViewSubscriptions',
          'aws-marketplace:Unsubscribe'
        ],
        resources: ['*']
      })
    );

    // Attach roles to Identity Pool
    new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
      identityPoolId: this.identityPool.ref,
      roles: {
        authenticated: authenticatedRole.roleArn
      }
    });

    this.userPool = userPool;
    this.client = client;

    // Outputs
    new cdk.CfnOutput(this, "CognitoUserPoolId", {
      value: userPool.userPoolId,
      description: "userPoolId required for frontend settings",
      exportName: `${this.stackName}-UserPoolId`
    });

    new cdk.CfnOutput(this, "CognitoUserPoolWebClientId", {
      value: client.userPoolClientId,
      description: "clientId required for frontend settings",
      exportName: `${this.stackName}-UserPoolClientId`
    });

    new cdk.CfnOutput(this, "CognitoRegion", {
      value: this.region,
      description: "Region where Cognito user pool is created",
      exportName: `${this.stackName}-Region`
    });

    new cdk.CfnOutput(this, "IdentityPoolId", {
      value: this.identityPool.ref,
      description: "Identity Pool ID required for federation",
      exportName: `${this.stackName}-IdentityPoolId`
    });
  }
}