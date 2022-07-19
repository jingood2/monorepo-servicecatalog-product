# read the workflow templatikkkjje
JOB_WORKFLOW_TEMPLATE=$(cat .github/cdk-workflow-template.yaml)

ROOT_DIR='./products'
BUILD_ACCOUNT='037729278610'
TARGET_DEPLOY_ACCOUNTS=('037729278610') 
#BRANCH_NAMES=('feat' 'develop' 'main' )
# ACCOUNT 수만큼 reusable template에 deploy-prod 추가
for PROJECT in $(ls ${ROOT_DIR}); do
    echo "generating workflow for products/${PROJECT}"

    for ACCOUNT in ${TARGET_DEPLOY_ACCOUNTS[@]}; do
        JOB_WORKFLOW=$(echo "${JOB_WORKFLOW_TEMPLATE}" | sed "s/{{TARGET_ACCOUNT}}/${ACCOUNT}/g" | sed "s/{{PROJECT}}/${PROJECT}/g" )
        echo "${JOB_WORKFLOW}" > .github/workflows/${PROJECT}.yaml
    done
done