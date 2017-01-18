# Gravity Reminders

## Set Up
Install dependencies with: 
```
npm install
```

Run with:
```
npm start
```

## AWS Lambda Cron
1. Get an account. Sign up [here](https://aws.amazon.com/).
2. Navigate to Lambda Control Panel (Services Dropdown > Compute > Lambda)
3. Create a new Lambda Function, select `lambda-canary` blueprint
4. Create Rule Name / Description / Frequency > Next
5. Name Function, Change Runtime to `Node 4.3`, Create Role, Code Entry: Upload zip of function (structure below), Change Handler to `app.handler`, Memory/timeout may need to be adjusted. > Next
6. Review Function > Create Function 
7. Save & Test, should return success with `null`
8. Enable Trigger if it wasn't enabled in step 4

### Zip format for function code 
**Archive:**
- node_modules 
- app.js
- config.js
- template.js 

*DO NOT compress the project folder, compress the files / folders within the project folder*