# monorepo-servicecatalog-product
AWS 서비스 카탈로그 프로덕트 개발을 하나의 레포지토리에서 관리하기 위해 MonoRepo 전략을 사용합니다. 
MonoRepo 환경에서 서비스 카탈로그 프로젝트 개발을 시작하기 위해서는 폴더 구조를 이해해야 한다


# MonoRepo 환경에서 프로젝트 개발 

## MopoRepo 디렉토리 구조
해당 MonoRepo 디렉토리 구조는 다음과 같습니다. 


### 사전 조건
- AWS CDK 패키지 설치
- Projen NPM 패키지 설치 - https://github.com/projen/projen



### Product 폴더 생성
projects 하위에 개발할 Product 폴더를 생성합니다. 
```
mkdir -p projects/<<mynewproject>>
```

### AWS CDK 프로젝트 환경 설정
AWS CDK의 버젼 및 프로젝트 관리 도구인 Projen 을 이용하여 AWS CDK 프로젝트를 생성합니다
```
cd projects/mynewproject
npx projen new awscdk-app-ts --no-git
```
projen을 통해 생성된 프로젝트 폴더 구조는 다음과 같습니다 
```
├── LICENSE
├── README.md
├── cdk.json
├── package.json
├── src
│   └── main.ts
├── test
│   └── main.test.ts
├── tsconfig.dev.json
├── tsconfig.json
└── yarn.lock
```
현재 AWS CDK의 최신 버젼은 2.38.1 입니다 (https://docs.aws.amazon.com/cdk/api/v2/)
해당하는 CDK 버젼을 사용하기 위해 .projenrc.js 파일을 오픈하여 해당 버젼을 설정하고 적용합니다. 
```
#.projenrc.js

const { awscdk } = require('projen');
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.38.1',
  defaultReleaseBranch: 'main',
  name: 'vpc',

  // deps: [],                /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
});
project.synth();

```
.projenrc.js 파일에 cdkVersion을 수정한 후 아래와 같이 projen 커맨드로 해당 CDK 버젼 라이브러리를 설치합니다. 
```
npx projen
```

