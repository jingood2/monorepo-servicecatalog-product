import fs from 'fs';
import path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs/lib/construct';
import * as randomstring from 'randomstring';
import yaml from 'yaml';

//import { CDConstruct } from './cd-construct';


export interface StackNameProps extends cdk.StackProps {

}

export class ContainerGithubCICDProduct extends servicecatalog.ProductStack {
  constructor(scope: Construct, id: string, _props: StackNameProps) {
    super(scope, id);

    this.templateOptions.metadata = {
      'AWS::CloudFormation::Interface': {
        ParameterGroups: [
          {
            Label: {
              default: 'Environment Information',
            },
            Parameters: [
              'ProjectName',
              'ServiceName',
              'DeployStage1',
              'DeployStage2',
            ],
          },
          {
            Label: {
              default: 'Git Repository Information',
            },
            Parameters: [
              'RepoName',
              'RepoBranch',
              'RepoOwner',
              'GithubSecretTokenId',
            ],
          },
          {
            Label: {
              default: 'Configuration for Codebuild',
            },
            Parameters: [
              'BuildType',
              'S3BucketSourceArtifacts',
            ],
          },
          {
            Label: {
              default: 'Deploy Information',
            },
            Parameters: [
              'DeployTargetType',
              'ContainerPort',
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
      allowedValues: ['GITHUB', 'CODECOMMIT', 'JENKINS', 'BITBUCKET'],
    }); */

    // Informations of Tag Convention
    const projectName = new cdk.CfnParameter(this, 'ProjectName', {
      description: 'The name of the Project Name',
      type: 'String',
      default: 'acme',
    });

    const stage1 = new cdk.CfnParameter(this, 'DeployStage1', {
      description: 'Deploy Stage1 Environment',
      type: 'String',
      default: 'dev',
      allowedValues: ['dmz', 'dev', 'shared', 'prod'],
    });

    const stage2 = new cdk.CfnParameter(this, 'DeployStage2', {
      description: 'Deploy Stage1 Environment',
      type: 'String',
      default: 'prod',
      allowedValues: ['dmz', 'dev', 'shared', 'prod'],
    });

    const repoName = new cdk.CfnParameter(this, 'RepoName', {
      type: 'String',
      description: 'Git Repository or S3 Bucket Name',
    });

    const repoOwner= new cdk.CfnParameter(this, 'RepoOwner', {
      default: 'myowner',
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
      default: 'awstf-servicecatalog-cicd-bucket',
    });

    const buildType = new cdk.CfnParameter(this, 'BuildType', {
      type: 'String',
      description: 'Source Packaging Tool',
      default: 'DOCKER',
      allowedValues: ['MAVEN', 'GRADLE', 'NPM', 'PYTHON', 'DOCKER'],
    });

    const envType = new cdk.CfnParameter(this, 'DeployTargetType', {
      type: 'String',
      description: 'Source Packaging Tool',
      default: 'beanstalk',
      allowedValues: ['ecs', 'fargate', 'eks', 'beanstalk', 'lambda'],
    });


    /* const enableGithubCondition = new cdk.CfnCondition(this, 'EnableGithubCondition', {
      expression: cdk.Fn.conditionEquals(provider.valueAsString, 'GITHUB'),
    });

    const enableCodecommitCondition = new cdk.CfnCondition(this, 'EnableCodecommitCondition', {
      expression: cdk.Fn.conditionEquals(provider.valueAsString, 'CODECOMMIT'),
    }); */

    // Prerequisites CodePipeline
    const sourceOutput = new codepipeline.Artifact('Source');
    const buildOutput = new codepipeline.Artifact('Build');

    // 1. SourceAction
    // 1.1 Github
    const githubSourceAction = new codepipeline_actions.GitHubSourceAction({
      actionName: 'Github',
      owner: repoOwner.valueAsString,
      repo: repoName.valueAsString,
      branch: repoBranch.valueAsString,
      oauthToken: cdk.SecretValue.secretsManager(secretKey.valueAsString),
      output: sourceOutput,
    });

    /*  // 1.2 Codecommit
    const codeCommitSourceAction = new codepipeline_actions.CodeCommitSourceAction({
      actionName: 'Codecommit',
      repository: codecommit.Repository.fromRepositoryName(this, 'GitRepository', repoName.valueAsString),
      branch: repoBranch.valueAsString,
      output: sourceOutput,
    }); */

    const ecrRepository = new ecr.Repository(this, 'ECRRepo', {
      repositoryName: serviceName.valueAsString,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      imageScanOnPush: true,
      lifecycleRules: [{ maxImageCount: 10 }],
    });

    // Build Project
    const buildSpec = yaml.parse(fs.readFileSync(path.join(__dirname, './buildspec/buildspec-ci-all.yaml'), 'utf8'));

    const buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
      buildSpec: codebuild.BuildSpec.fromObject(buildSpec),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_4, // for arm64/v8 cpu platform
        computeType: codebuild.ComputeType.MEDIUM,
        privileged: true,
      },
      environmentVariables: {
        REPOSITORY_URI: { value: ecrRepository.repositoryUri },
        AWS_DEFAULT_REGION: { value: cdk.Stack.of(this).region },
        AWS_ACCOUNT_ID: { value: cdk.Stack.of(this).account },
        CONTAINER_PORT: { value: containerPort.valueAsString },
        BUILD_TYPE: { value: buildType.valueAsString },
        TARGET_TYPE: { value: envType.valueAsString },
        SERVICE_NAME: { value: serviceName.valueAsString },
        ARTIFACT_BUCKET: { value: sourceArtifact.valueAsString },
      },
      // Note: Invalid cache type: local caching is not supported for projects with environment type ARM_CONTAINER and compute type BUILD_GENERAL1_LARGE
      cache: codebuild.Cache.local(codebuild.LocalCacheMode.DOCKER_LAYER),
    });
    ecrRepository.grantPullPush(buildProject.grantPrincipal);

    // Build Action
    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Build',
      input: sourceOutput,
      outputs: [buildOutput],
      project: buildProject,
    });

    // Approval Action
    const approvalAction = new codepipeline_actions.ManualApprovalAction({ actionName: 'Approval' });

    // Deploy Dev Action
    const deployDevAction = this.createDeployAction(
      serviceName.valueAsString,
      projectName.valueAsString,
      stage1.valueAsString,
      sourceArtifact.valueAsString,
      envType.valueAsString,
      buildAction,
      buildOutput,
    );

    const deployProdAction = this.createDeployAction(
      serviceName.valueAsString,
      projectName.valueAsString,
      stage2.valueAsString,
      sourceArtifact.valueAsString,
      envType.valueAsString,
      buildAction,
      buildOutput,
    );


    const artifactS3 = s3.Bucket.fromBucketName(this, 'SourceS3', sourceArtifact.valueAsString);

    /* const codePipelineRole = new iam.Role(this, 'CodePipelineRole', {
      assumedBy: new iam.ServicePrincipal('codepipeline.amazonaws.com'),
      roleName: cdk.PhysicalName.GENERATE_IF_NEEDED,
      inlinePolicies: {
        rootPermissions: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              resources: ['*'],
              actions: ['s3:GetObject', 's3:List*', 's3:GetObjectVersion'],
            }),
          ],
        }),
      },
    }); */

    // Github Pipeline
    const githubPipeline = new codepipeline.Pipeline(this, 'GitHubPipeline', {
      pipelineName: `${serviceName.valueAsString}-pipeline`,
      artifactBucket: artifactS3,
      //role: codePipelineRole.withoutPolicyUpdates(),
    });

    artifactS3.grantReadWrite(githubPipeline.role);

    githubPipeline.addStage({ stageName: 'Source' }).addAction(githubSourceAction);
    githubPipeline.addStage({ stageName: 'ImageBuild', actions: [buildAction] });
    githubPipeline.addStage({ stageName: 'DeployOnDev', actions: [deployDevAction] });
    githubPipeline.addStage({ stageName: 'Approval', actions: [approvalAction] });
    githubPipeline.addStage({ stageName: 'DeployOnProd', actions: [deployProdAction] });


    // Codecommit Pipeline
    /* const codecommitPipeline = new codepipeline.Pipeline(this, 'CodecommitPipeline', {
      pipelineName: `${serviceName.valueAsString}`,
      artifactBucket: artifactS3,
    });

    codecommitPipeline.addStage({ stageName: 'Source' }).addAction(codeCommitSourceAction);
    codecommitPipeline.addStage({ stageName: 'ImageBuild', actions: [buildAction] });
    codecommitPipeline.addStage({ stageName: 'DeployOnDev', actions: [deployDevAction] });
    codecommitPipeline.addStage({ stageName: 'Approval', actions: [approvalAction] });
    codecommitPipeline.addStage({ stageName: 'DeployOnProd', actions: [deployProdAction] }); */

    // BitBucket Pipeline

    // Jenkins

    /* ( githubPipeline.node.defaultChild as codepipeline.CfnPipeline ).cfnOptions.condition = enableGithubCondition;
    ( codecommitPipeline.node.defaultChild as codepipeline.CfnPipeline).cfnOptions.condition = enableCodecommitCondition;
    */

  }

  private createDeployAction(
    serviceName: string,
    projectName: string,
    stage: string,
    artifact: string,
    deployTarget: string,
    buildAction: codepipeline_actions.CodeBuildAction,
    buildOutput: codepipeline.Artifact,
  ) : codepipeline_actions.CodeBuildAction {

    const randomString = randomstring.generate(5);

    const deployBuildSpec = yaml.parse(fs.readFileSync(path.join(__dirname, './buildspec/buildspec-cd.yaml'), 'utf8'));

    const deployProject = new codebuild.PipelineProject(this, `DeployPloject-${randomString}`, {
      buildSpec: codebuild.BuildSpec.fromObject(deployBuildSpec),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
        privileged: true,
      },
      environmentVariables: {
        //REPOSITORY_URI: { value: ecrRepository.repositoryUri },
        SERVICE_NAME: { value: serviceName },
        ENVIRONMENT: { value: stage },
        DEPLOY_ENV_NAME: { value: `${projectName}-${deployTarget}-${stage}` },
        AWS_DEFAULT_REGION: { value: cdk.Stack.of(this).region },
        AWS_ACCOUNT_ID: { value: cdk.Stack.of(this).account },
        ARTIFACT_BUCKET: { value: artifact },
        TARGET_TYPE: { value: deployTarget },
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

    const deployAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Deploy',
      input: buildOutput,
      project: deployProject,
      environmentVariables: {
        IMAGE_TAG: { value: buildAction.variable('IMAGE_TAG') },
      },
    });

    return deployAction;

  }
}