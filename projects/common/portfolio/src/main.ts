import { App, DefaultStackSynthesizer, Stack, StackProps } from 'aws-cdk-lib';
//import * as iam from 'aws-cdk-lib/aws-iam';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs';
//import { envVars } from './env-vars';

interface IStackProps extends StackProps {

}

export class MyStack extends Stack {
  //readonly portfolio: servicecatalog.IPortfolio;

  constructor(scope: Construct, id: string, props: IStackProps) {
    super(scope, id, props);

    // Not exsiting portfolio
    /* if (envVars.SC_PORTFOLIO_ARN != '') {
      this.portfolio = servicecatalog.Portfolio.fromPortfolioArn(this, 'MyImportedPortfolio', envVars.SC_PORTFOLIO_ARN);
    } else {
      this.portfolio = new servicecatalog.Portfolio(this, envVars.SC_PORTFOLIO_NAME, {
        displayName: envVars.SC_PORTFOLIO_NAME ?? 'DemoPortfolio',
        providerName: 'AWSTF',
        description: 'AWS IAM Portfolio',
        messageLanguage: servicecatalog.MessageLanguage.EN,
      });
      if (envVars.SC_ACCESS_GROUP_NAME != '') {
        const group = iam.Group.fromGroupName(this, 'SCGroup', 'AdminMasterAccountGroup');
        this.portfolio.giveAccessToGroup(group);
      }
      if (envVars.SC_ACCESS_ROLE_ARN != '') {
        this.portfolio.giveAccessToRole(iam.Role.fromRoleArn(this, `${envVars.SC_PORTFOLIO_NAME}-Role`, envVars.SC_ACCESS_ROLE_ARN));
      } else {
        this.portfolio.giveAccessToRole(
          iam.Role.fromRoleArn(this, `${envVars.SC_PORTFOLIO_NAME}AdminRole`, `arn:aws:iam::${process.env.CDK_DEFAULT_ACCOUNT}:role/AssumableAdminRole`),
        );
      }
    } */

    /* const tagOptionsForPortfolio = new servicecatalog.TagOptions(this, "OrgTagOptions", {
          allowedValuesForTags: {
            stage: ["dev", "qa", "staging", "production"],
          },
        });
        this.portfolio.associateTagOptions(tagOptionsForPortfolio);
      }
      */

    // Only Manage Global TagOptions
    new servicecatalog.TagOptions(this, 'StageTagOptions', {
      allowedValuesForTags: {
        'cz-stage': ['share','dev', 'stage', 'prod'],
      },
    });

    new servicecatalog.TagOptions(this, 'OrgTagOptions', {
      allowedValuesForTags: {
        'cz-org': ['skch','skcnc', 'skib'],
      },
    });

  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new MyStack(app, "mystack", { 
  env: devEnv, stackName: 
  `SC-${process.env.PROJECT_NAME}-${process.env.STAGE}`,
  synthesizer: new DefaultStackSynthesizer({
    generateBootstrapVersionRule: false,
  }),
 });
// new MyStack(app, 'iam-prod', { env: prodEnv });

app.synth();
