import { CfnParameter, Lazy } from "aws-cdk-lib";
import * as iam from 'aws-cdk-lib/aws-iam';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from "constructs";

export interface IAMUserPrductProps {
}

export class IAMUserPrduct extends servicecatalog.ProductStack {
  constructor(scope: Construct, id: string, _props: IAMUserPrductProps) {
    super(scope, id);

    const userName = new CfnParameter(this, "UserName", {
      type: "String",
      default: "johnDoe@exmaple.com",
      description: "IAM User Name should be email address",
      allowedPattern: "/^[a-zA-Z0-9.! #$%&'*+/=? ^_`{|}~-]+@[a-zA-Z0-9-]+(?:. [a-zA-Z0-9-]+)*$/",
    });

    new CfnParameter(this, "Password", {
      type: "String",
      default: Math.random().toString(20).substring(2, 9),
      description: "IAM User Password",
    });

    new CfnParameter(this, "AWSAccountId", {
      type: "String",
      description: "AWS IAM AccountId",
    });

    new iam.User(this, "User", {
      //path: "/user",
      //groups: [iam.Group.fromGroupArn(this, "UserCred", `arn:aws:iam::037729278610:group/admin/UserCredentialsManagement`)],
      userName: Lazy.string({ produce: () => userName.valueAsString }),
      //password: SecretValue.unsafePlainText(Lazy.string({ produce: () => password.valueAsString })),
    });



  }
}
