// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { CloudFormationCustomResourceEvent } from 'aws-lambda';

const RESOURCE_ID = 'marketplace-dependencies-handler';

export const handler = async (event: CloudFormationCustomResourceEvent) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  return {
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    PhysicalResourceId: RESOURCE_ID,
    Status: 'SUCCESS',
    StackId: event.StackId,
    Data: {
      Message: `Operation ${event.RequestType} completed successfully`,
      Timestamp: new Date().toISOString()
    }
  };
};