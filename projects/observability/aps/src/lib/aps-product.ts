import * as cdk from 'aws-cdk-lib';
import * as servicecatalog from 'aws-cdk-lib/aws-servicecatalog';
import * as aps from 'aws-cdk-lib/aws-aps';
import { Construct } from 'constructs/lib/construct';

export interface APSConstructProps extends cdk.StackProps {

}

export class APSConstruct extends servicecatalog.ProductStack {
  constructor(scope: Construct, id: string, _props: APSConstructProps) {
    super(scope, id );

    new aps.CfnWorkspace(this, 'MyCfnWorkspace', /* all optional props */ {
        alertManagerDefinition: 'alertManagerDefinition',
        alias: 'alias',
        tags: [{
            key: 'key',
            value: 'value',
        }],
    });





  }
}[[]]