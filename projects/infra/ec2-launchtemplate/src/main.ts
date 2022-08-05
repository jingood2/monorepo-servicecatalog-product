import { App, Stack, StackProps } from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs';
import { EC2LauchTemplate } from './lib/ec2-launchtemplate';
import { EFSWithAutomountToEC2 } from './lib/efs-with-automount-to-ec2';
import { EC2ASGWithLaunchTemplate } from './lib/linux-launchtemplate-with-asg';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // define resources here...
    // Create a product from a stack
    new servicecatalog.CloudFormationProduct(this, 'EC2LaunchTEmplateProduct', {
      productName: 'EC2 LaunchTemplate Product',
      owner: 'SK Cloud Transformation Group',
      productVersions: [
        {
          productVersionName: 'v1.0',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(new EC2ASGWithLaunchTemplate(this, 'Ec2LaunchTemplateWithAutoscaling', {})),
        },
      ],
    });

    new servicecatalog.CloudFormationProduct(this, 'EFSWithAutomountToEC2LaunchTemplateProduct', {
      productName: 'EFS mount on EC2 LaunchTemplate Product',
      owner: 'SK Cloud Transformation Group',
      productVersions: [
        {
          productVersionName: 'v1.0',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(new EFSWithAutomountToEC2(this, 'EFSWithAutomountToEC2LaunchTemplate', {})),
        },
      ],
    });

    new servicecatalog.CloudFormationProduct(this, 'EC2LaunchTemplateProduct', {
      productName: 'EC2 LaunchTemplate Product V2',
      owner: 'SK Cloud Transformation Group',
      productVersions: [
        {
          productVersionName: 'v2.0',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(new EC2LauchTemplate(this, 'EC2LaunchTemplate', {})),
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

new MyStack(app, 'my-new-stack', { env: devEnv, stackName: `sc-${process.env.PROJECT_NAME}-${process.env.STAGE}` });
app.synth();