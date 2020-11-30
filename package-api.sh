# Cleanup
rm -rf ./dist/apps/$1
sleep 2

# Generate package.json and remove remaining directories
nx package $1
node ./tools/scripts/fill-dependencies.js $1
cp ./dist/apps/$1/package.json ./tmp
rm -rf ./dist/apps/$1/apps
rm -rf ./dist/apps/$1/libs
sleep 2

# Build Node/NestJS Application
nx build $1
sleep 2

# Install node packages to create package-lock.json then cleanup node_modules
cp ./apps/$1/package/.npmrc ./dist/apps/$1/.npmrc
cp ./apps/$1/install.sh ./dist/apps/$1/install.sh
cp ./tmp/package.json ./dist/apps/$1/
cd ./dist/apps/$1/
npm install
sh install.sh
rm -f install.sh
rm -rf ./node_modules
cd ../../..
rm ./tmp/package.json
sleep 2

# Copy Dockerfile or other needed files
cp ./apps/$1/package/* ./dist/apps/$1/
