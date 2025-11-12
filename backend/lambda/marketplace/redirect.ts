// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { STSClient, AssumeRoleCommand, Credentials } from "@aws-sdk/client-sts";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  CognitoIdentityProviderClient,
  GlobalSignOutCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { IAMClient, PutRolePolicyCommand } from "@aws-sdk/client-iam";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import fetch, { Response } from "node-fetch";
import { URLSearchParams, URL } from "url";

// Security: Allowed endpoints to prevent SSRF (CWE-918)
const ALLOWED_ENDPOINTS = {
  AWS_FEDERATION: "https://signin.aws.amazon.com/federation"
} as const;

// SSRF protection: Validate URLs against allowlist with strict parsing
function validateEndpoint(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    
    // Only allow HTTPS
    if (parsedUrl.protocol !== 'https:') {
      return false;
    }
    
    // Check against allowlist
    const allowedUrls = Object.values(ALLOWED_ENDPOINTS) as string[];
    return allowedUrls.includes(url);
  } catch {
    return false;
  }
}

// Types
interface FederationUrlResponse {
  federationUrl: string;
  expiresAt: number;
}

interface StoredUrlItem {
  userId: string;
  federationUrl: string;
  expirationTime: number;
  username: string;
  createdAt: string;
  lastAccessed: string;
}

interface ErrorResponse {
  message: string;
  error?: string;
}

interface RevokeResponse {
  message: string;
  revokedAt: string;
}

type ProductType =
  | "gitlab"
  | "okta"
  | "sisense"
  | "crowdstrike"
  | "trend"
  | "wiz"
  | "teradata"
  | "ibm"
  | "jenkins"
  | "redhat"
  | "grafana"
  | "newrelic";

// Initialize AWS clients
const stsClient = new STSClient({
  region: process.env.REGION || "ap-northeast-1",
});

const ddbClient = new DynamoDBClient({
  region: process.env.REGION || "ap-northeast-1",
});

const docClient = DynamoDBDocumentClient.from(ddbClient);

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.REGION || "ap-northeast-1",
});

const iamClient = new IAMClient({
  region: process.env.REGION || "ap-northeast-1",
});

const s3Client = new S3Client({
  region: process.env.REGION || "ap-northeast-1",
});

// Constants
const TABLE_NAME = process.env.PRESIGNED_URLS_TABLE!;
const MARKETPLACE_ROLE_ARN = process.env.MARKETPLACE_ROLE_ARN!;
const CONFIG_BUCKET = process.env.CONFIG_BUCKET!;
const CONFIG_KEY = process.env.CONFIG_KEY!;
const ISSUER = process.env.ISSUER || "YourApplication";
const MAX_SESSION_DURATION = 3600; // 1 hour in seconds

// Cache for product configuration
let productConfigCache: { [key: string]: { id: string; name: string; vendor: string } } | null = null;
let configCacheTime = 0;
const CONFIG_CACHE_TTL = 300000; // 5 minutes in milliseconds

// CORS headers
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
  "Content-Type": "application/json",
};

// Helper function to load product configuration from S3
async function loadProductConfig(): Promise<{ [key: string]: { id: string; name: string; vendor: string } }> {
  const now = Date.now();
  
  // Return cached config if still valid
  if (productConfigCache && (now - configCacheTime) < CONFIG_CACHE_TTL) {
    return productConfigCache;
  }

  try {
    console.log("Loading product configuration from S3:", { bucket: CONFIG_BUCKET, key: CONFIG_KEY });
    
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: CONFIG_BUCKET,
        Key: CONFIG_KEY,
      })
    );

    if (!response.Body) {
      throw new Error("Empty response from S3");
    }

    const configData = await response.Body.transformToString();
    const config = JSON.parse(configData);
    
    productConfigCache = config.products;
    configCacheTime = now;
    
    console.log("Successfully loaded product configuration");
    return productConfigCache!;
  } catch (error) {
    console.error("Error loading product configuration from S3:", error);
    
    // If we have cached data, use it even if expired
    if (productConfigCache) {
      console.log("Using expired cache due to S3 error");
      return productConfigCache;
    }
    
    throw new Error("Failed to load product configuration and no cache available");
  }
}

// Logging utilities
const logRequest = (event: APIGatewayProxyEvent, context: any) => {
  console.log("Request details:", {
    requestId: context.awsRequestId,
    path: event.path,
    method: event.httpMethod,
    userId: event.requestContext.authorizer?.claims.sub,
    username: event.requestContext.authorizer?.claims["cognito:username"],
  });
};

const logRevocation = (userId: string, roleArn: string, timestamp: string) => {
  console.log("Session revocation:", {
    userId,
    roleArn,
    timestamp,
    action: "REVOKE_SESSIONS",
  });
};

// Helper function to handle errors
const handleError = (error: unknown): string => {
  if (error instanceof Error) {
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    return error.message;
  }
  console.error("Unknown error:", error);
  return "An unknown error occurred";
};

// Secure AWS federation request - SSRF protection (CWE-918)
function makeAwsFederationRequest(sessionData: string): Promise<Response> {
  // Validate endpoint against allowlist
  if (!validateEndpoint(ALLOWED_ENDPOINTS.AWS_FEDERATION)) {
    throw new Error("Invalid endpoint - SSRF protection");
  }
  
  const params = new URLSearchParams();
  params.append("Action", "getSigninToken");
  params.append("Session", sessionData);
  
  // Use the validated constant, not hardcoded URL
  return fetch(ALLOWED_ENDPOINTS.AWS_FEDERATION, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: params.toString(),
  });
}

// Helper function to get federation token
async function getFederationToken(credentials: Credentials): Promise<string> {
  try {
    const session = {
      sessionId: credentials.AccessKeyId,
      sessionKey: credentials.SecretAccessKey,
      sessionToken: credentials.SessionToken,
    };

    const response = await makeAwsFederationRequest(JSON.stringify(session));

    if (!response.ok) {
      throw new Error(`Federation request failed: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.SigninToken) {
      throw new Error("No signin token received");
    }

    return data.SigninToken;
  } catch (error) {
    console.error("Federation token error:", error);
    throw error;
  }
}

// Helper function to create federation URL
async function createFederationUrl(
  signinToken: string,
  productType: ProductType
): Promise<string> {
  const productConfig = await loadProductConfig();
  
  const product = productConfig[productType];
  if (!product || !product.id) {
    throw new Error(`Product configuration not found for: ${productType}`);
  }

  const productId = product.id;
  const marketplaceUrl = `https://aws.amazon.com/marketplace/pp/${productId}`;
  const params = new URLSearchParams({
    Action: "login",
    Destination: marketplaceUrl,
    SigninToken: signinToken,
    Issuer: ISSUER,
  });

  return `https://signin.aws.amazon.com/federation?${params.toString()}`;
}

// Helper function to revoke role sessions
async function revokeRoleSessions(roleNameOrArn: string): Promise<void> {
  console.log("Starting session revocation for role:", roleNameOrArn);

  try {
    const roleName = roleNameOrArn.includes("/")
      ? roleNameOrArn.split("/").pop()
      : roleNameOrArn;

    if (!roleName) {
      throw new Error("Invalid role name or ARN");
    }

    const currentTime = new Date().toISOString();
    const denyPolicy = {
      Version: "2012-10-17",
      Statement: {
        Effect: "Deny",
        Action: "*",
        Resource: "*",
        Condition: {
          DateLessThan: {
            "aws:TokenIssueTime": currentTime,
          },
        },
      },
    };

    console.log("Applying deny policy:", {
      roleName,
      policyName: "AWSRevokeOlderSessions",
      timestamp: currentTime,
    });

    await iamClient.send(
      new PutRolePolicyCommand({
        RoleName: roleName,
        PolicyName: "AWSRevokeOlderSessions",
        PolicyDocument: JSON.stringify(denyPolicy),
      })
    );

    console.log("Successfully applied deny policy to role:", roleName);

    // Add a small delay to ensure policy propagation
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (error) {
    console.error("Error in revokeRoleSessions:", error);
    throw error;
  }
}

// Helper function to generate federation URL
async function generateFederationUrl(
  userId: string,
  username: string,
  productType: ProductType
): Promise<FederationUrlResponse> {
  try {
    console.log("Generating federation URL for user:", username);

    const assumeRoleResponse = await stsClient.send(
      new AssumeRoleCommand({
        RoleArn: MARKETPLACE_ROLE_ARN,
        RoleSessionName: `marketplace-${username}-${Date.now()}`,
        DurationSeconds: MAX_SESSION_DURATION,
        Tags: [
          {
            Key: "userId",
            Value: userId,
          },
          {
            Key: "username",
            Value: username,
          },
        ],
      })
    );

    if (!assumeRoleResponse.Credentials) {
      throw new Error("Failed to obtain credentials");
    }

    const signinToken = await getFederationToken(
      assumeRoleResponse.Credentials
    );
    // Get product type from query parameters, defaulting to 'gitlab'
    const federationUrl = await createFederationUrl(signinToken, productType);

    // Store URL with expiration
    const expirationTime =
      Math.floor(Date.now() / 1000) + MAX_SESSION_DURATION - 300;
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          userId: `${userId}#${productType}`, // Include product type in key
          federationUrl,
          expirationTime,
          username,
          productType,
          createdAt: new Date().toISOString(),
          lastAccessed: new Date().toISOString(),
        },
      })
    );

    return {
      federationUrl,
      expiresAt: expirationTime,
    };
  } catch (error) {
    console.error("Error generating federation URL:", error);
    throw error;
  }
}

// Helper function to invalidate URL
async function invalidateUrl(userId: string): Promise<boolean> {
  try {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { userId },
      })
    );
    return true;
  } catch (error) {
    console.error("Error invalidating URL:", error);
    throw error;
  }
}

// Helper function to invalidate all URLs for a user
async function invalidateAllUserUrls(baseUserId: string): Promise<boolean> {
  try {
    // For simplicity, we'll delete the specific product URLs we know about
    const productTypes: ProductType[] = [
      'gitlab', 'okta', 'newrelic', 'sisense', 'crowdstrike',
      'trend', 'wiz', 'teradata', 'ibm', 'jenkins', 'redhat', 'grafana'
    ];

    const deletePromises = productTypes.map(productType =>
      docClient.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { userId: `${baseUserId}#${productType}` },
        })
      ).catch(error => {
        // Ignore errors for non-existent keys
        console.log(`No stored URL found for ${baseUserId}#${productType}`);
      })
    );

    await Promise.all(deletePromises);
    return true;
  } catch (error) {
    console.error("Error invalidating user URLs:", error);
    throw error;
  }
}

// Helper function to get stored URL
async function getStoredUrl(userId: string): Promise<StoredUrlItem | null> {
  try {
    const response = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { userId },
      })
    );

    if (!response.Item) {
      return null;
    }

    const item = response.Item as StoredUrlItem;

    if (item.expirationTime < Math.floor(Date.now() / 1000)) {
      await invalidateUrl(userId); // userId here is already the composite key
      return null;
    }

    // Update last accessed timestamp
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          ...item,
          lastAccessed: new Date().toISOString(),
        },
      })
    );

    return item;
  } catch (error) {
    console.error("Error getting stored URL:", error);
    throw error;
  }
}

// Main Lambda handler
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("Event:", JSON.stringify(event, null, 2));

  try {
    // Handle CORS preflight requests
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers,
        body: "",
      };
    }

    // Validate authorization
    const userId = event.requestContext.authorizer?.claims.sub;
    const username =
      event.requestContext.authorizer?.claims["cognito:username"];

    if (!userId || !username) {
      console.error("Missing user information:", { userId, username });
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          message: "Unauthorized: Missing user information",
        } as ErrorResponse),
      };
    }

    // Handle GET request - Get or generate federation URL
    if (event.httpMethod === "GET") {
      try {
        const productType = event.queryStringParameters?.product as ProductType || 'gitlab';

        const storedUrl = await getStoredUrl(`${userId}#${productType}`);
        if (storedUrl) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              federationUrl: storedUrl.federationUrl,
              expiresAt: storedUrl.expirationTime,
            } as FederationUrlResponse),
          };
        }

        const urlData = await generateFederationUrl(userId, username, productType);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(urlData),
        };
      } catch (error) {
        console.error("Error handling GET request:", error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            message: "Failed to generate federation URL",
            error: handleError(error),
          } as ErrorResponse),
        };
      }
    }

    // Handle POST request - Revoke sessions
    if (event.httpMethod === "POST" && event.path.endsWith("/revoke")) {
      console.log("Processing revocation request for user:", username);

      try {
        const timestamp = new Date().toISOString();

        // Revoke role sessions
        await revokeRoleSessions(MARKETPLACE_ROLE_ARN);

        // Invalidate all stored URLs for this user (scan and delete all keys starting with userId)
        await invalidateAllUserUrls(userId);

        // Perform Cognito global sign-out if access token is provided
        const accessToken = event.headers["Authorization"]?.replace(
          "Bearer ",
          ""
        );
        if (accessToken) {
          console.log("Performing Cognito global sign-out for user:", username);
          try {
            await cognitoClient.send(
              new GlobalSignOutCommand({
                AccessToken: accessToken,
              })
            );
            console.log(
              "Successfully performed global sign-out for user:",
              username
            );
          } catch (error) {
            console.error("Error during global sign-out:", error);
          }
        }

        logRevocation(userId, MARKETPLACE_ROLE_ARN, timestamp);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: "All sessions revoked successfully",
            revokedAt: timestamp,
          } as RevokeResponse),
        };
      } catch (error) {
        console.error("Error handling session revocation:", error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            message: "Failed to revoke sessions",
            error: handleError(error),
          } as ErrorResponse),
        };
      }
    }

    // Handle DELETE request - Logout and cleanup
    if (event.httpMethod === "DELETE") {
      try {
        await invalidateAllUserUrls(userId);

        // Perform Cognito global sign-out if access token is provided
        const accessToken = event.headers["Authorization"]?.replace(
          "Bearer ",
          ""
        );
        if (accessToken) {
          try {
            await cognitoClient.send(
              new GlobalSignOutCommand({
                AccessToken: accessToken,
              })
            );
          } catch (error) {
            console.error("Error during global sign-out:", error);
          }
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: "Session terminated successfully",
          }),
        };
      } catch (error) {
        console.error("Error handling DELETE request:", error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            message: "Failed to terminate session",
            error: handleError(error),
          } as ErrorResponse),
        };
      }
    }

    // Handle unsupported methods
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        message: "Method not allowed",
      } as ErrorResponse),
    };
  } catch (error) {
    console.error("Unhandled error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: "Internal server error",
        error: handleError(error),
      } as ErrorResponse),
    };
  }
};
