import * as cdk from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs/lib/construct';


export interface S3ResourceBasedPolicyProps  {

}


export class S3ResourceBasedPolicy extends servicecatalog.ProductStack {

  constructor(scope: Construct, id: string, _props: S3ResourceBasedPolicyProps) {
    super(scope, id);

    const bucketArn = new cdk.CfnParameter(this, 'BucketArn', {
        type: 'String',
        default: 'projectName',
        description: 'Source Bucket Arn',
    });

    const allowedPrincipals = new cdk.CfnParameter(this, 'AllowedPrincipals', {
        type: 'List<String>',
        default: '',
        description: 'Allowed Principals Arn. Ex) arn:aws:iam::123456789012:root',
    });

    const allowedActions = new cdk.CfnParameter(this, 'AllowedActions', {
        type: 'List<String>',
        default: '',
        description: 'Allowed Principals Arn. Ex) arn:aws:iam::123456789012:root',
        allowedValues: ['s3:Get*', 's3:List*', 's3:Put*']
    });

    const bucket = s3.Bucket.fromBucketArn(this, 'SourceBucket', bucketArn.valueAsString);
    
    allowedPrincipals.valueAsList.forEach(v => {
        bucket.addToResourcePolicy(new iam.PolicyStatement({
            actions: allowedActions.valueAsList,
            resources: [bucket.arnForObjects('*')],
            principals: [new iam.AccountPrincipal(v)]
        }));
    });
    
  }
}