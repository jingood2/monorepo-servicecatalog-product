import { App, Stack, StackProps } from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs';
import { Ec2InstanceAmznLinuxProduct } from './lib/ec2-instance-amzn-linux-product';
//import { EC2LaunchTemplateAmzn2V1Product } from './lib/ec2-launchtemplate-amzn2-v1.0';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // define resources here...
    // define resources here...
    new servicecatalog.CloudFormationProduct(this, 'EC2InstanceAmznLinuxProduct', {
      productName: 'EC2 Instance Amazon Linux Product',
      owner: 'SK Cloud Transformation Group',
      productVersions: [
        {
          productVersionName: 'v1.0',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(new Ec2InstanceAmznLinuxProduct(this, 'EC2LaunchTemplate', {})),
        },
        /* {
          productVersionName: 'v2.0',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(new EC2LaunchTemplateAmzn2V1Product(this, 'EC2LaunchTemplate-V2.0', {})),
        }, */
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

new MyStack(app, 'ec2-instance-amzn', { env: devEnv, stackName: `sc-${process.env.PROJECT_NAME}` });

app.synth();