// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AuthStack } from '../lib/auth';
import { APIStack } from '../lib/api';

test('Auth Stack creates UserPool', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new AuthStack(app, 'MyTestStack');
    // THEN
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      MfaConfiguration: 'ON'
    });
});

test('API Stack creates Lambda function', () => {
    const app = new cdk.App();
    const authStack = new AuthStack(app, 'AuthTestStack');
    // WHEN
    const stack = new APIStack(app, 'APITestStack', {
      userPool: authStack.userPool
    });
    // THEN
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs18.x'
    });
});
