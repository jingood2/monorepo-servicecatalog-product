//import * as chalk from 'chalk';

export enum SCProductType {
  CDK = 'cdk-sc-product',
  CFN = 'cfn-sc-product',
}

export const envVars = {
  REGION: process.env.REGION || 'ap-northeast-2',
  COMPANY_NAME: 'skcnc',
  SOURCE_PROVIDER: 'GITHUB',
  GITHUB_TOKEN: 'atcl/jingood2/github-token',
  SC_PORTFOLIO_ARN: '',
  SC_PORTFOLIO_NAME: 'awstf-iam-portfolio',
  SC_PRODUCT_NAME: 'product-factory',
  SC_PRODUCT_OWNER: 'SK CnC AWS TF Team',
  SC_ACCESS_GROUP_NAME: 'AdminMasterAccountGroup',
  SC_ACCESS_ROLE_ARN: '',
};

/* export function validateEnvVariables() {
  for (let variable in envVars) {
    if (!envVars[variable as keyof typeof envVars]) {
      throw Error(
        chalk.chalkStderr(`[app]: Environment variable ${variable} is not defined!`),
      );
    }
  }
} */

export const identifyResource = (resourcePrefix: string, resourceId: string) => {
  return `${resourcePrefix}-${resourceId}`;
};
