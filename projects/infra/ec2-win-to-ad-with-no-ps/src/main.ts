import * as path from 'path';
import { App, Stack, StackProps } from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs';


export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // define resources here...
    new servicecatalog.CloudFormationProduct(this, 'EC2WinToAdProduct', {
      description: 'EC2 Windows To AD',
      productName: 'ec2-win-to-ad-product',
      owner: 'SK Cloud Transformation Group',
      productVersions: [
        {
          productVersionName: 'v1.0',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromAsset(
            path.join(__dirname, './cfn-template/ec2-win-to-ad.yaml'),
          ),
        },
      ],
    });

    new servicecatalog.CloudFormationProduct(this, 'DirectoryAdClientProduct', {
      description: 'Directory AD Client Product',
      productName: 'directory-ad-client-product',
      owner: 'SK Cloud Transformation Group',
      productVersions: [
        {
          productVersionName: 'v1.0',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromAsset(
            path.join(__dirname, './cfn-template/directory-ad-client.yaml'),
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

new MyStack(app, 'ec2-win-to-ad-with-no-ps-dev', { env: devEnv });
// new MyStack(app, 'ec2-win-to-ad-with-no-ps-prod', { env: prodEnv });

app.synth();