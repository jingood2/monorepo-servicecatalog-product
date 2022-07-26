import { CfnOutput } from 'aws-cdk-lib';
import { Peer, Port, SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs/lib/construct';

export interface Ec2SecurityGroupConstructProps {
  securityGroupId : string;
  allowIps?: string[];
  allowSgIds?: string[];
  prefixList?: string[];
  allowPort: number;
  description?: string;

}

export class Ec2SecurityGroupConstruct extends Construct {
  constructor(scope: Construct, id: string, props: Ec2SecurityGroupConstructProps) {
    super(scope, id);

    const sg = SecurityGroup.fromSecurityGroupId(this, 'SecurityGroupImport', props.securityGroupId, {
      allowAllOutbound: true,
    });

    for (let sgId in props.allowSgIds) {
      sg.connections.allowFrom(
        SecurityGroup.fromSecurityGroupId(this, 'SecurityGroupLookup', sgId), Port.tcp(props.allowPort),
        props.description);
    }

    for (let ipAddr in props.allowIps) {
      sg.connections.allowFrom(
        Peer.ipv4(ipAddr), Port.tcp(props.allowPort),
        props.description);
    }

    for (let prefix in props.prefixList) {
      sg.connections.allowFrom(
        Peer.prefixList(prefix), Port.tcp(props.allowPort),
        props.description);
    }

    // cfnoutput
    new CfnOutput(this, 'CfnOutput', {
      description: props.description,
      value: sg.securityGroupId,
    });

  }
}