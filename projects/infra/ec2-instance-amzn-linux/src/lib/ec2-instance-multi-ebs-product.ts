import { readFileSync } from 'fs';
import path from 'path';
import * as cdk from 'aws-cdk-lib';
//import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
//import * as s3 from 'aws-cdk-lib/aws-s3';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs/lib/construct';
//import { AutoScalingGroup, CfnAutoScalingGroup } from 'aws-cdk-lib/aws-autoscaling';

export interface Ec2InstanceAmznLinuxProductProps extends cdk.StackProps {

}

export class Ec2InstanceMultiEBSProduct extends servicecatalog.ProductStack {
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
              default: 'Information of EBS Volume',
            },
            Parameters: [
              'ShouldAttachVolumeA',
              'VolumeA',
              'ShouldAttachVolumeB',
              'VolumeB',
              'ShouldAttachVolumeC',
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

    const instanceType = new cdk.CfnParameter(this, 'InstacneType', {
      type: 'String',
      default: 't3.micro',
      allowedValues: [
        't2.nano','t2.micro','t2.small','t2.medium','t2.large','t2.xlarge','t2.2xlarge',
        't3.nano','t3.micro','t3.small','t3.medium','t3.large','t3.xlarge','t3.2xlarge',
        'm5.large', 'm5.xlarge', 'm5.2xlarge', 'm5.4xlarge',
        'm5a.large', 'm5a.xlarge', 'm5a.2xlarge', 'm5a.4xlarge',
        'c5.large', 'c5.xlarge', 'c5.2xlarge', 'c5.4xlarge',
        'r5.large', 'r5.xlarge', 'r5.2xlarge', 'r5.4xlarge',
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

    /* const ec2AutoscaleMinSize = new cdk.CfnParameter(this, 'Ec2AutoscaleMinSize', {
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
    */

    const shouldAttachVolA = new cdk.CfnParameter(this, 'ShouldAttachVolumeA', {
      type: 'String',
      default: 'false',
      allowedValues: ['true', 'false'],
      description: 'Should add EBS Volume',
    });

    const volumeA = new cdk.CfnParameter(this, 'VolumeA', {
      type: 'Number',
      default: 1,
      description: 'Size of EBS Volume /dev/xvdb',
    });

    const shouldAttachVolB = new cdk.CfnParameter(this, 'ShouldAttachVolumeB', {
      type: 'String',
      default: 'false',
      allowedValues: ['true', 'false'],
      description: 'Should add EBS Volume',
    });

    const volumeB = new cdk.CfnParameter(this, 'VolumeB', {
      type: 'Number',
      default: 1,
      description: 'Size of EBS Volume /dev/xvdc',
    });

    const shouldAttachVolC = new cdk.CfnParameter(this, 'ShouldAttachVolumeC', {
      type: 'String',
      default: 'false',
      allowedValues: ['true', 'false'],
      description: 'Should add EBS Volume',
    });

    const volumeC = new cdk.CfnParameter(this, 'VolumeC', {
      type: 'Number',
      default: 1,
      description: 'Size of EBS Volume /dev/xvdd',
    });


    /*
    const attachEFS = new cdk.CfnParameter(this, 'AttachEFS', {
    type: 'String',
    default: 'true',
    allowedValues: ['true', 'false'],
    description: 'Should attach EFS',
    }); */

    // Import existing vpc
    const vpc = ec2.Vpc.fromVpcAttributes(this, 'Vpc', {
      vpcId: vpcId.valueAsString,
      availabilityZones: ['ap-northeast-2a', 'ap-northeast-2b'],
      privateSubnetIds: [ec2Subnet1.valueAsString, ec2Subnet2.valueAsString],
    });

    // Condition
    /* const createASGCondition = new cdk.CfnCondition(this, 'CreateASGCondition', {
      expression: cdk.Fn.conditionEquals(createASG, 'true'),
    }); */

    /* const createInstanceCondition = new cdk.CfnCondition(this, 'CreateInstanceCondition', {
      expression: cdk.Fn.conditionEquals(createASG, 'false'),
    }); */

    const attachVolACondition = new cdk.CfnCondition(this, 'AttachVolACondition', {
      expression: cdk.Fn.conditionEquals(shouldAttachVolA, 'true'),
    });

    const attachVolBCondition = new cdk.CfnCondition(this, 'AttachVolBCondition', {
      expression: cdk.Fn.conditionEquals(shouldAttachVolB, 'true'),
    });

    const attachVolCCondition = new cdk.CfnCondition(this, 'AttachVolCCondition', {
      expression: cdk.Fn.conditionEquals(shouldAttachVolC, 'true'),
    });

    // Create EC2 Security Group
    const ec2SecurityGroup = new ec2.SecurityGroup(this, 'EC2SecurityGroup', {
      securityGroupName: `${projectName.valueAsString}-ec2-${environmentType.valueAsString}-${ec2Name.valueAsString}-sg`,
      vpc,
      allowAllOutbound: true,
    });
    cdk.Tags.of(ec2SecurityGroup).add('Name', `${projectName.valueAsString}-ec2-${environmentType.valueAsString}-${ec2Name.valueAsString}-sg`);

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

    const ec2Instance = new ec2.Instance(this, 'Instance', {
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
      },
      instanceType: new ec2.InstanceType(instanceType.valueAsString),
      machineImage: ec2.MachineImage.latestAmazonLinux({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      propagateTagsToVolumeOnCreation: true,
      securityGroup: ec2SecurityGroup,
      role: ec2Role,
    });
    cdk.Tags.of(ec2Instance).add('Name', `${projectName.valueAsString}-ec2-${environmentType.valueAsString}-${ec2Name.valueAsString}`);
    const cfnEc2 = ec2Instance.node.defaultChild as ec2.CfnInstance;

    // 👇 load user data script
    const userDataScript = readFileSync(path.join(__dirname, './scripts', 'DefaultUserData'), 'utf8');
    ec2Instance.addUserData(userDataScript);

    // Attach EBS Volume
    const cfnVolumeA = new ec2.CfnVolume(this, 'CfnVolumeA', {
      availabilityZone: 'ap-northeast-2a',
      size: volumeA.valueAsNumber,
      volumeType: ec2.EbsDeviceVolumeType.GP3,
    });
    cdk.Tags.of(cfnVolumeA).add('Name', `${projectName.valueAsString}-ebs-${environmentType.valueAsString}-${ec2Name.valueAsString}-01`);
    cfnVolumeA.cfnOptions.condition = attachVolACondition;

    const attachmentVolumeA = new ec2.CfnVolumeAttachment(this, 'AttachmentVolumeA', {
      device: '/dev/xvdb',
      instanceId: cfnEc2.ref,
      volumeId: cfnVolumeA.ref,
    });
    attachmentVolumeA.cfnOptions.condition = attachVolACondition;

    // Attach EBS Volume
    const cfnVolumeB = new ec2.CfnVolume(this, 'CfnVolumeB', {
      availabilityZone: 'ap-northeast-2a',
      size: volumeB.valueAsNumber,
      volumeType: ec2.EbsDeviceVolumeType.GP3,
    });
    cdk.Tags.of(cfnVolumeB).add('Name', `${projectName.valueAsString}-ebs-${environmentType.valueAsString}-${ec2Name.valueAsString}-02`);
    cfnVolumeB.cfnOptions.condition = attachVolBCondition;

    const attachmentVolumeB = new ec2.CfnVolumeAttachment(this, 'AttachmentVolumeB', {
      device: '/dev/xvdc',
      instanceId: cfnEc2.ref,
      volumeId: cfnVolumeB.ref,
    });
    attachmentVolumeB.cfnOptions.condition = attachVolBCondition;

    // Attach EBS Volume
    const cfnVolumeC = new ec2.CfnVolume(this, 'CfnVolumeC', {
      availabilityZone: 'ap-northeast-2a',
      size: volumeC.valueAsNumber,
      volumeType: ec2.EbsDeviceVolumeType.GP3,
    });
    cdk.Tags.of(cfnVolumeC).add('Name', `${projectName.valueAsString}-ebs-${environmentType.valueAsString}-${ec2Name.valueAsString}-03`);
    cfnVolumeC.cfnOptions.condition = attachVolCCondition;

    const attachmentVolumeC = new ec2.CfnVolumeAttachment(this, 'AttachmentVolumeC', {
      device: '/dev/xvdd',
      instanceId: cfnEc2.ref,
      volumeId: cfnVolumeC.ref,
    });
    attachmentVolumeC.cfnOptions.condition = attachVolCCondition;

  }
};