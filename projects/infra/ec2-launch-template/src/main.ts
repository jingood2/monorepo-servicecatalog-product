import { App, Stack, StackProps } from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs';
import { EC2LaunchTemplateAmznProduct } from './lib/ec2-launch-template-amznlinux';
import { EC2LaunchTemplateWinProduct } from './lib/ec2-launch-template-windows';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // define resources here...
    // define resources here...
    new servicecatalog.CloudFormationProduct(this, 'Ec2LaunchTemplateAmznLinuxProduct', {
      productName: 'Ec2LaunchTemplateAmznLinux Product',
      owner: 'SK Cloud Transformation Group',
      productVersions: [
        {
          productVersionName: 'v1.0',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(
            new EC2LaunchTemplateAmznProduct(this, 'Ec2LaunchTemplateAmznLinux', {})),
        },
      ],
    });

    new servicecatalog.CloudFormationProduct(this, 'Ec2LaunchTemplateWinProduct', {
      productName: 'Ec2LaunchTemplateWindowsProduct',
      owner: 'SK Cloud Transformation Group',
      productVersions: [
        {
          productVersionName: 'v1.0',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(
            new EC2LaunchTemplateWinProduct(this, 'EC2LaunchTemplateWinProduct', {})),
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

new MyStack(app, 'ec2-instance-amzn-linux', { env: devEnv, stackName: `sc-${process.env.PROJECT_NAME}-ec2-launch-template-amznlinux` });

app.synth();