import { App, DefaultStackSynthesizer, Stack, StackProps } from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs';
import { Ec2AmznLinuxAsgProduct } from './lib/ec2-amzn-linux-asg-product';
import { EC2ASGWithLaunchTemplate } from './lib/ec2-amzn-linux-launchtemplate';
import { Ec2InstanceMultiEBSProduct } from './lib/ec2-instance-multi-ebs-product';
import { EFSWithAutomountToEC2 } from './lib/efs-with-automount-to-ec2';
//import { EC2LaunchTemplateAmzn2V1Product } from './lib/ec2-launchtemplate-amzn2-v1.0';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // define resources here...
    // define resources here...
    new servicecatalog.CloudFormationProduct(this, 'EC2InstanceAmznLinuxProduct', {
      productName: 'EC2 Instance with Multi EBS Volumes Product',
      distributor: 'jingood2@sk.com',
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
      distributor: 'jingood2@sk.com',
      owner: 'SK Cloud Transformation Group',
      productVersions: [
        {
          productVersionName: 'v1',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(new Ec2AmznLinuxAsgProduct(this, 'EC2AmznLinuxASG', {})),
        },
      ],
    });

    new servicecatalog.CloudFormationProduct(this, 'EC2WithLaunchTemplateProduct', {
      productName: 'EC2 or AutoScaling Group through Launch Template Product',
      distributor: 'jingood2@sk.com',
      owner: 'SK Cloud Transformation Group',
      productVersions: [
        {
          productVersionName: 'v1',
          description: 'Latest Amazon Linux EC2 Instance or AutoscalingGroup with LaunchTemplate',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(new EC2ASGWithLaunchTemplate(this, 'EC2WithLaunchTemplate', {})),
        }
      ],
    });

    new servicecatalog.CloudFormationProduct(this, 'EC2WithEFSMountProduct', {
      productName: 'EC2 or AutoScaling Group with EFS Automount Product',
      distributor: 'jingood2@sk.com',
      owner: 'SK Cloud Transformation Group',
      productVersions: [
        {
          productVersionName: 'v1',
          description: 'Latest Amazon Linux EC2 Instance or AutoscalingGroup with LaunchTemplate',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(new EFSWithAutomountToEC2(this, 'EC2WithEFSMount', {})),
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

new MyStack(app, 'ec2-instance-amzn', { 
  env: devEnv, 
  stackName: `SC-${process.env.PROJECT_NAME}-${process.env.STAGE}`,
  synthesizer: new DefaultStackSynthesizer({
    generateBootstrapVersionRule: false,
  }),
 });

app.synth();