import { App, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as servicecatalog from "aws-cdk-lib/aws-servicecatalog";
import { IAMUserPrduct } from "./lib/iam-user-product";

interface IStackProps extends StackProps {

}

export class MyStack extends Stack {
  //readonly portfolio: servicecatalog.IPortfolio;

  constructor(scope: Construct, id: string, props: IStackProps) {
    super(scope, id, props);

   /*  // Not exsiting portfolio
    if (envVars.SC_PORTFOLIO_ARN != "") {
      this.portfolio = servicecatalog.Portfolio.fromPortfolioArn(this, "MyImportedPortfolio", envVars.SC_PORTFOLIO_ARN);
    } else {
      this.portfolio = new servicecatalog.Portfolio(this, envVars.SC_PORTFOLIO_NAME, {
        displayName: envVars.SC_PORTFOLIO_NAME ?? "DemoPortfolio",
        providerName: "AWSTF",
        description: "AWS IAM Portfolio",
        messageLanguage: servicecatalog.MessageLanguage.EN,
      });
      if (envVars.SC_ACCESS_GROUP_NAME != "") {
        const group = iam.Group.fromGroupName(this, "SCGroup", "AdminMasterAccountGroup");
        this.portfolio.giveAccessToGroup(group);
      }
      if (envVars.SC_ACCESS_ROLE_ARN != "") {
        this.portfolio.giveAccessToRole(iam.Role.fromRoleArn(this, `${envVars.SC_PORTFOLIO_NAME}-Role`, envVars.SC_ACCESS_ROLE_ARN));
      } else {
        this.portfolio.giveAccessToRole(
          iam.Role.fromRoleArn(this, `${envVars.SC_PORTFOLIO_NAME}AdminRole`, `arn:aws:iam::${process.env.CDK_DEFAULT_ACCOUNT}:role/AssumableAdminRole`),
        );
      } */

      /* const tagOptionsForPortfolio = new servicecatalog.TagOptions(this, "OrgTagOptions", {
        allowedValuesForTags: {
          stage: ["dev", "qa", "staging", "production"],
        },
      });
      this.portfolio.associateTagOptions(tagOptionsForPortfolio);
 */
    }

    

    const product = new servicecatalog.CloudFormationProduct(this, "sc-iamuser-product", {
      productName: "sc-iamuser-product",
      owner: "AWSTF",
      description: "IAM User SC Product",
      productVersions: [
        {
          productVersionName: "v1",
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(new IAMUserPrduct(this, "IamUserProduct", {})),
        },
      ],
    });

    /* const productStackHistory = new servicecatalog.ProductStackHistory(this, "ProductStackHistory", {
      productStack: new IAMUserPrduct(this, "IAMUserProduct", {}),
      currentVersionName: "v1",
      currentVersionLocked: true,
    });

    const product = new servicecatalog.CloudFormationProduct(this, "MyFirstProduct", {
      productName: "create-iamuser-product",
      owner: "SKCnC AWSTF",
      productVersions: [productStackHistory.currentVersion()],
    }); */

    //this.portfolio.addProduct(product);
  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new MyStack(app, "iam-product", { env: devEnv });
// new MyStack(app, 'iam-prod', { env: prodEnv });

app.synth();
