import * as cdk from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs/lib/construct';
import { CDConstruct } from './cd-construct';
import { CIConstruct } from './ci-construct';

export interface StackNameProps extends cdk.StackProps {

}

export class CICDEBProduct extends servicecatalog.ProductStack {
  constructor(scope: Construct, id: string, _props: StackNameProps) {
    super(scope, id);

    const serviceName = new cdk.CfnParameter(this, 'ServiceName', {
      type: 'String',
      description: 'Service Name',
      default: 'hello-app',
    });

    const servicePort = new cdk.CfnParameter(this, 'ServicePort', {
      type: 'Number',
      description: 'Container Port',
      default: '8080',
    });

    const repoName = new cdk.CfnParameter(this, 'RepoName', {
      type: 'String',
      description: 'Git Repository or S3 Bucket Name',
    });

    const repoOwner= new cdk.CfnParameter(this, 'RepoOwner', {
      default: 'main',
    });

    const repoBranch = new cdk.CfnParameter(this, 'RepoBranch', {
      default: 'main',
    });

    const environment = new cdk.CfnParameter(this, 'Environment', {
    type: 'List<String>',
    description: 'Source Packaging Tool',
    allowedValues: ['dev', 'staging', 'prod'],
    });


    const githubTokenSecretId = new cdk.CfnParameter(this, 'Github Secret Token Id', {
      type: 'String',
      description: '(Github Only Use)Secret Token Id for Github',
    });

    const buildType = new cdk.CfnParameter(this, 'PackagingType', {
      type: 'String',
      description: 'Source Packaging Tool',
      default: 'GRADLE',
      allowedValues: ['MAVEN', 'GRADLE', 'NPM', 'PYTHON', 'DOCKER'],
    });

    const envType = new cdk.CfnParameter(this, 'EnvType', {
      type: 'String',
      description: 'Source Packaging Tool',
      default: 'BEANSTALK',
      allowedValues: ['ECS', 'EKS', 'BEANSTALK', 'LAMBDA'],
    });

    // new CI Construct
    const ci = new CIConstruct(this, 'CI', {
      serviceName: serviceName.valueAsString,
      servicePort: servicePort.valueAsNumber,
      repoName: repoName.valueAsString,
      repoOwner: repoOwner.valueAsString,
      repoBranch: repoBranch.valueAsString,
      githubTokenSecretId: githubTokenSecretId.valueAsString,
      buildType: buildType.valueAsString,
      envType: envType.valueAsString,
    });

    // new CD Construct
    new CDConstruct(this, 'CD', {
        imageTag: ci.IMAGE_TAG,
        pipeline: ci.pipeline,
        serviceName: serviceName.valueAsString,
        containerPort: servicePort.valueAsNumber, // only use beanstalk
        deployEnvName: '',
        deployTargetType: envType.valueAsString, 
        Environment: environment.valueAsString,

        approvalStage: 'true',
        buildOutput: ci.buildOutput,
    });


  }
}