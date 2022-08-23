import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { ProductStack } from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs/lib/construct';

export interface EC2LaunchTemplateProps extends cdk.StackProps {

}

export class EC2LaunchTemplateAmznProduct extends ProductStack {
  constructor(scope: Construct, id: string, _props: EC2LaunchTemplateProps) {
    super(scope, id );

    this.templateOptions.metadata = {
      'AWS::CloudFormation::Interface': {
        ParameterGroups: [
          {
            Label: {
              default: 'Information for IAM User',
            },
            Parameters: ['VpcId', 'Password'],
          },
        ],
      },
    };

    const instanceType = new cdk.CfnParameter(this, 'InstacneType', {
      type: 'String',
      default: 't3.micro',
      allowedValues: [
        't2.nano',
        't2.micro',
        't2.small',
        't2.medium',
        't2.large',
        't2.xlarge',
        't2.2xlarge',
        't3.nano',
        't3.micro',
        't3.small',
        't3.medium',
        't3.large',
        't3.xlarge',
        't3.2xlarge',
        'm5.large', 'm5.xlarge', 'm5.2xlarge', 'm5.4xlarge',
        'c5.large', 'c5.xlarge', 'c5.2xlarge', 'c5.4xlarge',
        'r5.large', 'r5.xlarge', 'r5.2xlarge', 'r5.4xlarge', 'r3.12xlarge',
      ],
    });


    // mandatory iam role
    // custom iam role
    // Create IAM Role For Instance
    const ec2Role = new iam.Role(this, 'EC2Role', {
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
        description: 'IAM Role for EC2',
    });
  
  
    ec2Role.addManagedPolicy(
    iam.ManagedPolicy.fromManagedPolicyArn(
        this, 'AmazonSSMManagedInstanceCore', 'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore'),
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
    actions: ['ec2:AttachVolume', 'ec2:DescribeVolume'],
    resources: ['*'],
    }));
    
    //const userData = UserData.forLinux();

    /* const localPath = userData.addS3DownloadCommand({
      bucket: Bucket.fromBucketName(this, 'S3Bucket', 'jingood2-servicecatalog-assets'),
      bucketKey: 'launchtemplate/configure.sh',
      region: 'ap-northeast-2', // Optional
    });

    userData.addExecuteFileCommand({
      filePath: localPath,
      arguments: '--verbose -y',
    }); */

    // DefaultRoleForInstanceProfile
    const instanceProfile = new iam.CfnInstanceProfile(this, "InstProfile", {
      roles: ['MandatoryRoleForInstanceProfile']
    });

    new ec2.LaunchTemplate(this, 'EC2AmznLaunchTemplate', {
      launchTemplateName: 'Amazon Linux Latest',
      instanceType: new ec2.InstanceType(instanceType.valueAsString),
      machineImage: ec2.MachineImage.latestAmazonLinux(),
      //role: ec2Role,
      //securityGroup: ec2SecurityGroup,
      //userData: userData,
      /* blockDevices: [
        { deviceName: '/dev/xvdf', volume: BlockDeviceVolume.ebs(addEbsVolume.valueAsNumber, { volumeType: EbsDeviceVolumeType.GENERAL_PURPOSE_SSD_GP3 }) },
      ], */
    });

  }
}