import path from 'path';
import { App, Stack, StackProps } from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // define resources here...
    new servicecatalog.CloudFormationProduct(this, 'AWSBackup', {
      description: 'AWS Backup Product',
      productName: 'aws-backup-product',
      owner: 'SK Cloud Transformation Group',
      productVersions: [
        {
          productVersionName: 'v1.0',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromAsset(
            path.join(__dirname, './cfn-templates/aws-backup.template.yml'),
          ),
        },
      ],
    });
  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

//new MyStack(app, 'aws-backup-dev', { env: devEnv });
new MyStack(app, 'aws-backup-stack', { env: devEnv, stackName: `sc-${process.env.PROJECT_NAME}-${process.env.STAGE}` });
// new MyStack(app, 'aws-backup-prod', { env: prodEnv });

app.synth();