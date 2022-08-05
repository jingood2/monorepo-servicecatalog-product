import * as cdk from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs/lib/construct';
import { CfnParameter } from 'aws-cdk-lib';

export interface AttachEFSMountProps extends cdk.StackProps {

}

export class AttachEFSMount extends servicecatalog.ProductStack{
  constructor(scope: Construct, id: string ) {
    super(scope, id );

    const instanceId = new CfnParameter(this, 'InstanceId', {
        type: 'AWS::EC2::Instance::Id',
        default: 'i-1e731a32',
        description: 'An Amazon EC2 instance ID',
    });

    const efsId = new CfnParameter(this, 'EfsId', {
        type: 'String',
        default: 'i-1e731a32',
        description: 'An Amazon EFS ID',
    });

    new cr.AwsCustomResource(this, 'GetParameter', {
        onUpdate: { // will also be called for a CREATE event
          service: 'SSM',
          action: 'startAutomationExecution',
          parameters: {
            DocumentName: 'AWSSupport-CheckAndMountEFS',
            Parameters: {
                Action: 'CheckAndMount',
                EfsId: efsId.valueAsString, 
                InstanceId: instanceId.valueAsString,
            },

          },
          physicalResourceId: cr.PhysicalResourceId.of(Date.now().toString()), // Update physical id to always fetch the latest version
        },
        policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
          resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
        }),
      });

    
  }
}