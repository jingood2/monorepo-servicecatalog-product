import * as cdk from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';

import { Construct } from 'constructs/lib/construct';
import { CIConstruct } from './ci-construct';
import { CDConstruct } from './cd-construct';
//import { CDConstruct } from './cd-construct';


export interface StackNameProps extends cdk.StackProps {

}

export class GithubCICDProduct extends servicecatalog.ProductStack {
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
    /* const provider = new cdk.CfnParameter(this, 'SourceProviderType', {
      type: 'String',
      description: 'Source Provider Type',
      default: 'GITHUB',
      allowedValues: ['GITHUB', 'CODECOMMIT', 'JENKINS', 'BITBUCKET', 'S3', 'GENERAL'],
    }); */

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

    const secretKey = new cdk.CfnParameter(this, 'Github Secret Token Id', {
      type: 'String',
      description: '(Github Only Use)Secret Token Id for Github',
    });

    const serviceName = new cdk.CfnParameter(this, 'ServiceName', {
      type: 'String',
      description: 'Service Name',
      default: 'demoapp',
    });

    const containerPort = new cdk.CfnParameter(this, 'ContainerPort', {
      type: 'Number',
      description: 'Container Port',
      default: '80',
    });

    const sourceArtifact = new cdk.CfnParameter(this, 'S3BucketSourceArtifacts', {
      type: 'String',
      description: 'S3 Bucket Name for Source and Build Artifact',
      default: 'acme-servicecatalog-cicd-bucket',
    });

    const buildType = new cdk.CfnParameter(this, 'PackagingType', {
      type: 'String',
      description: 'Source Packaging Tool',
      default: 'DOCKER',
      allowedValues: ['MAVEN', 'GRADLE', 'NPM', 'PYTHON', 'DOCKER'],
    });

    const envType = new cdk.CfnParameter(this, 'EnvType', {
      type: 'String',
      description: 'Source Packaging Tool',
      default: 'beanstalk',
      allowedValues: ['ecs', 'fargate', 'eks', 'beanstalk', 'lambda'],
    });

    const ci = new CIConstruct(this, 'CD',{
        repoName: repoName.valueAsString, 
        repoOwner: repoOwner.valueAsString,
        repoBranch: repoBranch.valueAsString,
        secretKey: secretKey.valueAsString,
        serviceName: serviceName.valueAsString,
        containerPort: containerPort.valueAsNumber,
        sourceArtifact: sourceArtifact.valueAsString,
        buildType: buildType.valueAsString,
        envType: envType.valueAsString,
      }
    );


    new CDConstruct(this, 'CD', {
      imageTag: ci.imageTag,
      projectName: projectName.valueAsString,
      environment: environment.valueAsString,
      serviceName: serviceName.valueAsString,
      ecrRepoName: serviceName.valueAsString,
      containerPort: containerPort.valueAsNumber, // only use beanstalk
      deployTargetType: envType.valueAsString,
      approvalStage: 'true',
      pipeline: ci.pipeline,
      sourceArtifact: sourceArtifact.valueAsString,
      buildOutput: ci.buildOutput,
    });

    /* const deployBuildSpec = yaml.parse(fs.readFileSync(path.join(__dirname, './buildspec/buildspec-cd.yaml'), 'utf8'));

    const deployProject = new codebuild.PipelineProject(this, 'CodeBuildDeployPloject', {
      buildSpec: codebuild.BuildSpec.fromObject(deployBuildSpec),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
        privileged: true,
      },
      environmentVariables: {
        //REPOSITORY_URI: { value: ecrRepository.repositoryUri },
        SERVICE_NAME: { value: serviceName.valueAsString },
        ENVIRONMENT: { value: environment.valueAsString },
        DEPLOY_ENV_NAME: { value: `${projectName.valueAsString}-${envType.valueAsString}-${environment.valueAsString}` },
        AWS_DEFAULT_REGION: { value: cdk.Stack.of(this).region },
        AWS_ACCOUNT_ID: { value: cdk.Stack.of(this).account },
        ARTIFACT_BUCKET: { value: sourceArtifact.valueAsString },
        TARGET_TYPE: { value: envType.valueAsString },
      },
    });

    deployProject.role?.addToPrincipalPolicy(new iam.PolicyStatement({
      resources: ['*'],
      actions: ['elasticbeanstalk:*',
        'autoscaling:*',
        'elasticloadbalancing:*',
        'ecs:*',
        's3:*',
        'ec2:*',
        'cloudwatch:*',
        'logs:*',
        'cloudformation:*'],
    }));

    const approvalAction = new codepipeline_actions.ManualApprovalAction({ actionName: 'Approval' });
    pipeline.addStage( { stageName: 'Approval', actions: [approvalAction] });

    const deployAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Deploy',
      input: buildOutput,
      project: deployProject,
      environmentVariables: {
        IMAGE_TAG: { value: buildAction.variable('IMAGE_TAG') },
      },
    });
    pipeline.addStage( { stageName: 'DEPLOY', actions: [deployAction] }); */


  }
}