import * as cdk from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs/lib/construct';
import { CIConstruct } from './ci-construct';


export interface StackNameProps extends cdk.StackProps {

}

export class ECSCICDPipelineProduct extends servicecatalog.ProductStack {
  constructor(scope: Construct, id: string, _props: StackNameProps) {
    super(scope, id);

    this.templateOptions.metadata = {
      'AWS::CloudFormation::Interface': {
        ParameterGroups: [
          {
            Label: {
              default: 'Git Repository Common Information',
            },
            Parameters: [
              'SourceProviderType',
              'RepoName',
              'RepoBranch',
            ],
          },
          {
            Label: {
              default: 'GitHub Information',
            },
            Parameters: [
              'RepoOwner',
              'GithubSecretTokenId',
            ],
          },
          {
            Label: {
              default: 'Configuration for Codebuild',
            },
            Parameters: [
              'ServiceName',
              'sourceArtifact',
              'ecsCluster',
              'vpcId',
              'albArn',
            ],
          },
        ],
      },
    };

    // Define Parameters
    const provider = new cdk.CfnParameter(this, 'SourceProviderType', {
      type: 'String',
      description: 'Source Provider Type',
      default: 'GITHUB',
      allowedValues: ['GITHUB', 'CODECOMMIT', 'JENKINS', 'BITBUCKET', 'S3', 'GENERAL'],
    });

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

    const githubTokenSecretId = new cdk.CfnParameter(this, 'Github Secret Token Id', {
      type: 'String',
      description: '(Github Only Use)Secret Token Id for Github',
    });

    const serviceName = new cdk.CfnParameter(this, 'ServiceName', {
      type: 'String',
      description: 'Service Name',
      default: 'demoapp',
    });

    const sourceArtifact = new cdk.CfnParameter(this, 'S3BucketSourceArtifacts', {
      type: 'String',
      description: 'S3 Bucket Name for Source and Build Artifact',
      default: 'acme-servicecatalog-cicd-bucket',
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
      default: 'beanstalk',
      allowedValues: ['ecs', 'fargate', 'eks', 'beanstalk', 'lambda'],
    });

    /* const ecsCluster = new cdk.CfnParameter(this, 'ECSCluster', {
      description: 'the name of ECS Cluster',
      type: 'String',
    });

    const vpcId = new cdk.CfnParameter(this, 'VpcId', {
      type: 'AWS::EC2::VPC::Id',
      description: 'VPC ID for ECS Cluster',
    });

    const albArn = new cdk.CfnParameter(this, 'ALBArn', {
      description: 'the ARN of ALB',
      type: 'String',
    }); */


    /* const options = new cdk.CfnParameter(this, 'RUNTIME_OPTIONS', {
        type: 'String',
        description: 'application runtime options ex) java -Xms1g -Xmx1g',
        default: '',
    }); */

    // new CI Construct
    new CIConstruct(this, 'CI', {
      projectName: projectName.valueAsString,
      environment: environment.valueAsString,
      serviceName: serviceName.valueAsString,
      buildType: buildType.valueAsString,
      envType: envType.valueAsString,
      provider: provider.valueAsString,
      /* existingVpcId: string;
      existingEcsCluster: string;
      existingALBArn: string; */
      repoOwner: repoOwner.valueAsString,
      repoName: repoName.valueAsString,
      repoBranch: repoBranch.valueAsString,
      secretKey: githubTokenSecretId.valueAsString,
      artifactBucketName: sourceArtifact.valueAsString,
    });

    // new CD Construct
    /* new CDECSConstruct(this, 'ECSCD', {
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
    }); */


  }
}