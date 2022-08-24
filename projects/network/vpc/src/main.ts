import path from 'path';
import { App, Stack, StackProps } from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs';
import { VpcProduct } from './lib/vpc-product';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // define resources here...
    new servicecatalog.CloudFormationProduct(this, 'VPCProduct', {
      description: 'Network VPC Product',
      productName: 'Network VPC Product',
      owner: 'SK Cloud Transformation Group',
      productVersions: [
        {
          productVersionName: 'v1',
          description: '2tier Subnet VPC',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(new VpcProduct(this, 'Vpc', {})),
        },
        {
          productVersionName: 'v2',
          description: '3tier Subnet VPC',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromAsset(
            path.join(__dirname, './lib/cfn-template/3-tier.template.yaml'),
          ),
        },
       /*  {
          productVersionName: 'v3',
          description: '3tier Subnet VPC added Second CIDR',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromAsset(
            path.join(__dirname, './lib/cfn-template/vpc-3tier-zcp.template.yaml'),
          ),
        }, */
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

new MyStack(app, 'vpc', { env: devEnv, stackName: `sc-${process.env.PROJECT_NAME}-${process.env.STAGE}` });

app.synth();