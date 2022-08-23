import { App, Stack, StackProps } from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs';
import { EC2ASGWithLaunchTemplate } from './lib/ec2-amzn-linux-launchtemplate';
import { Ec2InstanceMultiEBSProduct } from './lib/ec2-instance-multi-ebs-product';
import { Ec2AmznLinuxAsgProduct } from './lib/ec2-amzn-linux-asg-product';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // define resources here...
    // define resources here...
    new servicecatalog.CloudFormationProduct(this, 'EC2InstanceAmznLinuxProduct', {
      productName: 'EC2 Instance with Multi EBS Volumes Product',
      owner: 'SK Cloud Transformation Group',
      productVersions: [
        {
          productVersionName: 'v1',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(new Ec2InstanceMultiEBSProduct(this, 'Ec2InstanceMultiEBS', {})),
        },
        
      ],
    });

    new servicecatalog.CloudFormationProduct(this, 'EC2AmznLinuxAsgProduct', {
      productName: 'Amazon Linux AutoScalingGroup Product',
      owner: 'SK Cloud Transformation Group',
      productVersions: [
        {
          productVersionName: 'v1',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(new Ec2AmznLinuxAsgProduct(this, 'EC2AmznLinuxAsg', {})),
        },
      ],
    });

    new servicecatalog.CloudFormationProduct(this, 'EC2WithLaunchTemplateProduct', {
      productName: 'EC2 or AutoScaling Group through Launch Template Product',
      owner: 'SK Cloud Transformation Group',
      productVersions: [
        {
          productVersionName: 'v1',
          description: 'Latest Amazon Linux EC2 Instance or AutoscalingGroup with LaunchTemplate',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(new EC2ASGWithLaunchTemplate(this, 'EC2WithLaunchTemplate', {})),
        }
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
//new Ec2InstanceAmznLinuxStack(app, 'ec2-stack', {});

app.synth();