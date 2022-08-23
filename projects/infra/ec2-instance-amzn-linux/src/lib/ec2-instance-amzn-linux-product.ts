import * as cdk from 'aws-cdk-lib';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs/lib/construct';
//import { AutoScalingGroup, CfnAutoScalingGroup } from 'aws-cdk-lib/aws-autoscaling';

export interface Ec2InstanceAmznLinuxProductProps extends cdk.StackProps {

}

export class Ec2InstanceAmznLinuxProduct extends servicecatalog.ProductStack {
  constructor(scope: Construct, id: string, _props: Ec2InstanceAmznLinuxProductProps) {
    super(scope, id);

    this.templateOptions.metadata = {
      'AWS::CloudFormation::Interface': {
        ParameterGroups: [
          {
            Label: {
              default: 'Information of environmentType',
            },
            Parameters: ['ProjectName', 'environmentType', 'Ec2Name'],
          },
          {
            Label: {
              default: 'Information of Network',
            },
            Parameters: ['VpcId', 'Subnet1', 'Subnet2'],
          },
          {
            Label: {
              default: 'Information of Infrastructure',
            },
            Parameters: [
              'LaunchTemplateId',
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

    const blockDevices = new cdk.CfnParameter(this, 'BlockDevices', {
        type: 'List<String>',
        default: '/dev/sdb',
        allowedValues: ['/dev/sdb', '/dev/sdc', '/dev/sdd', '/dev/sde']
    }); */


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

    const addEBS = new cdk.CfnParameter(this, 'AttachEBSVolume', {
      type: 'String',
      default: 'true',
      allowedValues: ['true', 'false'],
      description: 'Should add EBS Volume',
    });

    const ebsVolumeA = new cdk.CfnParameter(this, 'EBSVolumeA', {
      type: 'Number',
      default: 1,
      description: 'Size of EBS Volume /dev/sdb',
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

    const attachEBSCondition = new cdk.CfnCondition(this, 'AddEBSCondition', {
      expression: cdk.Fn.conditionEquals(addEBS, 'true'),
    });

    const noAttachEBSCondition = new cdk.CfnCondition(this, 'noAddEBSCondition', {
      expression: cdk.Fn.conditionEquals(addEBS, 'false'),
    });
    /*
    const attachEFSCondition = new cdk.CfnCondition(this, 'attachEFSCondition', {
        expression: cdk.Fn.conditionEquals(attachEFS, 'true'),
    }); */


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

    /* const efsUserData = UserData.forLinux();
      efsUserData.addCommands(
        'yum install -y amazon-efs-utils', // Ubuntu: apt-get -y install amazon-efs-utils
        'yum install -y nfs-utils', // Ubuntu: apt-get -y install nfs-common
        'file_system_id_1=' + fileSystem.fileSystemId,
        'access_point_id=' + accessPoint.accessPointId,
        'efs_mount_point_1=' + accessPointPath.valueAsString,
        'mkdir -p "${efs_mount_point_1}"',
        'echo "${file_system_id_1} ${efs_mount_point_1} efs _netdev,noresvport,tls,accesspoint=${access_point_id} 0 0" >> /etc/fstab',
        'mount -a');

      const userData = UserData.forLinux();
      userData.addCommands(
        'ebs_mount_point_1=' + ebsMountPoint.valueAsString,
        'if [ -e /dev/xvdf ]; then',
        'if [ ! -e ${ebs_mount_point_1} ]; then',
        'mkfs.ext4 /dev/xvdf',
        'mkdir -p ${ebs_mount_point_1}',
        'echo "/dev/xvdf ${ebs_mount_point_1} ext4 defaults,noatime 1 1" >> /etc/fstab',
        'fi',
        'fi',
      );


      const multipartUserData = new MultipartUserData();

      multipartUserData.addPart(MultipartBody.fromUserData(userData));
      multipartUserData.addPart(MultipartBody.fromUserData(efsUserData));


      const cfnEC2 = new ec2.CfnInstance(this, 'EC2Instance', {
        //launchTemplate: { launchTemplateId: launchTemplate.launchTemplateId, version: '1' },
        launchTemplate: {
          launchTemplateId: launchTemplateId.valueAsString, version: '1'
        },
        subnetId: ec2Subnet1.valueAsString,
      });
      cfnEC2.cfnOptions.condition = createInstanceCondition; */

    // CloudFormation Init
    const handle = new ec2.InitServiceRestartHandle();
    const configSets = ec2.CloudFormationInit.fromConfigSets({
      configSets: {
        default: [
          'updateOS',
          'package',
          'usermanagement',
          'ebsautomount',
          //'setupCfnHup',
          'createStack',
          'testCfnHup',
          //'efsautomount',
        ],
      },
      configs: {
        updateOS: new ec2.InitConfig([
          ec2.InitCommand.shellCommand('sudo yum update -y'),
        ]),
        package: new ec2.InitConfig([
          ec2.InitPackage.yum('awscli'),
          ec2.InitPackage.yum('amazon-efs-utils'),
          ec2.InitPackage.yum('nfs-utils'),
        ]),
        usermanagement: new ec2.InitConfig([
          ec2.InitGroup.fromName('appGroup'),
          ec2.InitUser.fromName('appUser', { homeDir: '/home/appUser', groups: ['appGroup'] }),
        ]),
        ebsautomount: new ec2.InitConfig([
          ec2.InitFile.fromString('/etc/cfn/ebs-mount.sh',
            [
              '#!/bin/bash\n',
              'EBS_DEVICE=$(lsblk | grep -e disk | awk \'{sub("G","",$4)} {if ($4+0 > 4) print $1}\')\n',
              'for i in $EBS_DEVICE; do if [ $i != "nvme0n1" -a $i != "xvda" ]; then mkfs.xfs /dev/$i; fi done\n',
              'for i in $EBS_DEVICE; do if [ $i != "nvme0n1" -a $i != "xvda" ]; then j = j + 1; mkdir -p /mnt/$i; fi done\n',
              'for i in $EBS_DEVICE; do if [ $i != "nvme0n1" -a $i != "xvda" ]; then sudo mount /dev/$i /mnt/$i; fi done\n',
              'for i in $EBS_DEVICE; do if [ $i != "nvme0n1" -a $i != "xvda" ]; then  echo "$(blkid -o export /dev/$i | grep ^UUID=) /mnt/$i xfs defaults,noatime" | tee -a /etc/fstab; fi done',
            ].join(''),
          ),
          ec2.InitCommand.shellCommand('chmod +x /etc/cfn/ebs-mount.sh'),
          ec2.InitCommand.shellCommand('cd /tmp'),
          ec2.InitCommand.shellCommand('/etc/cfn/ebs-mount.sh'),
          ec2.InitCommand.shellCommand('mount -a'),
        ]),
        setupCfnHup: new ec2.InitConfig([
          ec2.InitFile.fromString('/etc/cfn/cfn-hup.conf',
            [
              '[main]\n',
              `stack=${cdk.Stack.of(this).stackId}\n`,
              `region=${cdk.Stack.of(this).region}\n`,
              'interval=10\n',
              'verbose=true',
            ].join(''),
            { serviceRestartHandles: [handle] },
          ),
          ec2.InitFile.fromString('/etc/cfn/hooks.d/cfn-auto-reloader.conf',
            [
              '[cfn-auto-reloader-hook]\n',
              'triggers=post.update\n',
              // ToDo: ResourceId
              //`path=Resources.${ec2Instance.node.id}.Metadata.AWS::CloudFormation::Init\n`,
              'action=/opt/aws/bin/cfn-init -v ',
              `--stack ${cdk.Arn.split(cdk.Stack.of(this).stackId, cdk.ArnFormat.SLASH_RESOURCE_NAME).resourceName} `,
              '--resource $LogicalResourceId ',
              `--region ${cdk.Stack.of(this).region} `,
              '--configsets update\n',
            ].join(''),
            { serviceRestartHandles: [handle] },
          ),
          ec2.InitService.enable('cfn-hup', {
            enabled: true,
            ensureRunning: true,
            serviceRestartHandle: handle,
          }),
        ]),
        createStack: new ec2.InitConfig([
          // Create a JSON file from tokens (can also create other files)
          ec2.InitFile.fromString('/etc/cfn/cfn-hup.conf',
            [
              '[main]\n',
              `stack=${cdk.Arn.split(cdk.Stack.of(this).stackId, cdk.ArnFormat.SLASH_RESOURCE_NAME).resourceName}\n`,
              `region=${cdk.Stack.of(this).region}\n`,
              'interval=10\n',
              'verbose=true',
            ].join(''),
            { serviceRestartHandles: [handle] },
          ),
        ]),
        testCfnHup: new ec2.InitConfig([
          ec2.InitCommand.shellCommand('echo "+*+*+*+CFN-HUP+*+*+*+Working Well++++++"'),
        ]),

      },
    });


    /*
    const ec2Instance = new ec2.Instance(this, 'Instance', {
      vpc,
      availabilityZone: 'ap-northeast-2a',
      vpcSubnets: vpc.selectSubnets({
        availabilityZones: ['ap-northeast-2a'],
        subnets: [
            ec2.Subnet.fromSubnetId(this, 'ASGSubnet1', ec2Subnet1.valueAsString),
        ]
      }),
      instanceType: new ec2.InstanceType(instanceType.valueAsString),
      machineImage: ec2.MachineImage.latestAmazonLinux({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      //machineImage: ec2.MachineImage.fromSsmParameter('/aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-x86_64-gp2'),
      //machineImage: new ec2.GenericSSMParameterImage(cdk.Lazy.string({ produce:() => machineImage.valueAsString }), ec2.OperatingSystemType.LINUX ),
      init: configSets,
      initOptions: {
        timeout: cdk.Duration.minutes(10),
      },
      securityGroup: ec2SecurityGroup,
      role: ec2Role,
    });
    const cfnEc2 = ec2Instance.node.defaultChild as ec2.CfnInstance;
    cfnEc2.cfnOptions.condition = createInstanceCondition;
    */


    /************************* Add EBS Volume *********************/
    const ec2Instance = new autoscaling.AutoScalingGroup(this, 'ASGWithEBS', {
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
          ec2.Subnet.fromSubnetId(this, 'ASGSubnetA', ec2Subnet1.valueAsString),
          ec2.Subnet.fromSubnetId(this, 'ASGSubnetC', ec2Subnet2.valueAsString),
        ],
      },
      securityGroup: ec2SecurityGroup,
      signals: autoscaling.Signals.waitForAll(),
      blockDevices: [
        {
          deviceName: '/dev/sdb',
          volume: autoscaling.BlockDeviceVolume.ebs(ebsVolumeA.valueAsNumber,
            { volumeType: autoscaling.EbsDeviceVolumeType.GP3 }),
        },
      ],
      init: configSets,
    });

    //const ec2InstanceLogicalId = (ec2Instance.node.defaultChild as ec2.CfnInstance).logicalId;

    /* const setupCfnHup = new ec2.InitConfig([
      ec2.InitFile.fromString('/etc/cfn/cfn-hup.conf',
        [
          '[main]\n',
          'stack=${AWS::StackName}\n',
          `region=${cdk.Stack.of(this).region}\n`,
          'interval=2\n',
          'verbose=true',
        ].join(''),
        { serviceRestartHandles: [handle] },
      ),
      ec2.InitFile.fromString('/etc/cfn/hooks.d/cfn-auto-reloader.conf',
        [
          '[cfn-auto-reloader-hook]\n',
          'triggers=post.update\n',
          `path=Resources.${ec2InstanceLogicalId}.Metadata.AWS::CloudFormation::Init\n`,
          'action=/opt/aws/bin/cfn-init -v ',
          '--stack ${AWS::StackName} ',
          `--resource ${ec2InstanceLogicalId} `,
          `--region ${cdk.Stack.of(this).region} `,
          '--configsets update\n',
        ].join(''),
        { serviceRestartHandles: [handle] },
      ),
      ec2.InitService.enable('cfn-hup', {
        enabled: true,
        ensureRunning: true,
        serviceRestartHandle: handle,
      }),
    ]);


    configSetsA.addConfig('setupCfnHup', setupCfnHup);
    configSetsA.addConfigSet('default', ['setupCfnHup']);

    ec2Instance.applyCloudFormationInit(configSetsA); */

    // UserData
    /* let userData = ec2.UserData.forLinux();
    userData.addCommands(
      `pid=aws servicecatalog search-provisioned-products --filters "SearchQuery"=${projectName.valueAsString}-${environmentType.valueAsString}-${ec2Name.valueAsString}-product | grep -w "Id" | awk '{print $2}'`,
      `sed -i -e "s/LOGICAL_RESOURCE_ID/SC-${AWS::ACCOUNT_ID}-${pid}/g" /etc/cfn/hooks.d/cfn-auto-reloader.conf`,
      'systemctl start cfn-hup.service',
    );
    ec2Instance.addUserData(userData.render()); */

    const cfnInstace = ec2Instance.node.defaultChild as autoscaling.CfnAutoScalingGroup;
    cfnInstace.cfnOptions.condition = attachEBSCondition;


    /************************* No Add EBS Volume *********************/
    const autoscale = new autoscaling.AutoScalingGroup(this, 'ASG', {
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
          ec2.Subnet.fromSubnetId(this, 'ASGSubneta', ec2Subnet1.valueAsString),
          ec2.Subnet.fromSubnetId(this, 'ASGSubnetc', ec2Subnet2.valueAsString),
        ],
      },
      securityGroup: ec2SecurityGroup,
      signals: autoscaling.Signals.waitForAll(),
      blockDevices: undefined,
      init: configSets,
    });

    const cfnAutoscale = autoscale.node.defaultChild as autoscaling.CfnAutoScalingGroup;
    cfnAutoscale.cfnOptions.condition = noAttachEBSCondition;
  }
};