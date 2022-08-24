import * as cdk from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs/lib/construct';

export interface Ec2WinProductProps extends cdk.StackProps{

}

export class Ec2WinProduct extends servicecatalog.ProductStack {
  constructor(scope: Construct, id: string, props: Ec2WinProductProps) {
    super(scope, id );


  }
}