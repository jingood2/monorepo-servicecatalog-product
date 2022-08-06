import * as cdk from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as efs from 'aws-cdk-lib/aws-efs';
import { Construct } from 'constructs/lib/construct';
import { CfnParameter } from 'aws-cdk-lib';

export interface AttachEFSMountProps extends cdk.StackProps {

}

export class AttachEFSMount extends servicecatalog.ProductStack{
  constructor(scope: Construct, id: string ) {
    super(scope, id );

    this.templateOptions.metadata = {
        'AWS::CloudFormation::Interface': {
          ParameterGroups: [
            {
              Label: {
                default: 'Information of environmentType',
              },
              Parameters: ['ProjectName', 'environmentType', 'EFSName'],
            },
            {
              Label: {
                default: 'Information of Network',
              },
              Parameters: ['VpcId', 'Subnet1', 'Subnet2' ],
            },
            {
              Label: {
                default: 'Information of Infrastructure',
              },
              Parameters: [
                'PosixUserGIds',
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

    const environmentType= new CfnParameter(this, 'environmentType', {
    type: 'String',
    default: 'dev',
    allowedValues: ['shared', 'dev', 'stage', 'prod'],
    description: 'environmentType Name',
    });

    const efsName = new CfnParameter(this, 'EfsName', {
    type: 'String',
    description: 'describe EFS Name',
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

    /* const AclPosixUserGids = new CfnParameter(this, 'PosixUserGIds', {
        type: 'List<String>',
        description: 'ACL PosixUser Gids',
        default: ['501']
    }); */

    // Import existing vpc
    const vpc = ec2.Vpc.fromVpcAttributes(this, 'Vpc', {
        vpcId: vpcId.valueAsString,
        availabilityZones: ['ap-northeast-2a', 'ap-northeast-2c'],
      });

    // Security Group for EFS Filesystem
    const efsSecurityGroup = new ec2.SecurityGroup(this, 'EFSSecurityGroup', {
      securityGroupName: `${projectName.valueAsString}-${environmentType.valueAsString}-${efsName.valueAsString}-efs`,
      vpc,
      allowAllOutbound: true,
    });
    efsSecurityGroup.connections.allowFromAnyIpv4(ec2.Port.tcp(2049), 'Allow EFS Filesystem');

    // Create EFS FileSystem
    const fileSystem = new efs.FileSystem(this, 'MyEfsFileSystem', {
      vpc,
      vpcSubnets: {
        subnets: [
          ec2.Subnet.fromSubnetId(this, 'EFSSubnet1', ec2Subnet1.valueAsString),
          ec2.Subnet.fromSubnetId(this, 'EFSSubnet2', ec2Subnet2.valueAsString),
        ],

      },
      lifecyclePolicy: efs.LifecyclePolicy.AFTER_90_DAYS, // files are not transitioned to infrequent access (IA) storage by default
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
        //secondaryGids: AclPosixUserGids.valueAsList,
      },
    });

    // EFS Permission
    const role = new iam.Role(this, 'Role', {
      assumedBy: new iam.AnyPrincipal(),
    });
    fileSystem.grant(role, 'elasticfilesystem:ClientWrite');

    new cdk.CfnOutput(this, 'EFSFileSystemId', {
        value: fileSystem.fileSystemId,
        description: 'EFS Filesystem Id'
    });

    new cdk.CfnOutput(this, 'AccessPointId', {
        value: accessPoint.accessPointId,
        description: 'EFS AccessPoint Id'
    });
    
  }
}