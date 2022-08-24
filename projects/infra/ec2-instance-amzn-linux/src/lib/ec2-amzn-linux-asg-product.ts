import { readFileSync } from 'fs';
import path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
//import * as s3 from 'aws-cdk-lib/aws-s3';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs/lib/construct';

export interface Ec2InstanceAmznLinuxProductProps extends cdk.StackProps {

}

export class Ec2AmznLinuxAsgProduct extends servicecatalog.ProductStack {
  constructor(scope: Construct, id: string, _props: Ec2InstanceAmznLinuxProductProps) {
    super(scope, id);

    this.templateOptions.metadata = {
      'AWS::CloudFormation::Interface': {
        ParameterGroups: [
          {
            Label: {
              default: 'Information of environmentType',
            },
            Parameters: ['ProjectName', 'environmentType', 'Ec2Name', 'InstacneType'],
          },
          {
            Label: {
              default: 'Information of Network',
            },
            Parameters: ['VpcId', 'Subnet1', 'Subnet2'],
          },
          {
            Label: {
              default: 'AutoscalingGroup Configuration',
            },
            Parameters: [
              'Ec2AutoscaleMinSize',
              'Ec2AutoscaleMaxSize',
              'Ec2AutoscaleDesiredCapacity',
            ],
          },
          {
            Label: {
              default: 'EBS Volume Configuration',
            },
            Parameters: [
              'ShouldAttachVolumeCount',
              'VolumeA',
              'VolumeB',
              'VolumeC',
            ],
          },
        ],
      },
    };

    const projectName = new cdk.CfnParameter(this, 'ProjectName', {
      type: 'String',
      default: 'projectName',
      description: 'Project Name',
    });

    const environmentType= new cdk.CfnParameter(this, 'environmentType', {
      type: 'String',
      default: 'dev',
      allowedValues: ['shared', 'dev', 'stage', 'prod'],
      description: 'environmentType Name',
    });

    const ec2Name = new cdk.CfnParameter(this, 'Ec2Name', {
      type: 'String',
      description: 'EC2 Name',
    });

    const vpcId = new cdk.CfnParameter(this, 'VpcId', {
      type: 'AWS::EC2::VPC::Id',
      default: 'vpc-10544f72',
      description: 'VpcId Where you deploy ec2 on',
    });

    const ec2Subnet1 = new cdk.CfnParameter(this, 'Subnet1', {
      type: 'AWS::EC2::Subnet::Id',
      description: 'EC2 subnet 1',
    });

    const ec2Subnet2 = new cdk.CfnParameter(this, 'Subnet2', {
      type: 'AWS::EC2::Subnet::Id',
      description: 'EC2 subnet 2',
    });

    /* const launchTemplateId = new cdk.CfnParameter(this, 'LaunchTemplateId', {
        type: 'String',
        default: 'lt-033147a306cb9b66f'
    });
    */

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

    /* const accessPointPath = new cdk.CfnParameter(this, 'EFSAccessPointPath', {
        type: 'String',
        description: 'EFS Access Point Path',
        default: '/mnt/accesspoint',
      });

    const ebsMountPoint = new cdk.CfnParameter(this, 'EBSMountPoint', {
    type: 'String',
    description: 'extention EBS Mount Point',
    default: '/data',
    }); */

    const ec2AutoscaleMinSize = new cdk.CfnParameter(this, 'Ec2AutoscaleMinSize', {
      type: 'Number',
      default: 1,
      description: 'AutoScalingGroup MinSize',
    });

    const ec2AutoscaleMaxSize = new cdk.CfnParameter(this, 'Ec2AutoscaleMaxSize', {
      type: 'Number',
      default: 1,
      description: 'AutoScalingGroup MaxSize',
    });

    const ec2AutoscaleDesiredCapacity = new cdk.CfnParameter(this, 'Ec2AutoscaleDesiredCapacity', {
      type: 'Number',
      default: 1,
      description: 'AutoScalingGroup DesiredCapacity',
    });

    const shouldAttachVolumeCount = new cdk.CfnParameter(this, 'ShouldAttachVolumeCount', {
      type: 'String',
      default: '0',
      allowedValues: ['0','1','2','3'],
      description: 'Should attach Count of EBS Volume',
    });

    const volumeA = new cdk.CfnParameter(this, 'VolumeA', {
      type: 'Number',
      default: 1,
      description: 'Size of EBS Volume /dev/xvdb',
    });

    const volumeB = new cdk.CfnParameter(this, 'VolumeB', {
      type: 'Number',
      default: 1,
      description: 'Size of EBS Volume /dev/xvdc',
    });

    const volumeC = new cdk.CfnParameter(this, 'VolumeC', {
      type: 'Number',
      default: 1,
      description: 'Size of EBS Volume /dev/xvdd',
    });

    // Import existing vpc
    const vpc = ec2.Vpc.fromVpcAttributes(this, 'Vpc', {
      vpcId: vpcId.valueAsString,
      availabilityZones: ['ap-northeast-2a', 'ap-northeast-2b'],
      privateSubnetIds: [ec2Subnet1.valueAsString, ec2Subnet2.valueAsString],
    });

    // Condition
    const attachVolumeNone = new cdk.CfnCondition(this, 'AttachVolumeNone', {
      expression: cdk.Fn.conditionEquals(shouldAttachVolumeCount, '0'),
    });

    const attachVolumeOne = new cdk.CfnCondition(this, 'AttachVolumeOne', {
      expression: cdk.Fn.conditionEquals(shouldAttachVolumeCount, '1'),
    });

    const attachVolumeTwo = new cdk.CfnCondition(this, 'AttachVolumeTwo', {
      expression: cdk.Fn.conditionEquals(shouldAttachVolumeCount, '2'),
    });

    const attachVolumeThree = new cdk.CfnCondition(this, 'AttachVolumeThree', {
      expression: cdk.Fn.conditionEquals(shouldAttachVolumeCount, '3'),
    });

    // Create EC2 Security Group
    const ec2SecurityGroup = new ec2.SecurityGroup(this, 'EC2SecurityGroup', {
      securityGroupName: `${projectName.valueAsString}-${environmentType.valueAsString}-${ec2Name.valueAsString}-sg`,
      vpc,
      allowAllOutbound: true,
    });
    //cdk.Tags.of(ec2SecurityGroup).add('Name', `${projectName.valueAsString}-ec2-${environmentType.valueAsString}-${ec2Name.valueAsString}-sg`);

    // Create IAM Role For Instance
    const ec2Role = new iam.Role(this, 'EC2Role', {
      roleName: `${projectName.valueAsString}-ec2-${environmentType.valueAsString}-${ec2Name.valueAsString}-role`,
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



    /*************************************************************************************************************************** */

    // 👇 load user data script
    const userDataScript = readFileSync(path.join(__dirname, './scripts', 'DefaultUserData'), 'utf8');

    /* let userData = ec2.UserData.forLinux();
    userData.addS3DownloadCommand({
      bucket: s3.Bucket.fromBucketName(this, 'S3Bucket', 'jingood2-servicecatalog-assets'),
      bucketKey: 'userdata/DefaultUserData2',
      region: 'ap-northeast-2', // Optional
    }); */

    const asgNone = new autoscaling.AutoScalingGroup(this, 'ASGWithNoEBS', {
      autoScalingGroupName: `${projectName.valueAsString}-${environmentType.valueAsString}-${ec2Name.valueAsString}-asg`,
      instanceType: new ec2.InstanceType(instanceType.valueAsString),
      machineImage: ec2.MachineImage.latestAmazonLinux({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      vpc,
      role: ec2Role,
      minCapacity: ec2AutoscaleMinSize.valueAsNumber,
      maxCapacity: ec2AutoscaleMaxSize.valueAsNumber,
      desiredCapacity: ec2AutoscaleDesiredCapacity.valueAsNumber,
      vpcSubnets: {
        subnets: [
          ec2.Subnet.fromSubnetId(this, 'ASGNoneSubnetA', ec2Subnet1.valueAsString),
          ec2.Subnet.fromSubnetId(this, 'ASGNoneSubnetC', ec2Subnet2.valueAsString),
        ],
      },
      securityGroup: ec2SecurityGroup,
    });
    asgNone.addUserData(userDataScript);

    cdk.Tags.of(asgNone).add('Name', `${projectName.valueAsString}-ec2-${environmentType.valueAsString}-${ec2Name.valueAsString}`);
    const cfnAsgNone = asgNone.node.defaultChild as autoscaling.CfnAutoScalingGroup;
    cfnAsgNone.cfnOptions.condition = attachVolumeNone;

    /* ASG One EBS Volume */
    const asgOne = new autoscaling.AutoScalingGroup(this, 'ASGWithOneEBS', {
      autoScalingGroupName: `${projectName.valueAsString}-${environmentType.valueAsString}-${ec2Name.valueAsString}-asg`,
      instanceType: new ec2.InstanceType(instanceType.valueAsString),
      machineImage: ec2.MachineImage.latestAmazonLinux({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      vpc,
      role: ec2Role,
      minCapacity: ec2AutoscaleMinSize.valueAsNumber,
      maxCapacity: ec2AutoscaleMaxSize.valueAsNumber,
      desiredCapacity: ec2AutoscaleDesiredCapacity.valueAsNumber,
      vpcSubnets: {
        subnets: [
          ec2.Subnet.fromSubnetId(this, 'ASGOneSubnetA', ec2Subnet1.valueAsString),
          ec2.Subnet.fromSubnetId(this, 'ASGOneSubnetC', ec2Subnet2.valueAsString),
        ],
      },
      securityGroup: ec2SecurityGroup,
      blockDevices: [
        {
          deviceName: '/dev/xvdb',
          volume: autoscaling.BlockDeviceVolume.ebs(volumeA.valueAsNumber,
            { volumeType: autoscaling.EbsDeviceVolumeType.GP3 }),
        },
      ],
    });
    asgOne.addUserData(userDataScript);

    cdk.Tags.of(asgOne).add('Name', `${projectName.valueAsString}-asg-${environmentType.valueAsString}-${ec2Name.valueAsString}`);
    const cfnAsgOne = asgOne.node.defaultChild as autoscaling.CfnAutoScalingGroup;
    cfnAsgOne.cfnOptions.condition = attachVolumeOne;

    /* ASG Two EBS Volume */
    const asgTwo = new autoscaling.AutoScalingGroup(this, 'ASGWithTwoEBS', {
      autoScalingGroupName: `${projectName.valueAsString}-${environmentType.valueAsString}-${ec2Name.valueAsString}-asg`,
      instanceType: new ec2.InstanceType(instanceType.valueAsString),
      machineImage: ec2.MachineImage.latestAmazonLinux({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      vpc,
      role: ec2Role,
      minCapacity: ec2AutoscaleMinSize.valueAsNumber,
      maxCapacity: ec2AutoscaleMaxSize.valueAsNumber,
      desiredCapacity: ec2AutoscaleDesiredCapacity.valueAsNumber,
      vpcSubnets: {
        subnets: [
          ec2.Subnet.fromSubnetId(this, 'ASGTwoSubnetA', ec2Subnet1.valueAsString),
          ec2.Subnet.fromSubnetId(this, 'ASGTwoSubnetC', ec2Subnet2.valueAsString),
        ],
      },
      securityGroup: ec2SecurityGroup,
      blockDevices: [
        {
          deviceName: '/dev/xvdb',
          volume: autoscaling.BlockDeviceVolume.ebs(volumeA.valueAsNumber,
            { volumeType: autoscaling.EbsDeviceVolumeType.GP3 }),
        },
        {
          deviceName: '/dev/xvdc',
          volume: autoscaling.BlockDeviceVolume.ebs(volumeB.valueAsNumber,
            { volumeType: autoscaling.EbsDeviceVolumeType.GP3 }),
        },
      ],
    });
    asgTwo.addUserData(userDataScript);

    cdk.Tags.of(asgTwo).add('Name', `${projectName.valueAsString}-asg-${environmentType.valueAsString}-${ec2Name.valueAsString}`);
    const cfnAsgTwo = asgTwo.node.defaultChild as autoscaling.CfnAutoScalingGroup;
    cfnAsgTwo.cfnOptions.condition = attachVolumeTwo;

    /* ASG Three EBS Volume */
    const asgThree = new autoscaling.AutoScalingGroup(this, 'ASGWithThreeEBS', {
      autoScalingGroupName: `${projectName.valueAsString}-${environmentType.valueAsString}-${ec2Name.valueAsString}-asg`,
      instanceType: new ec2.InstanceType(instanceType.valueAsString),
      machineImage: ec2.MachineImage.latestAmazonLinux({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      vpc,
      role: ec2Role,
      minCapacity: ec2AutoscaleMinSize.valueAsNumber,
      maxCapacity: ec2AutoscaleMaxSize.valueAsNumber,
      desiredCapacity: ec2AutoscaleDesiredCapacity.valueAsNumber,
      vpcSubnets: {
        subnets: [
          ec2.Subnet.fromSubnetId(this, 'ASGThreeSubnetA', ec2Subnet1.valueAsString),
          ec2.Subnet.fromSubnetId(this, 'ASGThreeSubnetC', ec2Subnet2.valueAsString),
        ],
      },
      securityGroup: ec2SecurityGroup,
      blockDevices: [
        {
          deviceName: '/dev/xvdb',
          volume: autoscaling.BlockDeviceVolume.ebs(volumeA.valueAsNumber,
            { volumeType: autoscaling.EbsDeviceVolumeType.GP3 }),
        },
        {
          deviceName: '/dev/xvdc',
          volume: autoscaling.BlockDeviceVolume.ebs(volumeB.valueAsNumber,
            { volumeType: autoscaling.EbsDeviceVolumeType.GP3 }),
        },
        {
          deviceName: '/dev/xvdd',
          volume: autoscaling.BlockDeviceVolume.ebs(volumeC.valueAsNumber,
            { volumeType: autoscaling.EbsDeviceVolumeType.GP3 }),
        },
      ],
    });
    asgThree.addUserData(userDataScript);

    cdk.Tags.of(asgThree).add('Name', `${projectName.valueAsString}-asg-${environmentType.valueAsString}-${ec2Name.valueAsString}`);
    const cfnAsgThree = asgThree.node.defaultChild as autoscaling.CfnAutoScalingGroup;
    cfnAsgThree.cfnOptions.condition = attachVolumeThree;

  }
};