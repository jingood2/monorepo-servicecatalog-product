from diagrams import Cluster, Diagram, Edge
from diagrams.aws.devtools import Codecommit
from diagrams.aws.devtools import Codebuild
from diagrams.aws.devtools import Codepipeline 
from diagrams.aws.management import Cloudformation
from diagrams.aws.management import CloudformationTemplate
from diagrams.aws.management import CloudformationChangeSet
from diagrams.aws.compute import ECR
from diagrams.aws.compute import ECS
from diagrams.custom import Custom

with Diagram("ECS CICD Pipeline using docker compose", show=False ):

    cc_github = Custom("Github", "./resources/github.png")
   


    with Cluster("AWS Codepipeline"):
        ci = Codebuild("Build")
        ci2 = Codebuild("Build2")
        cf = Cloudformation("Cloudformation")
        
        ci >> ECR("ECR")
        ci2 >> CloudformationTemplate("Template")
        cf >> CloudformationChangeSet("New")

        ci >> ci2 >> cf
    
    cc_github >> ci 
    cf >> ECS("ECS")


