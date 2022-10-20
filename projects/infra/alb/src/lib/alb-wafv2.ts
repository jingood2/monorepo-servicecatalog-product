import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs/lib/construct';

export interface ProductEProps extends cdk.StackProps {

}

export class ProductAlbStack extends servicecatalog.ProductStack {
  constructor(scope: Construct, id: string, _props: ProductEProps) {
    super(scope, id );

    this.templateOptions.metadata = {
      'AWS::CloudFormation::Interface': {
        ParameterGroups: [
          {
            Label: {
              default: 'Environment Information',
            },
            Parameters: [
              'ProjectName',
              'Environment',
            ],
          },
          {
            Label: {
              default: 'Network Information',
            },
            Parameters: [
              'TargetSubnets',
              'VpcId',
              'TargetSecurityGroupId',
              'AlbScheme',
            ],
          },
          {
            Label: {
              default: 'Integration Information',
            },
            Parameters: [
              'CertificateArn',
              'WAFV2Arn',
            ],
          },
        ],
      },
    };

    const projectName = new cdk.CfnParameter(this, 'ProjectName', {
      description: 'The name of the Project Name',
      type: 'String',
      default: 'acme',
    });

    const environment = new cdk.CfnParameter(this, 'Environment', {
      description: 'Environment',
      type: 'String',
      default: 'dev',
      allowedValues: ['dmz', 'dev', 'shared', 'prod'],
    });

    const targetSubnet = new cdk.CfnParameter(this, 'TargetSubnets', {
      type: 'List<AWS::EC2::Subnet::Id>',
      description: 'Launch application load balancer into these subnets',
    });

    const vpcId = new cdk.CfnParameter(this, 'VpcId', {
      type: 'AWS::EC2::VPC::Id',
      description: 'VPC ID for ECS Cluster',
    });

    /* const targetSgId = new cdk.CfnParameter(this, 'TargetSecurityGroupId', {
      type: 'AWS::EC2::SecurityGroup::Id',
      description: 'Target Security Group',
    }); */

    const scheme = new cdk.CfnParameter(this, 'AlbScheme', {
      type: 'String',
      description: 'select ALB Scheme',
      allowedValues: ['int', 'ext'],
      default: 'ext',
    });

    const certiArn = new cdk.CfnParameter(this, 'CertificateArn', {
      type: 'String',
      description: 'TLS certificate ARN for HTTPS ingress',
      default: 'input certiArn',
    });

    const wafV2Arn = new cdk.CfnParameter(this, 'WAFV2Arn', {
      description: 'WAF V2 Arn',
      default: '',
      type: 'String',
    });

    // Condition
    const useCertiCondition = new cdk.CfnCondition(this, 'UseCertificateArn', {
      expression: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(certiArn.valueAsString, '')),
    });
    const useWAF = new cdk.CfnCondition(this, 'UseWAFV2', {
      expression: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(wafV2Arn.valueAsString, '')),
    });

    // CfnMapping
    const schemeinfo = new cdk.CfnMapping(this, 'SchmeInfo', {
      mapping: {
        int: {
          scheme: 'internal',
        },
        ext: {
          scheme: 'internet-facing',
        },
      },
    });

    // Resources
    const albSg = new ec2.CfnSecurityGroup(this, 'AlbSG', {
      vpcId: vpcId.valueAsString,
      groupName: `${projectName.valueAsString}-${scheme.valueAsString}-${environment.valueAsString}-alb-sg`,
      groupDescription: `Access to the ${environment.valueAsString} ${scheme.valueAsString} load balancer`,
      securityGroupIngress: [{
        ipProtocol: '-1',
        cidrIp: '0.0.0.0/0',
        fromPort: 443,
      },
      {
        ipProtocol: '-1',
        cidrIp: '0.0.0.0/0',
        fromPort: 80,
      }],
    });

    const defaultSg = new ec2.CfnSecurityGroup(this, 'AllowIngressFromALB', {
      vpcId: vpcId.valueAsString,
      groupName: `${projectName.valueAsString}-${scheme.valueAsString}-${environment.valueAsString}-ingress-sg`,
      groupDescription: 'Default SG to Allow ingress from ALB',
    });

    new ec2.CfnSecurityGroupIngress(this, 'ECSSecurityGroupIngressFromALB', {
      ipProtocol: '-1',
      description: 'Ingress from the ALB',
      groupId: defaultSg.attrGroupId,
      sourceSecurityGroupId: albSg.ref,
    });

    //const dummyString = randomstring.generate(5);
    const dummyTg = new elbv2.CfnTargetGroup(this, 'DummyTG', {
      healthCheckEnabled: true,
      healthCheckIntervalSeconds: 6,
      healthCheckPath: '/',
      healthCheckTimeoutSeconds: 5,
      healthyThresholdCount: 2,
      port: 80,
      protocol: 'HTTP',
      name: `${projectName.valueAsString}-${scheme.valueAsString}-${environment.valueAsString}-default-tg`,
      unhealthyThresholdCount: 2,
      vpcId: vpcId.valueAsString,
    });

    const alb = new elbv2.CfnLoadBalancer(this, 'ApplicationLoadBalancer', /* all optional props */ {
      name: `${projectName.valueAsString}-alb-${environment.valueAsString}-${scheme.valueAsString}`,
      ipAddressType: 'ipv4',
      loadBalancerAttributes: [{
        key: 'idle_timeout.timeout_seconds',
        value: '30',
      }],
      scheme: schemeinfo.findInMap(scheme.valueAsString, 'scheme'),
      securityGroups: [albSg.ref],
      subnets: targetSubnet.valueAsList,
    });

    const httpsListener = new elbv2.CfnListener(this, 'HTTPSListener', {
      defaultActions: [{ targetGroupArn: dummyTg.ref, type: 'forward' }],
      loadBalancerArn: alb.ref,
      certificates: [{ certificateArn: certiArn.valueAsString }],
      port: 443,
      protocol: 'HTTPS',
    });
    httpsListener.cfnOptions.condition = useCertiCondition;

    const httpListener = new elbv2.CfnListener(this, 'HTTPListener', {
      defaultActions: [{ targetGroupArn: dummyTg.ref, type: 'forward' }],
      loadBalancerArn: alb.ref,
      port: 80,
      protocol: 'HTTP',
    });

    const webAclAssoc = new wafv2.CfnWebACLAssociation(this, 'WebACLAssociation', {
      resourceArn: alb.ref,
      webAclArn: wafV2Arn.valueAsString,
    });
    webAclAssoc.cfnOptions.condition = useWAF;

    // SSM parameter store
    new ssm.StringParameter(this, 'AlbDnsName', {
      parameterName: `/${environment.valueAsString}/alb/${scheme.valueAsString}/dnsname`,
      stringValue: alb.attrDnsName,
      simpleName: false,
    });

    new ssm.StringParameter(this, 'ALBArn', {
      parameterName: `/${environment.valueAsString}/alb/${scheme.valueAsString}/arn`,
      stringValue: alb.ref,
      simpleName: false,
    });

    new ssm.StringParameter(this, 'ALBSecurityGroupId', {
      parameterName: `/${environment.valueAsString}/alb/${scheme.valueAsString}/sgId`,
      stringValue: albSg.ref,
      simpleName: false,
    });

    const ssmHttpListener = new ssm.CfnParameter(this, 'HTTPSListenerArn', {
      type: 'String',
      name: `/${environment.valueAsString}/alb/${scheme.valueAsString}/httpsListener/arn`,
      value: httpsListener.attrListenerArn,
    });
    ssmHttpListener.cfnOptions.condition = useCertiCondition;

    new ssm.CfnParameter(this, 'HTTPListenerArn', {
      type: 'String',
      name: `/${environment.valueAsString}/alb/${scheme.valueAsString}/httpListener/arn`,
      value: httpListener.attrListenerArn,
    });


    // Cloudformation Output
    new cdk.CfnOutput(this, 'ALBDNSName', {
      description: 'DNS name of the ALB',
      value: alb.attrDnsName,
      exportName: `${id}:${environment.valueAsString}:DNSName`,
    });

    new cdk.CfnOutput(this, 'HTTPSListenerOutput', {
      description: 'The ARN of the Application Load Balancer HTTPS listener',
      value: httpsListener.ref,
      exportName: `${id}:${environment.valueAsString}:HTTPSListener`,
      condition: useCertiCondition,
    });

    new cdk.CfnOutput(this, 'HTTPListenerOutput', {
      description: 'The ARN of the Application Load Balancer HTTP listener',
      value: httpListener.ref,
      exportName: `${id}:${environment.valueAsString}:HTTPListener`,
    });

    new cdk.CfnOutput(this, 'ALBHostedZoneID', {
      description: 'Hosted Zone ID for the ALB',
      value: alb.attrCanonicalHostedZoneId,
    });

  }

}