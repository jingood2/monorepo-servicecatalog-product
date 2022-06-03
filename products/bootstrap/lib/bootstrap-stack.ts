import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { Effect, OpenIdConnectPrincipal, OpenIdConnectProvider, PolicyDocument, PolicyStatement, Role } from "aws-cdk-lib/aws-iam";
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';



export class BootstrapStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const oidcProviderArn = `${process.env.GITHUB_OIDC_PROVIDER_ARN}`;

    let provider: iam.IOpenIdConnectProvider;

    if (oidcProviderArn !== '') {
      provider = iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(this, "GithubOIDCProvider", oidcProviderArn);
    } else {
      provider = new OpenIdConnectProvider(this, "MyProvider", {
        url: "https://token.actions.githubusercontent.com",
        clientIds: ["sts.amazonaws.com"],
      });
    }


    const githubOrganisation = `${process.env.GITHUB_OWNER}`;
    // Change this to the repo you want to push code from
    const repoName = `${process.env.REPO_NAME}`;

    const githubRepository = `${process.env.GITHUB_REPOSTIROY}`;
    /**
     * Create a principal for the OpenID; which can allow it to assume
     * deployment roles.
     */
    const GitHubPrincipal = new OpenIdConnectPrincipal(provider).withConditions({
      StringLike: {
        //"token.actions.githubusercontent.com:sub": `repo:${githubOrganisation}/${repoName}:*`,
        "token.actions.githubusercontent.com:sub": `repo:${githubRepository}:ref:/refs/head/main`,
      },
    });

    /**
     * Create a deployment role that has short lived credentials. The only
     * principal that can assume this role is the GitHub Open ID provider.
     *
     * This role is granted authority to assume aws cdk roles; which are created
     * by the aws cdk v2.
     */
    new Role(this, "GitHubActionsRole", {
      assumedBy: GitHubPrincipal,
      description: "Role assumed by GitHubPrincipal for deploying from CI using aws cdk",
      roleName: "github-ci-role",
      maxSessionDuration: Duration.hours(1),
      inlinePolicies: {
        CdkDeploymentPolicy: new PolicyDocument({
          assignSids: true,
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ["sts:AssumeRole"],
              resources: [`arn:aws:iam::${this.account}:role/cdk-*`],
            }),
          ],
        }),
      },
    });
  }
}
