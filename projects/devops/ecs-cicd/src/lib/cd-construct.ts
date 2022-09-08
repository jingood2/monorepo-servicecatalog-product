import * as fs from 'fs';
import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs/lib/construct';

import * as yaml from 'yaml';

export interface CDConstructProps {
  imageTag: string;
  projectName: string;
  environment: string;
  serviceName: string;
  ecrRepoName?: string;
  containerPort?: number; // only use beanstalk
  //deployEnvName: string;
  deployTargetType: string;
  approvalStage: string;
  pipeline: codepipeline.Pipeline;
  sourceArtifact: string;
  buildOutput: codepipeline.Artifact;
}

export class CDConstruct extends Construct {
  constructor(scope: Construct, id: string, props: CDConstructProps) {
    super(scope, id);

    /* const sourceOutput = new codepipeline.Artifact('Source');
    const buildOutput = new codepipeline.Artifact('Build');


    // CfnConditions
    const isLatestTag = new cdk.CfnCondition(this, 'TargetImageTag', {
      expression: cdk.Fn.conditionEquals(props.imageTag, 'latest'),
    }); */

    const deployBuildSpec = yaml.parse(fs.readFileSync(path.join(__dirname, './buildspec/buildspec-cd.yaml'), 'utf8'));

    const deployProject = new codebuild.PipelineProject(this, 'CodeBuildDeployPloject', {
      buildSpec: codebuild.BuildSpec.fromObject(deployBuildSpec),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
        privileged: true,
      },
      environmentVariables: {
        //REPOSITORY_URI: { value: ecrRepository.repositoryUri },
        SERVICE_NAME: { value: props.serviceName },
        DEPLOY_ENV_NAME: { value: `${props.projectName}-${props.deployTargetType}-${props.environment}` },
        AWS_DEFAULT_REGION: { value: cdk.Stack.of(this).region },
        AWS_ACCOUNT_ID: { value: cdk.Stack.of(this).account },
        ARTIFACT_BUCKET: { value: props.sourceArtifact },
        IMAGE_TAG: { value: props.imageTag },
        TARGET_TYPE: { value: props.deployTargetType },
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

    if (props.approvalStage === 'true') {
      const approvalAction = new codepipeline_actions.ManualApprovalAction({ actionName: 'Approval' });
      props.pipeline.addStage( { stageName: 'Approval', actions: [approvalAction] });
    }

    const deployAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Deploy',
      input: props.buildOutput,
      project: deployProject,
    });
    props.pipeline.addStage( { stageName: 'Deploy', actions: [deployAction] });


  }
}