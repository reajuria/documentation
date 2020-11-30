const fs = require('fs');
const path = require('path');
const util = require('util');

function walk(dir, done) {
  let results = [];
  fs.readdir(dir, function (err, list) {
    if (err) return done(err);
    let i = 0;
    (function next() {
      let file = list[i++];
      if (!file) return done(null, results);
      file = path.resolve(dir, file);
      fs.stat(file, function (err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function (err, res) {
            results = results.concat(res);
            next();
          });
        } else {
          results.push(file);
          next();
        }
      });
    })();
  });
}
const walkP = util.promisify(walk);

async function main() {
  const includePackages = [
    '@nestjs/common',
    '@nestjs/config',
    '@nestjs/core',
    '@nestjs/microservices',
    '@nestjs/platform-express',
    '@nestjs/schedule',
    '@nestjs/typeorm',
    'class-transformer',
    'class-validator',
    'mysql',
  ];

  const api = process.argv[2];

  console.log('Fill dependencies for', api);

  const repoPackagePath = path.join(process.cwd(), 'package.json');
  const applicationPath = path.join(process.cwd(), 'apps', api);
  const applicationPackagePath = path.join(applicationPath, 'package.json');
  const distPath = path.join(process.cwd(), 'dist', 'apps', api);
  const distApplicationPackagePath = path.join(distPath, 'package.json');

  const repoPackage = JSON.parse(
    fs.readFileSync(repoPackagePath).toString('ascii')
  );
  const repoDependencies = Object.entries(repoPackage.dependencies);
  let packageDependencies = [...includePackages];
  packageDependencies.push(
    ...Object.keys(
      JSON.parse(fs.readFileSync(distApplicationPackagePath).toString('ascii'))
        .dependencies
    )
  );

  const files = (await walkP(distPath)).filter((file) => file.endsWith('.js'));
  for (let file of files) {
    let str = fs.readFileSync(file).toString('ascii');

    const regex = /import.+['"](.+)['"];/gi;
    let m;

    while ((m = regex.exec(str)) !== null) {
      if (m.index === regex.lastIndex) {
        regex.lastIndex++;
      }

      for (const mm of m) {
        const match = m[1];
        const groupIndex = mm[2];
        if (groupIndex > 0 && packageDependencies.includes(match) === false) {
          console.dir(match);
          packageDependencies.push(match);
        }
      }
    }
    str = undefined;
  }

  packageDependencies = repoDependencies.filter((p) =>
    packageDependencies.includes(p[0])
  );
  const dependencies = {};
  for (const p of packageDependencies) {
    dependencies[p[0]] = p[1];
  }

  const applicationPackage = JSON.parse(
    fs.readFileSync(applicationPackagePath).toString('ascii')
  );
  applicationPackage.dependencies = dependencies;

  fs.writeFileSync(
    distApplicationPackagePath,
    JSON.stringify(applicationPackage, undefined, 2)
  );
}

main();
