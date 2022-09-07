import * as cdk from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs/lib/construct';
import { CDECSConstruct } from './cd-ecs-construct';
import { CIECSConstruct } from './ci-ecs-construct';

export interface StackNameProps extends cdk.StackProps {

}

export class ECSCodeCommitCICDProduct extends servicecatalog.ProductStack {
  constructor(scope: Construct, id: string, _props: StackNameProps) {
    super(scope, id);

    // Informations of Tag Convention
    const projectName = new cdk.CfnParameter(this, 'ProjectName', {
      description: 'The name of the Project Name',
      type: 'String',
      default: 'acme',
    });

    const environment = new cdk.CfnParameter(this, 'Environment', {
      description: 'The name of the Environment',
      type: 'String',
      default: 'dev',
      allowedValues: ['dmz', 'dev', 'shared', 'prod'],
    });

    const serviceName = new cdk.CfnParameter(this, 'ServiceName', {
      type: 'String',
      description: 'Service Name',
      default: 'demoapp',
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

    const sourceArtifact = new cdk.CfnParameter(this, 'S3BucketSourceArtifacts', {
      type: 'String',
      description: 'S3 Bucket Name for Source and Build Artifact',
      default: '',
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

    /* const options = new cdk.CfnParameter(this, 'RUNTIME_OPTIONS', {
        type: 'String',
        description: 'application runtime options ex) java -Xms1g -Xmx1g',
        default: '',
    }); */

    // new CI Construct
    const ci = new CIECSConstruct(this, 'ECSCI', {
      serviceName: serviceName.valueAsString,
      servicePort: servicePort.valueAsNumber,
      provider: 'CODECOMMIT',
      repoName: repoName.valueAsString,
      repoOwner: repoOwner.valueAsString,
      repoBranch: repoBranch.valueAsString,
      buildType: buildType.valueAsString,
      envType: envType.valueAsString,
      sourceArtifact: sourceArtifact.valueAsString,
    });

    // new CD Construct
    new CDECSConstruct(this, 'ECSCD', {
      imageTag: 'latest',
      pipeline: ci.pipeline,
      projectName: projectName.valueAsString,
      environment: environment.valueAsString,
      serviceName: serviceName.valueAsString,
      containerPort: servicePort.valueAsNumber, // only use beanstalk
      deployTargetType: envType.valueAsString,
      approvalStage: 'false',
      sourceArtifact: sourceArtifact.valueAsString,
      buildOutput: ci.buildOutput,
    });


  }
}