import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as glue from 'aws-cdk-lib/aws-glue';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as athena from 'aws-cdk-lib/aws-athena';
import {
  aws_athena as athenaCfn
} from 'aws-cdk-lib';

export class AwspiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const lmo_org_id = new cdk.CfnParameter(this, 'LMO-ORG-ID', {
      type: 'String',
      description: 'Org id of your PBO/LMO',
      default: 'PBO/LMO org Id',
      maxLength: 18
    });
    console.log('lmo_org_id 👉 ', lmo_org_id.valueAsString);

    const byob_s3_bucket = new s3.Bucket(this, 'pi-byob', {
      versioned: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
    });

    const athena_out_bucket = new s3.Bucket(this, 'pi-athena-out', {
      versioned: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
    });

    const pi_glue_role = new iam.Role(this, 'pi-glue-role', {
      assumedBy: new iam.ServicePrincipal('glue.amazonaws.com'),
      description: 'Role for Glue services to access S3'      
    });

    pi_glue_role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSGlueServiceRole')
    );
    pi_glue_role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess')
    );
    pi_glue_role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonAthenaFullAccess')
    );

    const pidb = new glue.CfnDatabase(this, 'pidb', {
      catalogId: this.account,
      databaseInput: {
        description: 'pidb',
        name: 'pidb'
      },
    });

    const crawler = new glue.CfnCrawler(this, 'pi-glue-crawler', {
      databaseName: 'pidb',
      role: pi_glue_role.roleArn,
      targets: {
        s3Targets: [{ path: "s3://" + byob_s3_bucket.bucketName}]
      }
    });

    //Create athena configuration    
    const athenaworkgrp = new athena.CfnWorkGroup(this, 'pi-athena-workgroup', {
      name: 'PIWorkgroup',
      description: 'PI WorkGroup',
      state: 'ENABLED',
      workGroupConfiguration: {
          requesterPaysEnabled: true,
          resultConfiguration: {
              outputLocation: `s3://${athena_out_bucket.bucketName}/athena/results/`
          }
        }
      })

      //*** BYOB Daily log bucket external setup
      const getByobBucketPutPolicyStatement = new iam.PolicyStatement();
      getByobBucketPutPolicyStatement.addResources(`${byob_s3_bucket.bucketArn}/*`);
      getByobBucketPutPolicyStatement.addActions("s3:PutObject");

      const getByobBucketLocationPolicyStatement = new iam.PolicyStatement();
      getByobBucketLocationPolicyStatement.addResources(`${byob_s3_bucket.bucketArn}`);
      getByobBucketLocationPolicyStatement.addActions("s3:GetBucketLocation");
          
      // 👇 Create a Policy Document (Collection of Policy Statements)
      const getByobBucketPutPolicyStatementDoc = new iam.PolicyDocument({
        statements: [
          getByobBucketPutPolicyStatement
        ],
      });
      const getByobBucketLocationPolicyStatementDoc = new iam.PolicyDocument({
        statements: [
          getByobBucketLocationPolicyStatement
        ],
      });

      // 👇 Create role, to which we'll attach our Policies
      const role = new iam.Role(this, 'pi-byob-role', {
        description: 'PI BYOB role',
        assumedBy: new iam.AccountPrincipal('686444179860'),
        externalIds: [lmo_org_id.valueAsString],
        inlinePolicies: {
          // 👇 attach the Policy Document as inline policies
          ByobPutPolicy: getByobBucketPutPolicyStatementDoc,
          ByobLocationPolicy:getByobBucketLocationPolicyStatementDoc
        },
      });

      const group = new iam.Group(this, 'pi-group', {
        managedPolicies: [],
      });
    
      // Daily summary bucket CRMA access policy
      const athenaSalesforceAccessPolicyStatement = new iam.PolicyStatement();
      athenaSalesforceAccessPolicyStatement.addResources(`arn:aws:athena:*:${this.account}:workgroup/PIWorkgroup`);      
      athenaSalesforceAccessPolicyStatement.addResources(`${byob_s3_bucket.bucketArn}/*`);
      athenaSalesforceAccessPolicyStatement.addResources(`${athena_out_bucket.bucketArn}/*`);     
      athenaSalesforceAccessPolicyStatement.addResources(`*`);   
      athenaSalesforceAccessPolicyStatement.addActions("s3:*");
      athenaSalesforceAccessPolicyStatement.addActions("athena:GetWorkGroup");
      athenaSalesforceAccessPolicyStatement.addActions("athena:StartQueryExecution");
      athenaSalesforceAccessPolicyStatement.addActions("athena:StopQueryExecution");
      athenaSalesforceAccessPolicyStatement.addActions("athena:GetQueryExecution");
      athenaSalesforceAccessPolicyStatement.addActions("athena:GetQueryResults");
      athenaSalesforceAccessPolicyStatement.addActions("athena:GetDataCatalog");
      athenaSalesforceAccessPolicyStatement.addActions("s3:PutObject");
      athenaSalesforceAccessPolicyStatement.addActions("s3:GetObject");
      athenaSalesforceAccessPolicyStatement.addActions("glue:*");


//    athenaSalesforceAccessPolicyStatement.addResources(`*`);    
//    athenaSalesforceAccessPolicyStatement.addActions("s3:*");
//    athenaSalesforceAccessPolicyStatement.addActions("glue:*");
      
/*
      const athenaS3SalesforceAccessPolicyStatement = new iam.PolicyStatement();
//      athenaS3SalesforceAccessPolicyStatement.addResources(`${byob_s3_bucket.bucketArn}/*`);
      athenaS3SalesforceAccessPolicyStatement.addResources(`${athena_out_bucket.bucketArn}/*`);      
      athenaS3SalesforceAccessPolicyStatement.addActions("s3:GetObject");
      athenaS3SalesforceAccessPolicyStatement.addActions("s3:PutObject");

      const athenaGlueSalesforceAccessPolicyStatement = new iam.PolicyStatement();
      athenaS3SalesforceAccessPolicyStatement.addResources(`${athena_out_bucket.bucketArn}/*`);      
      athenaS3SalesforceAccessPolicyStatement.addActions("s3:GetObject");
      athenaS3SalesforceAccessPolicyStatement.addActions("s3:PutObject");
      */

      const athenaSalesforceAccessPolicyStatementDoc = new iam.PolicyDocument({
        statements: [
          athenaSalesforceAccessPolicyStatement
        ],
      });
  
      const policy = new iam.Policy(this, 'SalesforceAnalyticsUserPolicy', {
        document: athenaSalesforceAccessPolicyStatementDoc      
      });

      // 👇 Create User
      const user = new iam.User(this, 'CRMAnalyticsUser', {
        userName: 'CRMAnalyticsUser',
        groups: [group]
      });
      policy.attachToUser(user);
  

  let loginQuery: string  = `CREATE OR REPLACE VIEW "login_view" AS ( 
  select package_id, "date"(timestamp_derived) for_day_dt, organization_id, user_type, "count"(DISTINCT user_id_token) distinct_users_token_num 
  FROM awspistack_pibyob15337df2_1e1qy60nx3ah9 
  where cast(timestamp_derived as date) > date_add(‘day’, -60, current_date) 
  GROUP BY package_id, organization_id, user_type, user_agent, "date"(timestamp_derived))`;

  /*
  loginQuery = `CREATE OR REPLACE VIEW "logins" AS ( 
    select * 
    FROM awspistack_pibyob15337df2_1e1qy60nx3ah9 
    )`;
*/

  const createOrRelaceViewQuery = new athenaCfn.CfnNamedQuery(
    this,
    'CreateOrReplaceView',
    {
      name: 'loginview',
      database: 'pidb',
      queryString: loginQuery,
      description: 'Login view',
      workGroup: 'PIWorkgroup'
    },
  );  


}  
}
