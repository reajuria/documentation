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

## Add `/apps/some-api/package`
Add a folder where you will store files like `Dockerfile` and files that your application may need for execution or containerization... in my case I named it `package`

## Add `/apps/some-api/package/Dockerfile`
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
Here you will store the scripts to package your nest application.

### Add `/tools/scripts/package-api.sh`
This will be your entry point
Parameters:
  [App Name] this should be your app name ex: some-api
[package-api.sh](https://github.com/reajuria/documentation/blob/main/package-api.sh)

### Add `/tools/scripts/fill-dependencies.js`
This is used to fill nest defaults packages and packages that may not have been referenced inside the source code or collected by package process
[fill-dependencies.js](https://github.com/reajuria/documentation/blob/main/fill-dependencies.js)

### Add `/apps/some-api/install.sh` [Optional]
For adding your internal publishable libraries to the `package.json` and `package-lock.json` in your dist folder. Example:
```
npm install --save @org-name/lib-common @org-name/lib-feature1 @org-name/lib-feature2
```

## Run commands from root directory
`sh ./tools/scripts/package-api.sh some-api`
You will get an application folder that has `package.json` and `package-lock.json` that can be included in CI/CD, publish to a package repository or create docker images, is up to everyone needs.


There may be more ways to package and publish applications and there may be ways to trigger builds when applications are affected by changes, if anyone knows please share them 👋🏻 
