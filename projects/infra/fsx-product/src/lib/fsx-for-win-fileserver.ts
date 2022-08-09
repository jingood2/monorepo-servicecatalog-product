import * as cdk from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import * as fsx from 'aws-cdk-lib/aws-fsx';
import { Construct } from 'constructs/lib/construct';

export interface StackNameProps extends cdk.StackProps {

}

export class FsxForWinFileserver extends servicecatalog.ProductStack {
  constructor(scope: Construct, id: string, _props: StackNameProps) {
    super(scope, id );

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
    
        const fsxName =  new cdk.CfnParameter(this, 'FsxName', {
        type: 'String',
        description: 'describe EFS Name',
        });
        
        const accessSubnetIds = new cdk.CfnParameter(this, 'AccessableSubnetIds', {
            type: 'List<AWS::EC2::Subnet::Id>',
            description: 'Specifies the IDs of the subnets that the file system will be accessible from',
        });

        const dnsIps = new cdk.CfnParameter(this, 'DnsIps', {
            type: 'List<String>',
            description: 'A list of up to three IP addresses of DNS servers or domain controllers in the self-managed AD directory', 
        });

        const domainName = new cdk.CfnParameter(this, 'DomainName', {
            type: 'String',
            description: 'The fully qualified domain name of the self-managed AD directory',
            default: 'corp.example.com',
        });

        const username = new cdk.CfnParameter(this, 'UserName', {
            type: 'String',
            description: 'The user name for the service account on your self-managed AD domain that Amazon FSx will use to join to your AD domain',
        });

        const password = new cdk.CfnParameter(this, 'Password', {
            type: 'String',
            description: 'The password for the service account on your self-managed AD domain that Amazon FSx will use to join to your AD domain'
        });

    const cfnFileSystem = new fsx.CfnFileSystem(this, 'MyCfnFileSystem', {
        fileSystemType: 'WINDOWS',
        subnetIds: accessSubnetIds.valueAsList,
      
        // the properties below are optional
        //kmsKeyId: 'kmsKeyId',
        windowsConfiguration: {
          // the properties below are optional
          //preferredSubnetId: 'preferredSubnetId',
          selfManagedActiveDirectoryConfiguration: {
            dnsIps: dnsIps.valueAsList,
            domainName: domainName.valueAsString,
            //fileSystemAdministratorsGroup: 'fileSystemAdministratorsGroup',
            password: password.valueAsString,
            userName: username.valueAsString,
          },
        },
        tags: [{
            key: 'Name', 
            value: `${projectName.valueAsString}-${environmentType.valueAsString}-${fsxName.valueAsString}-fsx`}],
    });

    new cdk.CfnOutput(this, 'FSxVolumeId', {
        value: cfnFileSystem.attrRootVolumeId,
        description: 'Returns the root volume ID of the FSx for OpenZFS file system', 
    });
    
  }
} 