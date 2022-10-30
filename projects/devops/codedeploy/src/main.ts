import * as cdk from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs';
import { CodedeployEc2Product } from './lib/codedeploy-ec2';

export class MyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps = {}) {
    super(scope, id, props);

    // define resources here...
    // define resources here...
    new servicecatalog.CloudFormationProduct(this, 'CodeDeploy', {
      productName: 'codedeploy-product',
      owner: 'jingood2@sk.com',
      distributor: 'SK Cloud Transformation Group',
      description: 'CodeDeploy Product',
      productVersions: [
        {
          productVersionName: 'v1',
          description: 'AWS CodeDeploy is a deployment service that automates application deployments to Amazon EC2 instances, on-premises instances, serverless Lambda functions, or Amazon ECS services',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(
            new CodedeployEc2Product(this, 'CodeDeployProduct', {})),
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

const app = new cdk.App();

new MyStack(app, 'codedeploy-cicd', {
  env: devEnv,
  stackName:
  `SC-${process.env.PROJECT_NAME}-${process.env.STAGE}`,
  synthesizer: new cdk.DefaultStackSynthesizer({
    generateBootstrapVersionRule: false,
  }),
});

app.synth();