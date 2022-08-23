import * as cdk from 'aws-cdk-lib';
import { CfnCondition, CfnParameter, Fn } from 'aws-cdk-lib';
import { AutoScalingGroup, CfnAutoScalingGroup } from 'aws-cdk-lib/aws-autoscaling';
import { BlockDeviceVolume, CfnInstance, EbsDeviceVolumeType, InstanceType, LaunchTemplate, MachineImage, Peer, Port, SecurityGroup, Subnet, UserData, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Effect, ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
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
              default: 'Information of Infrastructure',
            },
            Parameters: [
              'InstacneType',
              'EC2InstanceKeyName',
              'CreateASG',
              'Ec2AutoscaleMinSize',
              'Ec2AutoscaleMaxSize',
              'Ec2AutoscaleDesiredCapacity',
              'EBSVolumeA',
              'EBSMountPoint',
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

    const staticIpForSSH = new CfnParameter(this, 'StackIpForSSH', {
      type: 'String',
      default: '106.73.25.32/32',
      description: 'Static IP for SSH access',
    });

    const instanceType = new CfnParameter(this, 'InstacneType', {
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

    const ec2InstanceKeyName = new CfnParameter(this, 'EC2InstanceKeyName', {
      type: 'AWS::EC2::KeyPair::KeyName',
      default: 'SSHKeyName',
      description: 'EC2 SSH KEY',
    });

    /* const ec22InstanceTagName = new CfnParameter(this, 'EC2InstanceTagName', {
        type: 'String',
        default: 'project-component-stage-appname',
        description: 'EC2 Tag Name',
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

    const ebsMountPoint = new CfnParameter(this, 'EBSMountPoint', {
      type: 'String',
      description: 'extention EBS Mount Point',
      default: '/data',
    });

    const ebsVolumeA = new CfnParameter(this, 'EBSVolumeA', {
      type: 'Number',
      default: 10,
      description: 'Size of EBS Volume /dev/xvdf.',
    });

    const createASGCondition = new CfnCondition(this, 'CreateASGCondition', {
      expression: Fn.conditionEquals(createASG, 'true'),
    });

    const noCreateASGCondition = new CfnCondition(this, 'NoCreateASGCondition', {
      expression: Fn.conditionEquals(createASG, 'false'),
    });
    const vpc = Vpc.fromVpcAttributes(this, 'Vpc', {
      vpcId: vpcId.valueAsString,
      availabilityZones: ['ap-northeast-2a', 'ap-northeast-2c'],
    });

    const ec2SecurityGroup = new SecurityGroup(this, 'EC2SecurityGroup', {
      securityGroupName: `${projectName.valueAsString}-${environment.valueAsString}-${serverName.valueAsString}-sg`,
      vpc,
      allowAllOutbound: true,
    });

    ec2SecurityGroup.addIngressRule(Peer.ipv4(staticIpForSSH.valueAsString), Port.tcp(22));

    const ec2Role = new Role(this, 'EC2Role', {
      roleName: `${projectName.valueAsString}-ec2-${environment.valueAsString}-${serverName.valueAsString}-role`,
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      description: 'IAM Role for EC2',
    });

    ec2Role.addManagedPolicy(
      ManagedPolicy.fromManagedPolicyArn(this, 'AmazonSSMManagedInstanceCore', 'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore'));

    ec2Role.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['s3:List*'],
      resources: ['arn:aws:s3:::jingood2-servicecatalog-assets'],
    }));

    ec2Role.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['s3:*Object'],
      resources: ['arn:aws:s3:::jingood2-servicecatalog-assets/*'],
    }));

    ec2Role.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['logs:*'],
      resources: ['arn:aws:logs:*:*:*'],
    }));

    const userData = UserData.forLinux();

    userData.addCommands(
      'ebs_mount_point_1=' + ebsMountPoint.valueAsString,
      'if [ -e /dev/xvdf ]; then',
      'if [ ! -e ${ebs_mount_point_1} ]; then',
      'mkfs.ext4 /dev/xvdf',
      'mkdir -p ${ebs_mount_point_1}',
      'echo "/dev/xvdf ${ebs_mount_point_1} ext4 defaults,noatime 1 1" >> /etc/fstab',
      'mount -a',
      'fi',
      'fi',
    );

    const launchTemplate = new LaunchTemplate(this, 'EC2LaunchTemplate', {
      launchTemplateName: `${projectName.valueAsString}-${serverName.valueAsString}-launchtemplate`,
      instanceType: new InstanceType(instanceType.valueAsString),
      //machineImage: MachineImage.fromSsmParameter(Lazy.string({ produce:() => amiId.valueAsString })),
      machineImage: MachineImage.latestAmazonLinux(),
      role: ec2Role,
      keyName: ec2InstanceKeyName.valueAsString,
      securityGroup: ec2SecurityGroup,
      userData: userData,
      blockDevices: [
        { deviceName: '/dev/xvdf', volume: BlockDeviceVolume.ebs(ebsVolumeA.valueAsNumber, { volumeType: EbsDeviceVolumeType.GENERAL_PURPOSE_SSD_GP3 }) },
      ],
    });


    // Autoscaling Group
    const autoscale = new AutoScalingGroup(this, 'ASG', {
      autoScalingGroupName: `${projectName.valueAsString}-${environment.valueAsString}-${serverName.valueAsString}-asg`,
      vpc,
      minCapacity: ec2AutoscaleMinSize.valueAsNumber,
      maxCapacity: ec2AutoscaleMaxSize.valueAsNumber,
      desiredCapacity: ec2AutoscaleDesiredCapacity.valueAsNumber,
      vpcSubnets: {
        subnets: [
          Subnet.fromSubnetId(this, 'ASGSubnet1', ec2Subnet1.valueAsString),
          Subnet.fromSubnetId(this, 'ASGSubnet2', ec2Subnet2.valueAsString),
        ],
      },
      launchTemplate: launchTemplate,
    });
    const cfnAutoScaling = autoscale.node.defaultChild as CfnAutoScalingGroup;
    cfnAutoScaling.cfnOptions.condition = createASGCondition;

    const instance = new CfnInstance(this, 'Ec2Instance', {
      launchTemplate: { launchTemplateId: launchTemplate.launchTemplateId, version: launchTemplate.latestVersionNumber },
      subnetId: ec2Subnet1.valueAsString,
    });

    instance.addOverride()

    instance.cfnOptions.condition = noCreateASGCondition;

  }
}