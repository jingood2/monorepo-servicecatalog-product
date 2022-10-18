import path from 'path';
import { App, DefaultStackSynthesizer, Stack, StackProps } from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs';
import { ProductAlbStack } from './lib/alb-wafv2';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // define resources here...
    new servicecatalog.CloudFormationProduct(this, 'ACMWithACMProduct', {
      description: 'Application Load Balancer with ACM',
      productName: 'ALB with ACM Product',
      distributor: 'jingood2@sk.com',
      owner: 'SK Cloud Transformation Group',
      productVersions: [
        {
          productVersionName: 'v1',
          description: 'Application Load Balancer with ACM',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromAsset(
            path.join(__dirname, './lib/cfn-template/alb-v1.yaml'),
          ),
        },
        {
          productVersionName: 'v2',
          description: 'ALB V2',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(
            new ProductAlbStack(this, 'ALBProduct', {})),
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

new MyStack(app, 'alb-product', {
  env: devEnv,
  stackName: `SC-${process.env.PROJECT_NAME}-${process.env.STAGE}`,
  synthesizer: new DefaultStackSynthesizer({
    generateBootstrapVersionRule: false,
  }),
});
// new MyStack(app, 'alb-prod', { env: prodEnv });

app.synth();