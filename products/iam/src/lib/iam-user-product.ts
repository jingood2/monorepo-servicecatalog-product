import { CfnParameter, Fn } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as servicecatalog from "aws-cdk-lib/aws-servicecatalog";
import { Construct } from "constructs";

export interface IAMUserPrductProps {}

export class IAMUserPrduct extends servicecatalog.ProductStack {
  constructor(scope: Construct, id: string, _props: IAMUserPrductProps) {
    super(scope, id);

    this.templateOptions.metadata = {
      "AWS::CloudFormation::Interface": {
        ParameterGroups: [
          {
            Label: {
              default: "Information for IAM User",
            },
            Parameters: ["UserName"],
          },
        ],
      },
    };

    const userNames = new CfnParameter(this, "UserName", {
      type: "CommaDelimitedList",
      default: "johnDoe@exmaple.com, james@example.com",
      //description: 'IAM User Name should be email address',
      description: "Please enter your company email address as your IAM username",
      allowedPattern: "[^@]+@[^@]+.[^@]+",
    });

    /* const password = new CfnParameter(this, "Password", {
      type: "String",
      description: "Please enter at least 14 characters including uppercase and lowercase letters and special characters",
    }); */

    userNames.valueAsList.forEach((userName, idx) => {
      new iam.User(this, "User", {
        path: "/user/",
        groups: [iam.Group.fromGroupName(this, "GroupName", "UserCredentialsManagementGroup")],
        //userName: Lazy.string({ produce: () => userName}),
        //password: SecretValue.unsafePlainText(Lazy.string({ produce: () => password.valueAsString })),
        userName: Fn.select(idx, userNames.valueAsList),
        //passwordResetRequired: true,
      });

      console.log(userName);
    });
  }
}
