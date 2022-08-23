//import { CfnParameter, Lazy } from "aws-cdk-lib";
import { CfnCondition, CfnOutput, CfnParameter, Fn, SecretValue } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs';

export interface IAMUserPrductProps {}

export class IAMUserPrduct extends servicecatalog.ProductStack {
  constructor(scope: Construct, id: string, _props: IAMUserPrductProps) {
    super(scope, id);

    this.templateOptions.metadata = {
      'AWS::CloudFormation::Interface': {
        ParameterGroups: [
          {
            Label: {
              default: 'Information for IAM User',
            },
            Parameters: ['UserName', 'Password'],
          },
        ],
      },
    };

    const userName = new CfnParameter(this, 'UserName', {
      type: 'String',
      default: 'johnDoe@exmaple.com',
      //description: 'IAM User Name should be email address',
      description: 'Please enter your company email address as your IAM username',
      allowedPattern: '[^@]+@[^@]+.[^@]+',
    });

    const password = new CfnParameter(this, 'Password', {
      type: 'String',
      description: 'Please enter at least 14 characters including uppercase and lowercase letters and special characters',
      minLength: 14,
    });

    const createAccessKey = new CfnParameter(this, 'CreateAccessKey', {
      type: 'String',
      description: 'Create Access Key & Secret Access Key then attach this IAM User',
      allowedValues: ['yes', 'no'],
    });

    const createAccessKeyCondition = new CfnCondition(this, 'CreateAccessKeyCondition', {
      expression: Fn.conditionEquals('yes', createAccessKey.valueAsString),
    });

    const user = new iam.User(this, 'User', {
      path: '/user/',
      groups: [iam.Group.fromGroupName(this, 'GroupName', 'UserCredentialsManagementGroup')],
      userName: userName.valueAsString,
      password: SecretValue.unsafePlainText(password.valueAsString),
      passwordResetRequired: false,
    });

    const accessKey = new iam.CfnAccessKey(this, 'CfnAccessKey', {
      userName: user.userName,
    });

    accessKey.cfnOptions.condition = createAccessKeyCondition;

    const accessKeyId = new CfnOutput(this, 'accessKeyId', { value: accessKey.ref });
    const secretAccessKey = new CfnOutput(this, 'secretAccessKey', { value: accessKey.attrSecretAccessKey });

    accessKeyId.condition = createAccessKeyCondition;
    secretAccessKey.condition = createAccessKeyCondition;

  }
}
