//import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as cdk from 'aws-cdk-lib';
import * as eb from 'aws-cdk-lib/aws-elasticbeanstalk';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs/lib/construct';
//import { CIConstructV2 } from '../devops/cicd/ci-construct-v2';
//import { CDEBConstruct } from './cd-eb-construct';
//import { CIConstruct } from './ci-construct';

export interface ckProps extends cdk.StackProps {

}

export class SCProductBeanstalkDockerStack extends servicecatalog.ProductStack {
  constructor(scope: Construct, id: string, props: ckProps) {
    super(scope, id );

    console.log(props);

    this.templateOptions.metadata = {
      'AWS::CloudFormation::Interface': {
        ParameterGroups: [
          {
            Label: {
              default: 'Information of Tag Convention',
            },
            Parameters: [
              'ProjectName',
              'Environment',
              'ServiceName',
            ],
          },
          {
            Label: {
              default: 'VPC Configuration',
            },
            Parameters: [
              'TargetSubnets',
              'TargetSubnet1',
              'TargetSubnet2',
              'VpcId',
            ],
          },
          {
            Label: {
              default: 'ALB Configuration',
            },
            Parameters: [
              'NoLoadBalancer',
              'SharedLoadBalancer',
              'ELBArn',
              'ELBSecurityGroupId',
              'PathPattern',
              'HostHeader',
            ],
          },
          {
            Label: {
              default: 'EB Environment Configuration',
            },
            Parameters: [
              'E2InstanceType',
              'TGHealthCheckPath',
              'EBPlatformType',
            ],
          },
        ],
      },
    };

    // Informations of Tag Convention
    const projectName = new cdk.CfnParameter(this, 'ProjectName', {
      description: 'The name of the Project Name',
      type: 'String',
      default: 'acme',
    });

    const Environment = new cdk.CfnParameter(this, 'Environment', {
      description: 'The name of the Environment',
      type: 'String',
      default: 'dev',
      allowedValues: ['dmz', 'dev', 'shared', 'prod'],
    });

    const vpcId = new cdk.CfnParameter(this, 'VpcId', {
      type: 'AWS::EC2::VPC::Id',
      description: 'VPC ID ',
    });

    const targetSubnet1 = new cdk.CfnParameter(this, 'TargetSubnet1', {
      type: 'AWS::EC2::Subnet::Id',
      description: ' target subnet for the elastic beanstalk',
    });

    const targetSubnet2 = new cdk.CfnParameter(this, 'TargetSubnet2', {
      type: 'AWS::EC2::Subnet::Id',
      description: ' target subnet for the elastic beanstalk',
    });

    const instanceType = new cdk.CfnParameter(this, 'E2InstanceType', {
      type: 'String',
      description: 'Instance Type of EB EC2',
      default: 't3.medium',
      allowedValues:
        //['t4g.micro', 't3a.micro', 't3a.small', 't3a.medium', 't3a.large', 'm5a.micro', 'm5a.small', 'm5a.medium', 'm5a.large'],
        ['t3.micro', 't3.small', 't3.medium', 't3.large', 't3.xlarge', 'm6i.large', 'm6i.xlarge', 'm5.large', 'm5.xlarge'],
    });

    const platformType = new cdk.CfnParameter(this, 'EBPlatformType', {
      type: 'String',
      description: 'Elastic Beanstalk supports the following Tomcat platform versions',
      default: '64bit Amazon Linux 2 v4.3.0 running Tomcat 8.5 Corretto 11',
      allowedValues:
        [
          '64bit Amazon Linux 2 v3.4.0 running Corretto 17',
          '64bit Amazon Linux 2 v3.4.0 running Corretto 11',
          '64bit Amazon Linux 2 v3.4.0 running Corretto 8',
          '64bit Amazon Linux 2 v4.3.0 running Tomcat 8.5 Corretto 11',
          '64bit Amazon Linux 2 v4.3.0 running Tomcat 8.5 Corretto 8',
          '64bit Amazon Linux 2 v3.5.0 running Docker',
          '64bit Amazon Linux 2 v3.2.0 running ECS',
          '64bit Amazon Linux 2 v2.3.4 running .NET Core',
          '64bit Windows Server 2019 v2.10.4 running IIS 10.0',
          '64bit Windows Server Core 2019 v2.10.4 running IIS 10.0',
          '64bit Amazon Linux 2 v5.6.0 running Node.js 16',
          '64bit Amazon Linux 2 v5.6.0 running Node.js 14',
          '64bit Amazon Linux 2 v3.5.0 running PHP 8.1',
          '64bit Amazon Linux 2 v3.5.0 running PHP 8.0',
          '64bit Amazon Linux 2 v3.4.0 running Python 3.8',
          '64bit Amazon Linux 2 v3.4.0 running Python 3.7',
        ],
    });


    const tgListenerPort = new cdk.CfnParameter(this, 'TGListenerPort', {
      type: 'String',
      description: 'The port on which ALB listens for requests',
      default: '80',
    });

    const tgHealthCheckPath = new cdk.CfnParameter(this, 'TGHealthCheckPath', {
      type: 'String',
      description: 'Health Check Path for EB Application',
      default: '/health',
    });
    /* const tgHealthCheckPort = new cdk.CfnParameter(this, 'TGHealthCheckPort', {
      type: 'Number',
      description: 'Health Check Path for ECS Container',
      default: 80,
    }); */

    const ElbArn = new cdk.CfnParameter(this, 'ELBArn', {
      description: 'the ARN of ELB ',
      type: 'String',
    });

    const elbSgId = new cdk.CfnParameter(this, 'ELBSecurityGroupId', {
      type: 'AWS::EC2::SecurityGroup::Id',
      description: 'SecurityGroupId of ELB',
    });

    const serviceName = new cdk.CfnParameter(this, 'ServiceName', {
      type: 'String',
      description: 'This will set the Container, Task Definition, and Service name in Fargate',
      default: 'amazon-ecs-sample',
    });

    const processListenerPort = new cdk.CfnParameter(this, 'ProcessListenerPort', {
      type: 'String',
      description: 'The Port that the process listens on',
      default: '80',
    });

    /* const ECRRepoName = new cdk.CfnParameter(this, 'ECRRepoName', {
      type: 'String',
      description: 'Name of Amazon Elastic Container Registry',
      default: 'amazon/amazon-ecs-sample',
    }); */

    const pathPattern = new cdk.CfnParameter(this, 'PathPattern', {
      type: 'String',
      description: 'ALB Path Pattern (/, /health)',
      default: '/',
    });

    const hostHeader = new cdk.CfnParameter(this, 'HostHeader', {
      type: 'String',
      description: 'ALB Host Header (test.example.com)',
      default: 'test.example.com',
    });

    /*  const provider = new cdk.CfnParameter(this, 'SourceProviderType', {
      type: 'String',
      description: 'Source Provider Type',
      default: 'GITHUB',
      allowedValues: ['GITHUB', 'CODECOMMIT', 'S3'],
    }); */

    const noLoadbalancer = new cdk.CfnParameter(this, 'NoLoadBalancer', {
      description: 'Set to SingleInstance to launch one EC2 instance with no load balancer',
      type: 'String',
      default: 'LoadBalanced',
      allowedValues: ['LoadBalanced', 'SingleInstance'],
    });

    const SharedLoadbalancer = new cdk.CfnParameter(this, 'SharedLoadBalancer', {
      description: 'Specifies whether the environments load balancer is dedicated or shared',
      type: 'String',
      default: 'true',
      allowedValues: ['true', 'false'],
    });

    const cnamePrefix = new cdk.CfnParameter(this, 'CNAMEPrefix', {
      description: '(Optional) The Domain name prefix for the Elastic Beanstalk URL. Leave this blank to use an autogenerated value',
      type: 'String',
      default: '',
    });

    const cnamePrefixCondition = new cdk.CfnCondition(this, 'CnamePrefixCondition', {
      expression: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(cnamePrefix.valueAsString, '')),
    });

    // Create EB Application Security Group
    /*
    const ebSg = new ec2.CfnSecurityGroup(this, 'EBSecurityGroup', {
      vpcId: vpcId.valueAsString,
      groupDescription: `Access to the ElasticBeanstalk Application ${serviceName.valueAsString}`,
      groupName: `${Environment.valueAsString}-eb-${serviceName.valueAsString}-sg`,
    });
    */
    /* new ec2.CfnSecurityGroupIngress(this, 'ECSSecurityGroupIngressFromALB', {
      ipProtocol: '-1',
      description: 'Ingress from the ALB',
      groupId: ebSg.attrGroupId,
      sourceSecurityGroupId: elbSgId.valueAsString,
    }); */

    // beanstalk project setup
    const ebApp = new eb.CfnApplication(this, 'EBApplication', {
      applicationName: `${serviceName.valueAsString}-${Environment.valueAsString}`,
      description: `${Environment.valueAsString} ${serviceName.valueAsString} EB Application`,
    });

    // Create EC2 Instance Role
    const ec2ProfileRole = new iam.Role(this, 'Ec2InstanceProfileRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      roleName: `${Environment.valueAsString}-${serviceName.valueAsString}-ec2-instance-profile`,
    });

    ec2ProfileRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));
    ec2ProfileRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'));
    ec2ProfileRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkWebTier'));
    ec2ProfileRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkMulticontainerDocker'));
    ec2ProfileRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkWorkerTier'));
    ec2ProfileRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryFullAccess'));
    ec2ProfileRole.addToPolicy(new iam.PolicyStatement({
      resources: ['*'],
      actions: [
        's3:Get*',
        's3:List*',
      ],
    }));

    const beanstalkEC2Instance = new iam.CfnInstanceProfile(this, 'InstanceProfile', {
      roles: [ec2ProfileRole.roleName],
      instanceProfileName: `${Environment.valueAsString}-${serviceName.valueAsString}-ec2-instance-profile`,
    });

    // Create Beanstalk Instance Role
    const ebServiceRole = new iam.Role(this, 'EBServiceRole', {
      assumedBy: new iam.ServicePrincipal('elasticbeanstalk.amazonaws.com'),
      //roleName: `${Environment.valueAsString}-${serviceName.valueAsString}-eb-service-role`,
    });

    ebServiceRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSElasticBeanstalkEnhancedHealth'));
    //ebServiceRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('aws-service-role/AWSElasticBeanstalkServicePolicy'));
    ebServiceRole.addToPolicy(new iam.PolicyStatement({
      resources: ['*'],
      actions: [
        's3:Get*',
        's3:List*',
      ],
    }));

    // Option Setting for EB Enviornment
    const option_settings: eb.CfnEnvironment.OptionSettingProperty[] = [
      {
        namespace: 'aws:ec2:vpc',
        optionName: 'VPCId',
        value: vpcId.valueAsString,
      },
      {
        namespace: 'aws:ec2:vpc',
        optionName: 'Subnets',
        //value: targetSubnets.valueAsList.join(),
        value: cdk.Lazy.string({ produce: () => targetSubnet1.valueAsString + ',' + targetSubnet2.valueAsString }),
        //value: 'subnet-1234,subnet-34556',
      },
      {
        namespace: 'aws:elasticbeanstalk:environment',
        optionName: 'LoadBalancerType',
        value: 'application',
      },

      {
        namespace: 'aws:elasticbeanstalk:environment',
        optionName: 'LoadBalancerIsShared',
        value: SharedLoadbalancer.valueAsString,
      },
      {
        namespace: 'aws:elasticbeanstalk:environment',
        optionName: 'EnvironmentType',
        value: noLoadbalancer.valueAsString,
      },
      {
        namespace: 'aws:elasticbeanstalk:environment',
        optionName: 'ServiceRole',
        value: ebServiceRole.roleName,
      },
      {
        namespace: 'aws:elbv2:loadbalancer',
        optionName: 'SharedLoadBalancer',
        value: ElbArn.valueAsString,
      },
      /* {
        namespace: 'aws:elbv2:loadbalancer',
        optionName: 'ManagedSecurityGroup',
        value: elbSgId.valueAsString,
      }, */
      {
        namespace: 'aws:elbv2:loadbalancer',
        optionName: 'SecurityGroups',
        value: elbSgId.valueAsString,
      },
      {
        namespace: `aws:elbv2:listener:${tgListenerPort.valueAsString}`,
        optionName: 'Rules',
        value: 'hostheaders,pathpatterns',
      },
      {
        namespace: 'aws:elasticbeanstalk:application:environment',
        optionName: 'Port',
        value: processListenerPort.valueAsString,
      },
      /* {
        namespace: 'aws:elasticbeanstalk:environment:process:default',
        optionName: 'Port',
        value: processListenerPort.valueAsString,
      },
      {
        namespace: 'aws:elasticbeanstalk:environment:process:default',
        optionName: 'Protocol',
        value: 'HTTP',
      }, */
      {
        namespace: 'aws:elbv2:listenerrule:hostheaders',
        optionName: 'HostHeaders',
        value: hostHeader.valueAsString,
      },
      {
        namespace: 'aws:elbv2:listenerrule:hostheaders',
        optionName: 'priority',
        value: '100',
      },
      {
        namespace: 'aws:elbv2:listenerrule:pathpatterns',
        optionName: 'PathPatterns',
        value: pathPattern.valueAsString,
      },
      {
        namespace: 'aws:elbv2:listenerrule:pathpatterns',
        optionName: 'Priority',
        value: '200',
      },
      {
        namespace: 'aws:elasticbeanstalk:environment:process:default',
        optionName: 'HealthCheckPath',
        value: tgHealthCheckPath.valueAsString,
      },
      {
        namespace: 'aws:elasticbeanstalk:application',
        optionName: 'Application Healthcheck URL',
        value: tgHealthCheckPath.valueAsString,
      },
      {
        namespace: 'aws:autoscaling:trigger',
        optionName: 'MeasureName',
        value: 'CPUUtilization',
      },
      {
        namespace: 'aws:autoscaling:trigger',
        optionName: 'Statistic',
        value: 'Average',
      },
      {
        namespace: 'aws:autoscaling:trigger',
        optionName: 'Unit',
        value: 'Percent',
      },
      {
        namespace: 'aws:autoscaling:trigger',
        optionName: 'LowerThreshold',
        value: '20',
      },
      {
        namespace: 'aws:autoscaling:trigger',
        optionName: 'UpperThreshold',
        value: '70',
      },
      {
        namespace: 'aws:autoscaling:asg',
        optionName: 'MaxSize',
        value: '5',
      },
      {
        namespace: 'aws:autoscaling:asg',
        optionName: 'MinSize',
        value: '1',
      },
      /* {
        namespace: 'aws:autoscaling:asg',
        optionName: 'Custom Availability Zones',
        value: 'ap-northeast-2a,ap-northeast-2c',
      }, */
      {
        namespace: 'aws:ec2:instances',
        optionName: 'InstanceTypes',
        value: instanceType.valueAsString,
      },
      {
        namespace: 'aws:autoscaling:launchconfiguration',
        optionName: 'IamInstanceProfile',
        value: beanstalkEC2Instance.instanceProfileName,
      },
      {
        namespace: 'aws:autoscaling:launchconfiguration',
        optionName: 'RootVolumeType',
        value: 'gp3',
      },
      {
        namespace: 'aws:autoscaling:launchconfiguration',
        optionName: 'RootVolumeSize',
        value: '30',
      },
      /*
      {
        namespace: 'aws:elasticbeanstalk:container:tomcat:jvmoptions',
        optionName: 'Xms',
        value: '2048m',
      },
      {
        namespace: 'aws:elasticbeanstalk:container:tomcat:jvmoptions',
        optionName: 'Xmx',
        value: '2048m',
      },
      */
      {
        namespace: 'aws:elasticbeanstalk:cloudwatch:logs',
        optionName: 'StreamLogs',
        value: 'true',
      },
      {
        namespace: 'aws:elasticbeanstalk:cloudwatch:logs',
        optionName: 'RetentionInDays',
        value: '7',
      },
    ];

    const condResult = cdk.Fn.conditionIf(cnamePrefixCondition.logicalId, cnamePrefix.valueAsString, cdk.Aws.NO_VALUE);

    const ebEnv = new eb.CfnEnvironment(this, 'EBEnvironment', {
      // default environmentName is `develop`
      environmentName: `${projectName.valueAsString}-beanstalk-${Environment.valueAsString}-${serviceName.valueAsString}`,
      applicationName: `${serviceName.valueAsString}-${Environment.valueAsString}`,
      //applicationName: ebApp.applicationName || `${serviceName.valueAsString}`,
      solutionStackName: platformType.valueAsString,
      optionSettings: option_settings,
      cnamePrefix: condResult.toString(),
    });
    ebEnv.addDependsOn(ebApp);

    //new CIConstructV2(this, 'CIStack', { serviceName: serviceName.valueAsString });
    /* const ci = new CIConstruct(this, 'CI', { serviceName: serviceName.valueAsString, sourceProvider: provider.valueAsString });

    new CDEBConstruct(this, 'CDEB', {
      pipeline: ci.pipeline,
      serviceName: `${serviceName.valueAsString}`,
      targetEnv: `${Environment.valueAsString}-${serviceName.valueAsString}-env`,
      targetType: 'BEANSTALK',
      imageTag: 'latest',
      buildOutput: ci.buildOutput,
    }); */

    // Output
    /* new cdk.CfnOutput(this, 'LoadBalancerURL', {
      description: 'LoadBalancer URL',
      value: ebEnv.attrEndpointUrl,
    });
 */ new cdk.CfnOutput(this, 'ApplicationName', {
      description: 'EB ApplicationName',
      value: ebApp.applicationName ?? 'sampleApp',
    });
    new cdk.CfnOutput(this, 'EnvironmentName', {
      description: 'EB Environment Name',
      value: ebEnv.environmentName ?? 'eb-sampleApp',
    });

  }
}