import { App, Stack, StackProps } from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import * as iam from 'aws-cdk-lib/aws-iam';
import { EC2LaunchTemplateWinProduct } from './lib/ec2-launch-template-windows';
import { Construct } from 'constructs/lib/construct';
import { EC2LaunchTemplateAmznProduct } from './lib/ec2-launch-template-amznlinux';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // Mandatory Role For Instance Profile
    const ec2Role = new iam.Role(this, 'EC2Role', {
      roleName: `MandatoryRoleForInstanceProfile`,
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      description: 'IAM Role for EC2',
    });

    ec2Role.addManagedPolicy(
      iam.ManagedPolicy.fromManagedPolicyArn(this, 'AmazonSSMManagedInstanceCore', 'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore'),
    );

    ec2Role.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['s3:List*'],
      resources: ['arn:aws:s3:::jingood2-servicecatalog-assets'],
    }));

    // Permission S3 for UserData Script
    ec2Role.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['s3:*Object'],
      resources: ['arn:aws:s3:::jingood2-servicecatalog-assets/*'],
    }));

    ec2Role.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['logs:*'],
      resources: ['arn:aws:logs:*:*:*'],
    }));

    ec2Role.addToPolicy(new iam.PolicyStatement({
      sid: 'AttachVolume',
      effect: iam.Effect.ALLOW,
      actions: ['ec2:AttachVolume'],
      resources: ['*'],
    }));

    // define resources here...
    new servicecatalog.CloudFormationProduct(this, 'Ec2LaunchTemplateAmznLinuxProduct', {
      productName: 'Ec2LaunchTemplateAmznLinux Product',
      owner: 'SK Cloud Transformation Group',
      productVersions: [
        {
          productVersionName: 'v1',
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
          productVersionName: 'v1',
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

new MyStack(app, 'ec2-launchtemplate', { env: devEnv, stackName: `SC-${process.env.PROJECT_NAME}-${process.env.STAGE}` });

app.synth();