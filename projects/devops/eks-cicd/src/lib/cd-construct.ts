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
  codebuildAction: codepipeline_actions.CodeBuildAction;
  projectName: string;
  environment: string;
  serviceName: string;
  gitOpsUrl: string;
  deployTargetType: string;
  approvalStage: string;
  pipeline: codepipeline.Pipeline;
  buildOutput: codepipeline.Artifact;
}

export class CDConstruct extends Construct {
  constructor(scope: Construct, id: string, props: CDConstructProps) {
    super(scope, id);

    const deployBuildSpec = yaml.parse(fs.readFileSync(path.join(__dirname, './buildspec/buildspec-cd.yaml'), 'utf8'));

    const deployProject = new codebuild.PipelineProject(this, 'CodeBuildDeployPloject', {
      buildSpec: codebuild.BuildSpec.fromObject(deployBuildSpec),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
        privileged: true,
      },
      environmentVariables: {
        REPOSITORY_URI: { value: props.gitOpsUrl },
        PROJECT_NAME: { value: props.projectName },
        SERVICE_NAME: { value: props.serviceName },
        ENVIRONMENT: { value: props.environment },
        DEPLOY_ENV_NAME: { value: `${props.projectName}-${props.deployTargetType}-${props.environment}` },
        AWS_DEFAULT_REGION: { value: cdk.Stack.of(this).region },
        AWS_ACCOUNT_ID: { value: cdk.Stack.of(this).account },
        TARGET_TYPE: { value: props.deployTargetType },
      },
      role: iam.Role.fromRoleArn(this, 'CodeBuildServiceRole', 'arn:aws:iam::484752921218:role/CodeBuildServiceRole'),
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
        'cloudformation:*',
        'eks:*'],
    }));

    if (props.approvalStage === 'true') {
      const approvalAction = new codepipeline_actions.ManualApprovalAction({ actionName: 'Approval' });
      props.pipeline.addStage( { stageName: 'Approval', actions: [approvalAction] });
    }

    const deployAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Deploy',
      input: props.buildOutput,
      project: deployProject,

      environmentVariables: {
        IMAGE_TAG: { value: props.codebuildAction.variable('IMAGE_TAG') },
      },
    });
    props.pipeline.addStage( { stageName: 'Deploy', actions: [deployAction] });


  }
}