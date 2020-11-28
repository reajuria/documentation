# nrwl/nx packaging nest applications
I've found another workaround to generate a deployable microservice with a single bash script, currently I'm using Google Cloud Build to build container images. I will post what works for my use case but anyone can easily adapt it.

Currently using `@nrwl/cli@10.3.1` installed globally to run scripts

## Add `/apps/some-api/package.json`
You can include `scripts` tag to run scripts inside dist application's folder.
```
{
  "name": "@org-name/some-api",
  "version": "1.0.1",
  "scripts": {
    "cloud-build": "gcloud builds submit --tag gcr.io/...",
    "cloud-deploy": "gcloud run deploy ..."
  },
}
```

## Add `@nrwl/node:package` architect to your project in `workspace.json`
Make a copy of build architect and modify until it looks like:
```
"architect": {
  "package": {
    "builder": "@nrwl/node:package", <-- Change `build` to `package`
    "options": {
      "outputPath": "dist/apps/some-api",
      "main": "apps/some-api/src/main.ts",
      "packageJson": "apps/some-api/package.json", <-- Add the path to a `package.json` inside your nest application
      "tsConfig": "apps/some-api/tsconfig.app.json",
      "assets": ["apps/some-api/src/assets"],
      "srcRootForCompilationRoot": "." <-- Add this line, this will fix TS6059 error during packaging if your application depends on `/libs` folder
    }
  },
  "build": {
    "builder": "@nrwl/node:build",
    ...
```

## Add `/apps/some-api/assets`
Add a folder where you will store files like `Dockerfile` and files that your application may need for execution or containerization... in my case I named it `assets`

## Add `/apps/some-api/assets/Dockerfile`
This file can be simple as:
```
FROM node:12

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --only=production

COPY . ./

EXPOSE 8080

CMD [ "node", "main.js" ]
```

## Add scripts for applications
Here you will store the scripts to package or deploy your nest application, anyone with higher understanding on bash scripting can easily do a single script that accepts a parameter for application name and do validations and more, for now we will keep this as an example. You may need to prepend `npx` to nx commands to be able to run or use `package.json` included scripts

### `/scripts/some-api/package.sh`
```
# Cleanup
rm -rf ./dist/apps/some-api

# Generate package.json and remove remaining directories
nx package some-api
rm -rf ./dist/apps/some-api/apps
rm -rf ./dist/apps/some-api/libs

# Build Node/NestJS Application
nx build some-api

# Install node packages to create package-lock.json then cleanup node_modules
cd ./dist/apps/some-api/
npm install
rm -rf ./node_modules
cd ../../..

# Copy Dockerfile or other needed files
cp ./apps/some-api/assets/* ./dist/apps/some-api/
```

### `/scripts/some-api/cloud-build.sh`
```
cd ./dist/apps/some-api/
npm run cloud-build
cd ../../..
```

### `/scripts/some-api/cloud-deploy.sh`
```
cd ./dist/apps/some-api/
npm run cloud-deploy
cd ../../..
```

## Run commands from mono-repo directory
`sh ./scripts/some-api/package.sh`
After running it you will get an application folder that has `package.json` and `package-lock.json` that can be included in CI/CD, publish to a package repository or create docker images, is up to everyone needs.

You can manually trigger a build for a container image
`sh ./scripts/some-api/cloud-build.sh`

Then deploy it
`sh ./scripts/some-api/cloud-deploy.sh`


There may be more ways to package and publish applications and there may be ways to trigger builds when applications are affected by changes, if anyone knows please share them 👋🏻 
