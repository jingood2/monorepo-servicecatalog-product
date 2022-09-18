# read the workflow templatikkkjje
JOB_WORKFLOW_TEMPLATE=$(cat .github/cdk-workflow-template.yaml)

ROOT_DIR='projects'
#BUILD_ACCOUNT='037729278610'
BUILD_ACCOUNT='484752921218'
#TARGET_DEPLOY_ACCOUNTS=('037729278610') 
TARGET_DEPLOY_ACCOUNTS=('484752921218') 
#BRANCH_NAMES=('feat' 'develop' 'main' )
# ACCOUNT 수만큼 reusable template에 deploy-prod 추가
for CATEGORY in $(ls ${ROOT_DIR}); do
    echo "generating workflow for ${ROOT_DIR}/${CATEGORY}"

    for PROJECT in $(ls ${ROOT_DIR}/${CATEGORY}); do
        for ACCOUNT in ${TARGET_DEPLOY_ACCOUNTS[@]}; do
            JOB_WORKFLOW=$(echo "${JOB_WORKFLOW_TEMPLATE}" | sed "s/{{ROOT_DIR}}/${ROOT_DIR}/g" | sed "s/{{TARGET_ACCOUNT}}/${ACCOUNT}/g" | sed "s/{{PROJECT}}/${PROJECT}/g" | sed "s/{{CATEGORY}}/${CATEGORY}/g" )
            echo "${JOB_WORKFLOW}" > .github/workflows/${CATEGORY}-${PROJECT}.yaml
        done
    done

done