import * as cdk from 'aws-cdk-lib';
import { CfnCondition, CfnParameter, Fn } from 'aws-cdk-lib';
import { AutoScalingGroup, CfnAutoScalingGroup } from 'aws-cdk-lib/aws-autoscaling';
import { BlockDeviceVolume, EbsDeviceVolumeType, InstanceType, LaunchTemplate, MachineImage, MultipartBody, MultipartUserData, Peer, Port, SecurityGroup, Subnet, UserData, Vpc } from 'aws-cdk-lib/aws-ec2';
import * as efs from 'aws-cdk-lib/aws-efs';
import { Effect, ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import * as iam from 'aws-cdk-lib/aws-iam';
//import { Bucket } from 'aws-cdk-lib/aws-s3';
import { ProductStack } from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs/lib/construct';

export interface EFSWithAutomountToEC2Props extends cdk.StackProps {

}

export class EFSWithAutomountToEC2 extends ProductStack {
  constructor(scope: Construct, id: string, _props: EFSWithAutomountToEC2Props) {
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
              'Ec2AutoscaleMinSize',
              'Ec2AutoscaleMaxSize',
              'Ec2AutoscaleDesiredCapacity',
              'EBSVolumeA',
              'CreateASG',
              'EFSAccessPointPath',
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

    const accessPointPath = new CfnParameter(this, 'EFSAccessPointPath', {
      type: 'String',
      description: 'EFS Access Point Path',
      default: '/mnt/accesspoint',
    });

    const ebsMountPoint = new CfnParameter(this, 'EBSMountPoint', {
      type: 'String',
      description: 'extention EBS Mount Point',
      default: '/data',
    });
    /* const amiId = new CfnParameter(this, 'AMIId', {
        type: 'AWS::SSM::Parameter::Value<AWS::EC2::Image::Id>',
        default: '/aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-x86_64-gp2',
      }); */

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

    const ebsVolumeA = new CfnParameter(this, 'EBSVolumeA', {
      type: 'Number',
      default: 10,
      description: 'Size of EBS Volume /dev/xvdf.',
    });

    const createASG = new CfnParameter(this, 'CreateASG', {
      type: 'String',
      default: 'true',
      allowedValues: ['true', 'false'],
      description: 'Should create Autoscaling Group',
    });

    /* const createEFS = new CfnParameter(this, 'CreateAttachEFS', {
      type: 'String',
      default: 'true',
      allowedValues: ['true', 'false'],
      description: 'Should attach EFS',
    }); */

    const createASGCondition = new CfnCondition(this, 'CreateASGCondition', {
      expression: Fn.conditionEquals(createASG, 'true'),
    });

    /* const createEFSCondition = new CfnCondition(this, 'CreateEFSCondition', {
      expression: Fn.conditionEquals(createEFS, 'true'),
    }); */

    // mandatory security group
    // custom security group


    // Import existing vpc
    const vpc = Vpc.fromVpcAttributes(this, 'Vpc', {
      vpcId: vpcId.valueAsString,
      availabilityZones: ['ap-northeast-2a', 'ap-northeast-2c'],
    });

    // Create EC2 Security Group
    const ec2SecurityGroup = new SecurityGroup(this, 'EC2SecurityGroup', {
      securityGroupName: `${projectName.valueAsString}-${environment.valueAsString}-${serverName.valueAsString}-sg`,
      vpc,
      allowAllOutbound: true,
    });
    ec2SecurityGroup.addIngressRule(Peer.ipv4(staticIpForSSH.valueAsString), Port.tcp(22));

    // Create IAM Role For Instance
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

    // Permission S3 for UserData Script
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


    // Security Group for EFS Filesystem
    const efsSecurityGroup = new SecurityGroup(this, 'EFSSecurityGroup', {
      securityGroupName: `${projectName.valueAsString}-${environment.valueAsString}-${serverName.valueAsString}-efs`,
      vpc,
      allowAllOutbound: true,
    });
    efsSecurityGroup.connections.allowFromAnyIpv4(Port.tcp(2049), 'Allow EFS Filesystem');

    // Create EFS FileSystem
    const fileSystem = new efs.FileSystem(this, 'MyEfsFileSystem', {
      fileSystemName: `${projectName.valueAsString}-${environment.valueAsString}-${serverName.valueAsString}-efs`,
      vpc,
      vpcSubnets: {
        subnets: [
          Subnet.fromSubnetId(this, 'EFSSubnet1', ec2Subnet1.valueAsString),
          Subnet.fromSubnetId(this, 'EFSSubnet2', ec2Subnet2.valueAsString),
        ],

      },
      lifecyclePolicy: efs.LifecyclePolicy.AFTER_14_DAYS, // files are not transitioned to infrequent access (IA) storage by default
      performanceMode: efs.PerformanceMode.GENERAL_PURPOSE, // default
      outOfInfrequentAccessPolicy: efs.OutOfInfrequentAccessPolicy.AFTER_1_ACCESS, // files are not transitioned back from (infrequent access) IA to primary storage by default
      securityGroup: efsSecurityGroup,
    });

    // Create Access Point from the filesystem
    const accessPoint = fileSystem.addAccessPoint('AccessPoint', {
      // set /export/lambda as the root of the access point
      path: '/mnt/accesspoint',
      // as /export/lambda does not exist in a new efs filesystem, the efs will create the directory with the following createAcl
      createAcl: {
        ownerUid: '500',
        ownerGid: '500',
        permissions: '0755',
      },
      // enforce the POSIX identity so lambda function will access with this identity
      posixUser: {
        uid: '500',
        gid: '500',
      },
    });

    // EFS Permission
    const role = new iam.Role(this, 'Role', {
      assumedBy: new iam.AnyPrincipal(),
    });
    fileSystem.grant(role, 'elasticfilesystem:ClientWrite');

    // Mount FileSystem on EC2
    /* efsUserData.addCommands(
      'yum install -y amazon-efs-utils', // Ubuntu: apt-get -y install amazon-efs-utils
      'yum install -y nfs-utils', // Ubuntu: apt-get -y install nfs-common
      'file_system_id_1=' + fileSystem.fileSystemId,
      'efs_mount_point_1=/data',
      'mkdir -p "${efs_mount_point_1}"',
      'test -f "/sbin/mount.efs" && echo "${file_system_id_1}:/ ${efs_mount_point_1} efs _netdev,tls 0 0" >> /etc/fstab || ' +
      'echo "${file_system_id_1}.efs.' + Stack.of(this).region + '.amazonaws.com:/ ${efs_mount_point_1} nfs4 nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2,noresvport,_netdev 0 0" >> /etc/fstab',
      'mount -a -t efs,nfs4 defaults');
    */

    const userData = UserData.forLinux();

    /* const localPath = userData.addS3DownloadCommand({
      bucket: Bucket.fromBucketName(this, 'S3Bucket', 'jingood2-servicecatalog-assets'),
      bucketKey: 'launchtemplate/configure.sh',
      region: 'ap-northeast-2', // Optional
    });
    userData.addExecuteFileCommand({
      filePath: localPath,
      arguments: '--verbose -y',
    });
 */
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

    const efsUserData = UserData.forLinux();

    efsUserData.addCommands(
      'yum install -y amazon-efs-utils', // Ubuntu: apt-get -y install amazon-efs-utils
      'yum install -y nfs-utils', // Ubuntu: apt-get -y install nfs-common
      'file_system_id_1=' + fileSystem.fileSystemId,
      'access_point_id=' + accessPoint.accessPointId,
      'efs_mount_point_1=' + accessPointPath.valueAsString,
      'mkdir -p "${efs_mount_point_1}"',
      'echo "${file_system_id_1} ${efs_mount_point_1} efs _netdev,noresvport,tls,accesspoint=${access_point_id} 0 0" >> /etc/fstab',
      'mount -a');

    const multipartUserData = new MultipartUserData();

    multipartUserData.addPart(MultipartBody.fromUserData(userData));
    multipartUserData.addPart(MultipartBody.fromUserData(efsUserData));

    // Create LaunchTemplate
    const launchTemplate = new LaunchTemplate(this, 'EC2LaunchTemplate', {
      launchTemplateName: `${projectName.valueAsString}-${serverName.valueAsString}-launchtemplate`,
      instanceType: new InstanceType(instanceType.valueAsString),
      machineImage: MachineImage.latestAmazonLinux(),
      role: ec2Role,
      keyName: ec2InstanceKeyName.valueAsString,
      securityGroup: ec2SecurityGroup,
      userData: multipartUserData,
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

  }
}