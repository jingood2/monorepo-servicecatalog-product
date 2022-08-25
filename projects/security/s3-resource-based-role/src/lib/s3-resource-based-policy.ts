import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';

import { Construct } from 'constructs/lib/construct';

export interface IamCrossAccountRoleProps extends cdk.StackProps {

}

export class IamCrossAccountRole extends servicecatalog.ProductStack {
  constructor(scope: Construct, id: string, _props: IamCrossAccountRoleProps) {
    super(scope, id );

    const projectName = new cdk.CfnParameter(this, 'ProjectName', {
      type: 'String',
      default: 'projectName',
      description: 'Project Name',
    });

    /* const environmentType= new cdk.CfnParameter(this, 'environmentType', {
    type: 'String',
    default: 'dev',
    allowedValues: ['shared', 'dev', 'stage', 'prod'],
    description: 'environmentType Name',
    }); */

    const roleName = new cdk.CfnParameter(this, 'CrossAccountRoleName', {
      type: 'String',
      description: 'crossAccount Role Name',
    });

    //const principalArn = new cdk.CfnParameter(this, 'PrincipalArn', {
    const principalArn = new cdk.CfnParameter(this, 'PrincipalArn', {
      type: 'String',
      default: 'arn:aws:iam::123456789012:root',
      description: 'Principal Arn. Ex) arn:aws:iam::{ALLOW_ACCOUNT}:role/roleName, arn:aws:iam:{ALLOW_ACCOUNT}:root',
    });

    const allowResourceArn = new cdk.CfnParameter(this, 'AllowResourceArn', {
      type: 'String',
      description: 'Allowed Resource Arn. Ex) arn:aws:dynamodb:ap-northeast-2:{MY_ACCOUNT}:table/tableName ',
    });

    //create role to assume the new principal account to
    const role = new iam.Role(this, 'CrossAcountRole', {
      assumedBy: new iam.ArnPrincipal(principalArn.valueAsString),
      roleName: `${projectName.valueAsString}-${roleName.valueAsString}`,
    });

    const stmtAllowOAIBucketAccess = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:List*', 's3:Get*', 's3:Put*'
      ],
      resources: [
        cdk.Lazy.string({ produce: () => allowResourceArn.valueAsString } ),
      ],
    });

    // I'm not actually using this. Good catch!
    new iam.Policy(this, 'SourceBucketPolicy', {
      statements: [
        stmtAllowOAIBucketAccess,
      ],
    });

    role.addToPolicy(stmtAllowOAIBucketAccess);

  }
}