import fs from 'fs';
import path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as iam from 'aws-cdk-lib/aws-iam';

import { Construct } from 'constructs/lib/construct';
import * as randomstring from 'randomstring';
import yaml from 'yaml';


export interface StackNameProps extends cdk.StackProps {
  pipeline: codepipeline.Pipeline;
  projectName: string;
  environment: string;
  repoName: string;
  repoOwner: string;
  serviceName: string;
  sourceArtifact: codepipeline.Artifact;
  buildType: string;
  envType: string;
  enableAutoSync: string;
}

export class ArgoCDConstruct extends Construct {

  constructor(scope: Construct, id: string, props: StackNameProps) {
    super(scope, id);

    // Prerequisites CodePipeline
    /* const sourceOutput = new codepipeline.Artifact('Source');

    // SourceAction
    // 1.1 Github Source Action
    const githubSourceAction = new codepipeline_actions.GitHubSourceAction({
      actionName: 'GITHUB',
      owner: props.repoOwner,
      repo: props.repoName,
      branch: props.repoBranch,
      oauthToken: cdk.SecretValue.secretsManager(props.secretKey),
      output: sourceOutput,
    });

    const artifactS3 = s3.Bucket.fromBucketName(this, 'SourceS3', props.sourceArtifact);

    // 1.1 Github Pipeline
    const githubPipeline = new codepipeline.Pipeline(this, 'GitHub', {
      pipelineName: `${props.serviceName}-gitops-pipeline`,
      artifactBucket: artifactS3,
    });

    artifactS3.grantReadWrite(githubPipeline.role);

    githubPipeline.addStage({ stageName: 'SOURCE' }).addAction(githubSourceAction); */
    props.pipeline.addStage({
      stageName: `CD-${randomstring.generate(5)}`,
      //stageName: cdk.Lazy.string({ produce:() => `ArgoCD-${props.environment})`}),
      actions: [this.createAndSyncApplication(
        props.projectName, props.environment, props.serviceName,
        props.repoName, props.repoOwner, props.sourceArtifact, props.enableAutoSync )],
    });
    /* githubPipeline.addStage({
      stageName: 'ArgoCDProd',
      actions: [this.createAndSyncApplication(
        props.projectName, props.environment, props.serviceName, sourceOutput)],
    }); */

  }

  private createAndSyncApplication(
    projectName:string,
    environment:string,
    serviceName: string,
    repoName: string,
    repoOwner: string,
    sourceOutput: codepipeline.Artifact,
    enableAutoSync: string,
  ) : codepipeline_actions.CodeBuildAction {

    const randomString = randomstring.generate(5);

    const buildSpec = yaml.parse(fs.readFileSync(
      path.join(__dirname, './buildspec/buildspec-argocd.yaml'), 'utf8'));

    const buildProject = new codebuild.PipelineProject(this, `ArgoCD-${randomString}`, {
      buildSpec: codebuild.BuildSpec.fromObject(buildSpec),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3, // for arm64/v8 cpu platform
        privileged: true,
      },
      environmentVariables: {
        PROJECT_NAME: { value: projectName },
        ENVIRONMENT: { value: environment },
        REPO_NAME: { value: repoName },
        REPO_OWNER: { value: repoOwner },
        AWS_DEFAULT_REGION: { value: cdk.Stack.of(this).region },
        AWS_ACCOUNT_ID: { value: cdk.Stack.of(this).account },
        BUILD_TYPE: { value: 'DOCKER' },
        TARGET_TYPE: { value: 'eks' },
        SERVICE_NAME: { value: serviceName },
        ENABLE_AUTOSYNC: { value: enableAutoSync },
      },
      role: iam.Role.fromRoleArn(this, 'CodeBuildServiceRole', 'arn:aws:iam::484752921218:role/CodeBuildServiceRole'),
    });

    var buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Build',
      input: sourceOutput,
      project: buildProject,
    });

    return buildAction;
  }
}