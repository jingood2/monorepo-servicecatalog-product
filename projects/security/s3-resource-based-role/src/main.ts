import { App, Stack, StackProps } from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs';
import { IamCrossAccountRole } from './lib/s3-resource-based-policy';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // define resources here...
    // define resources here...
    new servicecatalog.CloudFormationProduct(this, 'CrossAccountRoleProduct', {
      productName: 'Cross Account Role Product',
      owner: 'SK Cloud Transformation Group',
      distributor: 'jingood2@sk.com',
      productVersions: [
        {
          productVersionName: 'v1',
          description: 'Create Cross Account Role Product',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(new IamCrossAccountRole(this, 'IamCrossAccount', {})),
        },
      ],
    });
  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new MyStack(app, 'iam-cross-account-role', { 
  env: devEnv, 
  stackName: `SC-${process.env.PROJECT_NAME}-${process.env.STAGE}`,
  synthesizer: new DefaultStackSynthesizer({
    generateBootstrapVersionRule: false,
  }),
 });

app.synth();