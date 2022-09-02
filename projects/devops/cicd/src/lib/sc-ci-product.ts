import * as fs from 'fs';
import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
//import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs/lib/construct';
import * as yaml from 'yaml';

export interface StackNameProps extends cdk.StackProps {

}

export class SCCIProduct extends servicecatalog.ProductStack {
  constructor(scope: Construct, id: string, props: StackNameProps) {
    super(scope, id);

    console.log(props);

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
              default: 'Configuration for Architect',
            },
            Parameters: [
              'ServiceName',
              'ContainerPort',
              'PackagingType',
              'TargetTYPE',
            ],
          },
        ],
      },
    };

    const serviceName = new cdk.CfnParameter(this, 'ServiceName', {
      type: 'String',
      description: 'Service Name',
      default: 'hello-app',
    });

    const repoName = new cdk.CfnParameter(this, 'RepoName', {
      type: 'String',
      description: 'Git Repository or S3 Bucket Name',
    });

    const repoOwner= new cdk.CfnParameter(this, 'RepoOwner', {
      type: 'String',
      description: '(Github Only Use) Github Owner',
      default: 'namespace',
    });

    const repoBranch = new cdk.CfnParameter(this, 'RepoBranch', {
      type: 'String',
      description: 'Git Repository Branch name',
      default: 'master',
    });

    const githubTokenSecretId = new cdk.CfnParameter(this, 'GithubSecretTokenId', {
      type: 'String',
      description: '(Github Only Use) AWS Secret Key for Github Personal Token',
      default: 'NA',
    });

    new cdk.CfnParameter(this, 'SourceProviderType', {
      type: 'String',
      description: 'Source Provider Type',
      default: 'GITHUB',
      allowedValues: ['GITHUB', 'CODECOMMIT', 'S3'],
    });

    // BuildProejct
    const buildType = new cdk.CfnParameter(this, 'PackagingType', {
      type: 'String',
      description: 'Source Packaging Tool',
      default: 'GRADLE',
      allowedValues: ['MAVEN', 'GRADLE', 'NPM', 'PYTHON', 'DOCKER'],
    });

    /* const isCodecommit = new cdk.CfnCondition(this, 'IsCodecommitCondition', {
      expression: cdk.Fn.conditionEquals('CODECOMMIT', provider.valueAsString),
    }); */

    // Resource
    const sourceOutput = new codepipeline.Artifact('Source');
    const buildOutput = new codepipeline.Artifact('Build');
    //const deployOutput = new codepipeline.Artifact('Deploy');

    const ecrRepository = new ecr.Repository(this, 'ECRRepository', {
      repositoryName: `${serviceName.valueAsString}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      imageScanOnPush: true,
      //imageTagMutability: ecr.TagMutability.IMMUTABLE,
    });

    const artfactS3 = new s3.Bucket(this, 'S3BucketsApp', {
      bucketName: `${serviceName.valueAsString}-codepipeline-artifact`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: false,
    });

    const buildSpec = yaml.parse(fs.readFileSync(path.join(__dirname, './buildspec/buildspec.v3.yml'), 'utf8'));
    const buildProject = new codebuild.PipelineProject(this, 'CIBuildProject', {
      buildSpec: codebuild.BuildSpec.fromObject(buildSpec),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0, // for arm64/v8 cpu platform
        privileged: true,
      },
      environmentVariables: {
        ECR_REPO: { value: ecrRepository.repositoryName },
        REPOSITORY_URI: { value: ecrRepository.repositoryUri },
        AWS_DEFAULT_REGION: { value: cdk.Stack.of(this).region },
        AWS_ACCOUNT_ID: { value: cdk.Stack.of(this).account },
        BUILD_TYPE: { value: buildType.valueAsString },
        //AWS_DEFAULT_REGION: { value: cdk.Stack.of(this).region },
        //AWS_ACCOUNT_ID: { value: cdk.Stack.of(this).account },
      },
      // Note: Invalid cache type: local caching is not supported for projects with environment type ARM_CONTAINER and compute type BUILD_GENERAL1_LARGE
      cache: codebuild.Cache.local(codebuild.LocalCacheMode.DOCKER_LAYER),
    });
    ecrRepository.grantPullPush(buildProject.grantPrincipal);

    // Source Action
    const githubSourceAction = new codepipeline_actions.GitHubSourceAction({
      actionName: 'GITHUBSource',
      owner: repoOwner.valueAsString,
      repo: repoName.valueAsString,
      branch: repoBranch.valueAsString,
      oauthToken: cdk.SecretValue.secretsManager(githubTokenSecretId.valueAsString),
      output: sourceOutput,
    });

    /* const CodeCommitSourceAction = new codepipeline_actions.CodeCommitSourceAction({
      actionName: 'CODECOMMIT',
      repository: codecommit.Repository.fromRepositoryName(this, 'GitRepository', repoName.valueAsString),
      branch: repoBranch.valueAsString,
      output: sourceOutput,
    }); */

    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Build_DockerImage_ECR',
      input: sourceOutput,
      outputs: [buildOutput],
      project: buildProject,
    });

    const githubPipeline = new codepipeline.Pipeline(this, 'GitHubPipeline', {
      pipelineName: `github-${serviceName.valueAsString}-ci`,
      artifactBucket: artfactS3,
    });

    githubPipeline.addStage({ stageName: 'Source' }).addAction(githubSourceAction);
    githubPipeline.addStage({ stageName: 'Build' }).addAction(buildAction);


    // CodeCommit Pipeline
    /*  const codecommitPipeline = new codepipeline.Pipeline(this, 'CodeCommitPipeline', {
      pipelineName: `codecommit-${serviceName.valueAsString}-ci`,
      artifactBucket: artfactS3,
    });

    codecommitPipeline.addStage({ stageName: 'Source' }).addAction(CodeCommitSourceAction);
    codecommitPipeline.addStage({ stageName: 'Build' }).addAction(buildAction);

    // If provider is github
    const cfnGithubPipeline = githubPipeline.node.defaultChild as codepipeline.CfnPipeline;
    cfnGithubPipeline.cfnOptions.condition = isGithub;

    // If provider is codecommit
    const cfnCodecommitPipeline = codecommitPipeline.node.defaultChild as codepipeline.CfnPipeline;
    cfnCodecommitPipeline.cfnOptions.condition = isCodecommit; */

    //new cdk.CfnOutput(this, 'ECRRepositoryURI', { value: `${newRepository.repositoryUri}:latest`, exportName: `${serviceName.valueAsString}-ecr-uri` });

  }
}