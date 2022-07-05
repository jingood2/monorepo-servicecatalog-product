import * as cdk from "aws-cdk-lib";
import { GithubActionsIdentityProvider, GithubActionsRole } from "aws-cdk-github-oidc";
import * as servicecatalog from "aws-cdk-lib/aws-servicecatalog";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export interface GithubOidcProviderConstructProps {
  owner: string;
  repo: string;
  role: string;
}

export class GithubOidcProviderConstruct extends servicecatalog.ProductStack {
  constructor(scope: Construct, id: string, props: GithubOidcProviderConstructProps) {
    super(scope, id);

    /**
     * Create an Identity provider for GitHub inside your AWS Account. This
     * allows GitHub to present itself to AWS IAM and assume a role.
     */
    const provider = new GithubActionsIdentityProvider(this, "GithubProvider");

    const deployRole = new GithubActionsRole(this, "GithubDeployRole", {
      provider: provider, // reference into the OIDC provider
      owner: props.owner, // your repository owner (organization or user)
      repo: props.repo, // your repository name (without the owner name)
      roleName: props.role,
      description: "This role deploys stuff to AWS ",
      maxSessionDuration: cdk.Duration.hours(1),
    });

    deployRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess"));
  }
}
