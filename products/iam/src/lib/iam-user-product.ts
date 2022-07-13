import { CfnParameter, Lazy, SecretValue } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs';

export interface IAMUserPrductProps {
}

export class IAMUserPrduct extends servicecatalog.ProductStack {
  constructor(scope: Construct, id: string, _props: IAMUserPrductProps) {
    super(scope, id);

    const userName = new CfnParameter(this, "UserName", {
      type: 'String',
      default: 'johnDoe@exmaple.com',
      //description: 'IAM User Name should be email address',
      description: '이메일 주소로 IAM 유저 이름을 입력해주세요',
      allowedPattern: '/[^\s@]+@[^\s@]+\.[^\s@]+/',
    });

    const password = new CfnParameter(this, 'Password', {
      type: 'String',
      description: '대소문자 및 특수문자 포함하여 14글자 이상 입력해주세요',
    });

    new iam.User(this, 'User', {
      path: "/user/",
      groups: [iam.Group.fromGroupName(this, 'GroupName', 'UserCredentialsManagementGroup')],
      userName: Lazy.string({ produce: () => userName.valueAsString }),
      password: SecretValue.unsafePlainText(Lazy.string({ produce: () => password.valueAsString })),
      //userName: 'test@gmail.com',
      passwordResetRequired: true,
    });


  }
}
