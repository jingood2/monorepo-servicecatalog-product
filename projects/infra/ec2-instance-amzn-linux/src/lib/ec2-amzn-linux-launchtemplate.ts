import * as cdk from 'aws-cdk-lib';
import { CfnCondition, CfnParameter, Fn } from 'aws-cdk-lib';
import { AutoScalingGroup, CfnAutoScalingGroup } from 'aws-cdk-lib/aws-autoscaling';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
//import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
//import { Effect, ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
//import * as s3 from 'aws-cdk-lib/aws-s3';
import { ProductStack } from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs/lib/construct';

export interface EC2LaunchTemplateProps extends cdk.StackProps {

}

export class EC2ASGWithLaunchTemplate extends ProductStack {
  constructor(scope: Construct, id: string, _props: EC2LaunchTemplateProps) {
    super(scope, id );

    this.templateOptions.metadata = {
      'AWS::CloudFormation::Interface': {
        ParameterGroups: [
          {
            Label: {
              default: 'Information of Environment',
            },
            Parameters: ['ProjectName', 'Environment', 'ServerName'],
          },
          {
            Label: {
              default: 'Information of Network',
            },
            Parameters: ['VpcId', 'Subnet1', 'Subnet2', 'AllowIPForSSH'],
          },
          {
            Label: {
              default: 'EC2 AutoscalingGroup Information',
            },
            Parameters: [
              'LaunchTemplateId',
              'LaunchTemplateVersionNumber',
              'InstacneType',
              'CreateASG',
              'EC2InstanceKeyName',
              'Ec2AutoscaleMinSize',
              'Ec2AutoscaleMaxSize',
              'Ec2AutoscaleDesiredCapacity',
              'EBSVolumeA',
            ],
          },

        ],
      },
    };

    const projectName = new CfnParameter(this, 'ProjectName', {
      type: 'String',
      default: 'projectName',
      description: 'Project Name',
    });

    const environment= new CfnParameter(this, 'Environment', {
      type: 'String',
      default: 'dev',
      allowedValues: ['shared', 'dev', 'stage', 'prod'],
      description: 'Environment Name',
    });

    const serverName = new CfnParameter(this, 'ServerName', {
      type: 'String',
      description: 'EC2 Server Name',
    });

    const vpcId = new CfnParameter(this, 'VpcId', {
      type: 'AWS::EC2::VPC::Id',
      default: 'vpc-10544f72',
      description: 'VpcId Where you deploy ec2 on',
    });

    const ec2Subnet1 = new CfnParameter(this, 'Subnet1', {
      type: 'AWS::EC2::Subnet::Id',
      description: 'EC2 subnet 1',
    });

    const ec2Subnet2 = new CfnParameter(this, 'Subnet2', {
      type: 'AWS::EC2::Subnet::Id',
      description: 'EC2 subnet 2',
    });

    /* const staticIpForSSH = new CfnParameter(this, 'StackIpForSSH', {
      type: 'String',
      default: '106.73.25.32/32',
      description: 'Static IP for SSH access',
    });
    */
    const launchTemplateId = new CfnParameter(this, 'LaunchTemplateId', {
      type: 'String',
      default: 'lt-123456a306cb9b66f',
      description: 'EC2 LaunchTemplate Id',
    });

    const launchTemplateVersionNumber = new CfnParameter(this, 'LaunchTemplateVersionNumber', {
      type: 'String',
      default: '$latest',
      description: 'LaunchTemplate VerionNumber',
    });

    /*
    const ec2InstanceKeyName = new CfnParameter(this, 'EC2InstanceKeyName', {
      type: 'AWS::EC2::KeyPair::KeyName',
      default: 'SSHKeyName',
      description: 'EC2 SSH KEY',
    }); */

    const ec2AutoscaleMinSize = new CfnParameter(this, 'Ec2AutoscaleMinSize', {
      type: 'Number',
      default: 1,
      description: 'AutoScalingGroup MinSize',
    });

    const ec2AutoscaleMaxSize = new CfnParameter(this, 'Ec2AutoscaleMaxSize', {
      type: 'Number',
      default: 1,
      description: 'AutoScalingGroup MaxSize',
    });

    const ec2AutoscaleDesiredCapacity = new CfnParameter(this, 'Ec2AutoscaleDesiredCapacity', {
      type: 'Number',
      default: 1,
      description: 'AutoScalingGroup DesiredCapacity',
    });

    const createASG = new CfnParameter(this, 'CreateASG', {
      type: 'String',
      default: 'true',
      allowedValues: ['true', 'false'],
      description: 'Should create Autoscaling Group',
    });

    /* const ebsRootVolumeA = new CfnParameter(this, 'EBSVolumeA', {
      type: 'Number',
      default: 20,
      description: 'Size of EBS Volume /dev/xvda.',
    }); */

    const createASGCondition = new CfnCondition(this, 'CreateASGCondition', {
      expression: Fn.conditionEquals(createASG, 'true'),
    });

    const noCreateASGCondition = new CfnCondition(this, 'NoCreateASGCondition', {
      expression: Fn.conditionEquals(createASG, 'false'),
    });
    const vpc = ec2.Vpc.fromVpcAttributes(this, 'Vpc', {
      vpcId: vpcId.valueAsString,
      availabilityZones: ['ap-northeast-2a', 'ap-northeast-2c'],
    });

    /* const ec2SecurityGroup = new ec2.SecurityGroup(this, 'EC2SecurityGroup', {
      securityGroupName: `${projectName.valueAsString}-${environment.valueAsString}-${serverName.valueAsString}-sg`,
      vpc,
      allowAllOutbound: true,
    });

    const ec2Role = new iam.Role(this, 'EC2Role', {
      roleName: `${projectName.valueAsString}-ec2-${environment.valueAsString}-${serverName.valueAsString}-role`,
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      description: 'IAM Role for EC2',
    });

    ec2Role.addManagedPolicy(
      iam.ManagedPolicy.fromManagedPolicyArn(this, 'AmazonSSMManagedInstanceCore', 'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore'));

    ec2Role.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['s3:List*'],
      resources: ['arn:aws:s3:::jingood2-servicecatalog-assets'],
    }));

    ec2Role.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['s3:*Object'],
      resources: ['arn:aws:s3:::jingood2-servicecatalog-assets/*'],
    }));

    ec2Role.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['logs:*'],
      resources: ['arn:aws:logs:*:*:*'],
    })); */

    let userData = ec2.UserData.forLinux();
    userData.addS3DownloadCommand({
      bucket: s3.Bucket.fromBucketName(this, 'S3Bucket', 'jingood2-servicecatalog-assets'),
      bucketKey: 'userdata/DefaultUserData2',
      region: 'ap-northeast-2', // Optional
    });

    /*
    const launchTemplate = new ec2.LaunchTemplate(this, 'EC2LaunchTemplate', {
      launchTemplateName: `${projectName.valueAsString}-${serverName.valueAsString}-launchtemplate`,
      instanceType: new ec2.InstanceType(instanceType.valueAsString),
      //machineImage: MachineImage.fromSsmParameter(Lazy.string({ produce:() => amiId.valueAsString })),
      machineImage: ec2.MachineImage.latestAmazonLinux(),
      role: ec2Role,
      keyName: ec2InstanceKeyName.valueAsString,
      securityGroup: ec2SecurityGroup,
      userData: userData,
      blockDevices: [
        { deviceName: '/dev/xvda', volume: ec2.BlockDeviceVolume.ebs(ebsRootVolumeA.valueAsNumber, { volumeType: ec2.EbsDeviceVolumeType.GENERAL_PURPOSE_SSD_GP3 }) },
      ],
    }); */

    // Autoscaling Group
    const autoscale = new AutoScalingGroup(this, 'ASG', {
      autoScalingGroupName: `${projectName.valueAsString}-${environment.valueAsString}-${serverName.valueAsString}-asg`,
      vpc,
      minCapacity: ec2AutoscaleMinSize.valueAsNumber,
      maxCapacity: ec2AutoscaleMaxSize.valueAsNumber,
      desiredCapacity: ec2AutoscaleDesiredCapacity.valueAsNumber,
      vpcSubnets: {
        subnets: [
          ec2.Subnet.fromSubnetId(this, 'ASGSubnet1', ec2Subnet1.valueAsString),
          ec2.Subnet.fromSubnetId(this, 'ASGSubnet2', ec2Subnet2.valueAsString),
        ],
      },
      launchTemplate: ec2.LaunchTemplate.fromLaunchTemplateAttributes(this, 'ASGLaunchTemplate', { launchTemplateId: launchTemplateId.valueAsString, versionNumber: launchTemplateVersionNumber.valueAsString }),

    });
    const cfnAutoScaling = autoscale.node.defaultChild as CfnAutoScalingGroup;
    cfnAutoScaling.cfnOptions.condition = createASGCondition;

    const instance = new ec2.CfnInstance(this, 'Ec2Instance', {
      launchTemplate: { launchTemplateId: launchTemplateId.valueAsString, version: launchTemplateVersionNumber.valueAsString},
      subnetId: ec2Subnet1.valueAsString,
    });
    instance.cfnOptions.condition = noCreateASGCondition;

  }
}