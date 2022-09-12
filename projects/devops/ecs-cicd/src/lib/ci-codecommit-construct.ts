import * as fs from 'fs';
import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

import { Construct } from 'constructs/lib/construct';

import * as yaml from 'yaml';
import { CDConstruct } from './cd-construct';


export interface CIConstructProps {
  provider: string;
  projectName: string;
  environment: string;
  serviceName: string;
  buildType?: string;
  envType: string;
  /* existingVpcId: string;
  existingEcsCluster: string;
  existingALBArn: string; */
  repoOwner: string;
  repoName: string;
  repoBranch: string;
  secretKey: string;
  artifactBucketName: string;
}

export class CICodecommitConstruct extends Construct {
  //public readonly pipeline: codepipeline.Pipeline;
  public readonly sourceOutput: codepipeline.Artifact;
  public readonly buildOutput: codepipeline.Artifact;
  public readonly IMAGE_TAG: string;

  constructor(scope: Construct, id: string, props: CIConstructProps) {
    super(scope, id);

    // Prerequisites CodePipeline
    const sourceOutput = new codepipeline.Artifact('Source');
    const buildOutput = new codepipeline.Artifact('Build');


    // 1. Define Pipeline Source Action
    // Source Action
    const CodeCommitSourceAction = new codepipeline_actions.CodeCommitSourceAction({
      actionName: 'CODECOMMIT',
      repository: codecommit.Repository.fromRepositoryName(this, 'GitRepository', props.repoName),
      branch: props.repoBranch,
      output: sourceOutput,
    });

    const ecrRepository = new ecr.Repository(this, 'ECRRepositoryName', {
      repositoryName: props.serviceName,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const buildSpec = yaml.parse(fs.readFileSync(path.join(__dirname, './buildspec/buildspec-ci-all.yaml'), 'utf8'));

    const buildProject = new codebuild.PipelineProject(this, 'CIESBuildProject', {
      buildSpec: codebuild.BuildSpec.fromObject(buildSpec),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3, // for arm64/v8 cpu platform
        privileged: true,
      },
      environmentVariables: {
        REPOSITORY_URI: { value: ecrRepository.repositoryUri },
        AWS_DEFAULT_REGION: { value: cdk.Stack.of(this).region },
        AWS_ACCOUNT_ID: { value: cdk.Stack.of(this).account },
      },
      // Note: Invalid cache type: local caching is not supported for projects with environment type ARM_CONTAINER and compute type BUILD_GENERAL1_LARGE
      cache: codebuild.Cache.local(codebuild.LocalCacheMode.DOCKER_LAYER),
    });

    ecrRepository.grantPullPush(buildProject.grantPrincipal);

    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Build',
      input: sourceOutput,
      outputs: [buildOutput],
      project: buildProject,
    });

    const artifactS3 = s3.Bucket.fromBucketName(this, 'SourceS3', props.artifactBucketName);

    // 1.2 Codecommit Pipeline
    const pipeline = new codepipeline.Pipeline(this, 'CodeCommitPipeline', {
      pipelineName: `${props.serviceName}-pipeline`,
      artifactBucket: artifactS3,
    });
    pipeline.addStage({ stageName: 'Source' }).addAction(CodeCommitSourceAction);
    pipeline.addStage({ stageName: 'ImageBuild' }).addAction(buildAction);


    // 2. Build Stage


    // 3. CFN Build Stage
    /* const cfnSpec = yaml.parse(fs.readFileSync(path.join(__dirname, './buildspec/buildspec-cfn.yaml'), 'utf8'));

    const cfnProject = new codebuild.PipelineProject(this, 'CfnBuildProject', {
      buildSpec: codebuild.BuildSpec.fromObject(cfnSpec),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_3_0, // for arm64/v8 cpu platform
        privileged: true,
      },
      environmentVariables: {
        IMAGE_URI: { value: ecrRepository.repositoryUri },
        AWS_DEFAULT_REGION: { value: cdk.Stack.of(this).region },
        AWS_ACCOUNT_ID: { value: cdk.Stack.of(this).account },
        AWS_ECS_CLUSTER: { value: `${props.projectName}-ecs-${props.environment}-cluster`},
        AWS_VPC: { value: props.existingVpcId },
        AWS_ELB: { value: props.existingALBArn },
        IMAGE_TAG: { value: buildAction.variable('IMAGE_TAG')}
      },
    });

    const cfnBuildOutput = new codepipeline.Artifact('ExtrancedCfn');

    const cfnAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'CfnBuildAction',
      input: sourceOutput,
      outputs: [cfnBuildOutput],
      project: cfnProject,
    });

    const cfnBuildStage = pipeline.addStage({ stageName: 'CfnBuild' });
    cfnBuildStage.addAction(cfnAction);

    // 4. Deployment Stage: create and deploy changeset with manual approval
    const stackName = 'OurStack';
    const changeSetName = 'StagedChangeSet';

    const deployStage = pipeline.addStage({ stageName: 'DeployStage', actions: [
      new codepipeline_actions.CloudFormationCreateReplaceChangeSetAction({
        actionName: 'PrepareChanges',
        stackName,
        changeSetName,
        adminPermissions: true,
        templatePath: sourceOutput.atPath('cloudformation.yml'),
        runOrder: 1,
      }),
      new codepipeline_actions.ManualApprovalAction({
        actionName: 'ApproveChanges',
        runOrder: 2,
      }),
      new codepipeline_actions.CloudFormationExecuteChangeSetAction({
        actionName: 'ExecuteChanges',
        stackName,
        changeSetName,
        runOrder: 3,
      }),

    ]});
    const compose2CFStage = pipeline.addStage({ stageName: 'CfnBuild' });
    compose2CFStage.addAction(cfnAction);

     */

    new CDConstruct(this, 'CDFromCodecommit', {
      imageTag: buildAction.variable('IMAGE_TAG'),
      pipeline: pipeline,
      projectName: props.projectName,
      environment: props.environment,
      serviceName: props.serviceName,
      deployTargetType: props.envType,
      approvalStage: 'true',
      sourceArtifact: props.artifactBucketName,
      buildOutput: buildOutput,
    });

    this.sourceOutput = sourceOutput;
    this.buildOutput = buildOutput;
    this.IMAGE_TAG = buildAction.variable('IMAGE_TAG');

  }

}