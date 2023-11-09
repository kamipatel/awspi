# PI starter aws stack 
Note: This stack is as-is. Please change the cdk code to fine tune perms in cdk as restrictive as possible. 

### Clone the project 
git clone https://github.com/kamipatel/awspi    
cd awspi  

### Update the cloud formation stack as needed 
Under lib directory update awspi-stack.ts

### Run following commands to install the stack in AWS   
- Configure your aws connection     
aws configure

- Bootstrap AWS instance. Replace {REPLACE-WITH-AWS-ACCOUNT-NUMBER} with AWS account number and {aws-region} with region where you want to install the stack     
cdk bootstrap aws://{REPLACE-WITH-AWS-ACCOUNT-NUMBER}/{aws-region}
e.g. cdk bootstrap aws://ABC11111111/us-east-1

- Depoy this stack. Replace {REPLACE-WITH-LMA-ORG-ID} with your PBO/LMA org id  
cdk deploy --parameters LMOORGID={REPLACE-WITH-LMA-ORG-ID}
e.g. cdk deploy --parameters LMOORGID=0012200009AB0010




