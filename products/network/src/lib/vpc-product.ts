import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import * as cfn_inc from 'aws-cdk-lib/cloudformation-include';
import { Construct } from 'constructs/lib/construct';

export interface VpcStackProps extends cdk.StackProps {
}

export class VPCProduct extends servicecatalog.ProductStack {
  constructor(scope: Construct, id: string, props: VpcStackProps) {
    super(scope, id);

    console.log(props);

    new cfn_inc.CfnInclude(this, 'vpc-3tier-with-zcp-product-template', {
      templateFile: path.join(__dirname, './3-tier.yml'),
    });
  }
}
