import { App, DefaultStackSynthesizer, Stack, StackProps } from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { AmiHardwareType } from 'aws-cdk-lib/aws-ecs';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs';
import { ECSClusterProduct } from './lib/ecs-cluster-product';
import { EcsEc2ADOTProduct } from './lib/ecs-ec2-adot-product';
import { EcsEc2Product } from './lib/ecs-ec2-product';
import { EcsFargateAddADOTLokiProduct } from './lib/ecs-fargate-add-adot-loki-product';
import { EcsFargateAddADOTProduct } from './lib/ecs-fargate-add-adot-product';
//import { EcsEc2Product } from './lib/ecs-ec2-product';
import { EcsFargateProduct } from './lib/ecs-fargate-product';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const ecsOptImage = ecs.EcsOptimizedImage.amazonLinux2( AmiHardwareType.STANDARD, { cachedInContext: true });

    // define resources here...
    new servicecatalog.CloudFormationProduct(this, 'ecs-cluster-product', {
      productName: 'ecs-cluster-product',
      owner: 'jingood2@sk.com',
      distributor: 'SK Cloud Transformation Group',
      description: 'SC ECS Cluster Product',
      productVersions: [
        {
          productVersionName: 'v1',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(
            new ECSClusterProduct(this, 'ECSClusterProduct', { ecsOptiImage: ecsOptImage })),
        },
      ],
    });

    new servicecatalog.CloudFormationProduct(this, 'ecs-ec2-service-product', {
      productName: 'ecs-ec2-service-product',
      owner: 'jingood2@sk.com',
      distributor: 'SK Cloud Transformation Group',
      description: 'SC ECS Serivce Product',
      productVersions: [
        {
          productVersionName: 'v1',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(
            new EcsEc2Product(this, 'ECSEc2Product', {})),
        },
        {
          productVersionName: 'v2',
          description: 'ECS on EC2 with ADOT Collector',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(
            new EcsEc2ADOTProduct(this, 'ECSEc2AdotProduct', {})),
        },
      ],
    });

    new servicecatalog.CloudFormationProduct(this, 'ecs-fargate-service-product', {
      productName: 'ecs-fargate-service-product',
      owner: 'jingood2@sk.com',
      distributor: 'SK Cloud Transformation Group',
      description: 'SC ECS Serivce Product',
      productVersions: [
        {
          productVersionName: 'v1',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(
            new EcsFargateProduct(this, 'ECSFarGateProduct', {})),
        },
        {
          productVersionName: 'v2',
          description: 'ECS Fargate with ADOT Collector sidecar',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(
            new EcsFargateAddADOTProduct(this, 'ECSFargateADOTProduct', {})),
        },
        {
          productVersionName: 'v3',
          description: 'ECS Fargate with ADOT Collector sidecar Loki',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(
            new EcsFargateAddADOTLokiProduct(this, 'ECSFargateADOTLokiProduct', {})),
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

new MyStack(app, 'ecs', {
  env: devEnv,
  stackName:
  `SC-${process.env.PROJECT_NAME}-${process.env.STAGE}`,
  synthesizer: new DefaultStackSynthesizer({
    generateBootstrapVersionRule: false,
  }),
});
// new MyStack(app, 'ecs-prod', { env: prodEnv });

app.synth();