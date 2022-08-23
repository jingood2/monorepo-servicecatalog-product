import * as path from 'path';
import { App, Stack, StackProps } from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs';


export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // define resources here...
    new servicecatalog.CloudFormationProduct(this, 'EC2WinToAdProduct', {
      description: 'Service Catalog Product for EC2 Windows',
      productName: 'ec2-win-to-product',
      owner: 'SK Cloud Transformation Group',
      productVersions: [
        {
          productVersionName: 'v1.0',
          description: 'Windows Server EC2 Worload Auto Attach and Format Disk',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromAsset(
            path.join(__dirname, './cfn-template/ec2-win-v1.0.yaml'),
          ),
        },
        {
          productVersionName: 'v2.0',
          description: 'Windows Server EC2 Worload to join Active Directory',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromAsset(
            path.join(__dirname, './cfn-template/ec2-win-adjoin-v2.0.yaml'),
          ),
        },

      ],
    });

    /* new servicecatalog.CloudFormationProduct(this, 'DirectoryAdClientProduct', {
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
    }); */
  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new MyStack(app, 'ec2-win-instance', { env: devEnv, stackName: `sc-${process.env.PROJECT_NAME}` });
// new MyStack(app, 'ec2-win-to-ad-with-no-ps-prod', { env: prodEnv });

app.synth();