import * as cdk from 'aws-cdk-lib';
import * as codedeploy from 'aws-cdk-lib/aws-codedeploy';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs/lib/construct';


//import { CDConstruct } from './cd-construct';


export interface StackNameProps extends cdk.StackProps {

}

export class CodedeployEc2Product extends servicecatalog.ProductStack {
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
              'ServiceName',
              'DeployStage',
            ],
          },
          {
            Label: {
              default: 'ELB & ASG Information',
            },
            Parameters: [
              'TargetGroupArn',
              'LoadBalancerArn',
              'ASGName',
            ],
          },
          
          {
            Label: {
              default: 'Deploy Information',
            },
            Parameters: [
              'DeployType',
              'NameTags',
            ],
          },
        ],
      },
    };

    // Informations of Tag Convention
    const stage = new cdk.CfnParameter(this, 'DeployStage', {
      description: 'Deploy Stage Environment',
      type: 'String',
      default: 'dev',
      allowedValues: ['dmz', 'dev', 'shared', 'prod'],
    });

    const serviceName = new cdk.CfnParameter(this, 'ServiceName', {
      type: 'String',
      description: 'Service Name',
      default: 'demoapp',
    });

    const targetGroupArn = new cdk.CfnParameter(this, 'TargetGroupArn', {
        type: 'String',
        description: 'Target Group Arn',
    });

    const loadBalancerArn = new cdk.CfnParameter(this, 'LoadBalancerArn', {
        type: 'String',
        description: 'Load Balancer Arn',
    });

    const asgName = new cdk.CfnParameter(this, 'ASGName', {
        type: 'String',
        description: 'Autoscaling Group Name',
    });

    const deployType = new cdk.CfnParameter(this, 'DeployType', {
      type: 'String',
      description: 'The compute platform that CodeDeploy deploys the application to',
      default: 'Server',
      allowedValues: ['ECS', 'Lambda', 'Server'],
    });

    /* const tags = new cdk.CfnParameter(this, 'NameTags', {
        type: 'CommaDelimitedList',
        description: 'Name Tag value for Deployment Group' 
    }) */

    const ECSTypeCondition = new cdk.CfnCondition(this, 'ECSTypeCondition', {
      expression: cdk.Fn.conditionEquals(deployType.valueAsString, 'ECS'),
    });

    const LambdaTypeCondition = new cdk.CfnCondition(this, 'LambdaTypeCondition', {
      expression: cdk.Fn.conditionEquals(deployType.valueAsString, 'Lambda'),
    });

    const ServerTypeCondition = new cdk.CfnCondition(this, 'ServerTypeCondition', {
      expression: cdk.Fn.conditionEquals(deployType.valueAsString, 'Server'),
    });

    const asg = autoscaling.AutoScalingGroup.fromAutoScalingGroupName(this, 'ASG', asgName.valueAsString); 

    const targetGroup = elbv2.ApplicationTargetGroup.fromTargetGroupAttributes(this, 'TargetGroup', {
        targetGroupArn: targetGroupArn.valueAsString,
        loadBalancerArns: loadBalancerArn.valueAsString
    });

    // ECS Deployment Group
    const ecsApp = new codedeploy.EcsApplication(this, 'ECSApplication', {
        applicationName: `${serviceName.valueAsString}-${stage.valueAsString}`, // optional property
    });
    (ecsApp.node.defaultChild as codedeploy.CfnApplication).cfnOptions.condition = ECSTypeCondition;

    const ecsDeploymentConfig = new codedeploy.ServerDeploymentConfig(this, 'ECSDeploymentConfiguration', {
        deploymentConfigName: `${serviceName.valueAsString}-${stage.valueAsString}-deployconfig`, // optional property
        // one of these is required, but both cannot be specified at the same time
        minimumHealthyHosts: codedeploy.MinimumHealthyHosts.percentage(50),
        // minimumHealthyHosts: codedeploy.MinimumHealthyHosts.percentage(75),
    });
    (ecsDeploymentConfig.node.defaultChild as codedeploy.CfnDeploymentConfig).cfnOptions.condition = ECSTypeCondition;

    codedeploy.EcsDeploymentGroup.fromEcsDeploymentGroupAttributes(
      this, 'EcsDeployGroup', {
        application: ecsApp,
        deploymentGroupName: `${serviceName.valueAsString}-${stage.valueAsString}-deploygroup`,
        deploymentConfig: ecsDeploymentConfig,
      }
    );
    /* const ecsDeployGroup = new codedeploy.EcsDeploymentGroup(this, 'ECSDeploymentGroup', {
        application: ecsApp,
        deploymentGroupName: `${serviceName.valueAsString}-${stage.valueAsString}-deploygroup`,
        deploymentConfig: ecsDeploymentConfig,
    }); */
    //(ecsDeployGroup.node.defaultChild as codedeploy.CfnDeploymentConfig).cfnOptions.condition = ECSTypeCondition;


    // Lambda Deployment Group
    const lambdaApp = new codedeploy.LambdaApplication(this, 'LambdaApplication', {
        applicationName: `${serviceName.valueAsString}-${stage.valueAsString}`, // optional property
    });
    (lambdaApp.node.defaultChild as codedeploy.CfnApplication).cfnOptions.condition = LambdaTypeCondition;


    // Server Deployment Group
    const serverApp = new codedeploy.ServerApplication(this, 'ServerApplication', {
        applicationName: `${serviceName.valueAsString}-${stage.valueAsString}`, // optional property
    });
    (serverApp.node.defaultChild as codedeploy.CfnApplication).cfnOptions.condition = ServerTypeCondition;

    const serverDeploymentConfig = new codedeploy.ServerDeploymentConfig(this, 'ServerDeploymentConfiguration', {
        deploymentConfigName: `${serviceName.valueAsString}-${stage.valueAsString}-deployconfig`, // optional property
        // one of these is required, but both cannot be specified at the same time
        minimumHealthyHosts: codedeploy.MinimumHealthyHosts.percentage(50),
        // minimumHealthyHosts: codedeploy.MinimumHealthyHosts.percentage(75),
    });
    (serverDeploymentConfig.node.defaultChild as codedeploy.CfnDeploymentConfig).cfnOptions.condition = ServerTypeCondition;

    const serverDeployGroup = new codedeploy.ServerDeploymentGroup(this, 'ServerDeploymentGroup', {
        application: serverApp,
        deploymentGroupName: `${serviceName.valueAsString}-${stage.valueAsString}-deploygroup`,
        autoScalingGroups: [asg],
        // adds User Data that installs the CodeDeploy agent on your auto-scaling groups hosts
        // default: true
        installAgent: false,
        // adds EC2 instances matching tags
        ec2InstanceTags: new codedeploy.InstanceTagSet(
          {
            // any instance with tags satisfying
            // key1=v1 or key1=v2 or key2 (any value) or value v3 (any key)
            // will match this group
            //'Name': tags.valueAsList,
            'ServiceName': [serviceName.valueAsString],
          },
        ),

        ignorePollAlarmsFailure: false,
        // auto-rollback configuration
        autoRollback: {
            failedDeployment: true, // default: true
            stoppedDeployment: true, // default: false
            deploymentInAlarm: false, // default: true if you provided any alarms, false otherwise
        },
        loadBalancer: codedeploy.LoadBalancer.application(targetGroup),
        deploymentConfig: serverDeploymentConfig,
    });
    (serverDeployGroup.node.defaultChild as codedeploy.CfnDeploymentGroup).cfnOptions.condition = ServerTypeCondition;

    
  }
}