/*
 * @Author: jiangsixian jiangsixian@njsdata.com
 * @Date: 2022-09-07 19:20:48
 * @LastEditors: jiangsixian jiangsixian@njsdata.com
 * @LastEditTime: 2022-9-13 14:14:53
 * @FilePath: \undefinedd:\Package\workspace\onemind-web\copyDependencies.js
 * @Description: copy a file with local dependent files and package.json and so on，replace local dependencies as ../
 *
 * Copyright (c) 2022 by jiangsixian jiangsixian@njsdata.com, All Rights Reserved.
 */
const fs = require('fs')
const path = require("path")
let fileContainer = new Set([])
let packageJsonDependencies = []
let packageJson = require("./package.json")
let mirrmorDir = "mirrorDependencies"
let targetFiles = [
  "src/application-new/add/components/block/CustomLog/index.jsx"
]
main(targetFiles, mirrmorDir)

/**
 *
 * @param targetFile  要复制引用的目标文件
 * @param mirrmorDir 复制文件存放的目录，将在项目根目录生成
 * @return {Promise<void>}
 */
async function main(targetFiles, mirrmorDir) {
  for (let i = 0; i < targetFiles.length; i++) {
    let targetFile = targetFiles[i]
    await copyFile(targetFile, mirrmorDir)
  }
  //对依赖项进行处理，保留/及.之前的内容，以防止依赖缺失
  handlePackageJson()
  copyOtherDependentFiles()
}

/**
 * 处理package.json依赖
 * @return {<void>}
 */
function handlePackageJson() {
  let fixedPackageJsonDependencies = packageJsonDependencies.map(packageJsonDependency => {
    return packageJsonDependency.split(".")[0].split("/")[0]
  })
  packageJsonDependencies = new Set([...packageJsonDependencies, ...fixedPackageJsonDependencies])
  for (let dependenceKey in packageJson.dependencies) {
    !packageJsonDependencies.has(dependenceKey) &&
    delete packageJson.dependencies[dependenceKey]
  }
  fs.writeFileSync(path.resolve(__dirname, `${mirrmorDir}/package.json`), JSON.stringify(packageJson))
  //有些分支没有pnpm-lock或者yarn.lock
}

function copyOtherDependentFiles() {
  try {
    fs.copyFileSync(path.resolve(__dirname, "pnpm-lock.yaml"), path.resolve(__dirname, `${mirrmorDir}/pnpm-lock.yaml`))
  } catch (e) {
    console.log(e);
  }
  try {
    fs.copyFileSync(path.resolve(__dirname, "yarn.lock"), path.resolve(__dirname, `${mirrmorDir}/yarn.lock`))
  } catch (e) {
    console.log(e);
  }
  try {
    fs.copyFileSync(path.resolve(__dirname, "babel.config.js"), path.resolve(__dirname, `${mirrmorDir}/babel.config.js`))
  } catch (e) {
    console.log(e);
  }
}

async function copyFile(originPath, mirrmorDir) {
  let targetDir = path.resolve(__dirname, `${mirrmorDir}/${path.dirname(originPath)}`)
  let targetPath = path.resolve(__dirname, `${mirrmorDir}/${originPath}`)
  //将src开头相对路径依赖改成根据当前文件所在文件夹的相对路径，此处不直接使用copyFileSync
  mkdirSync(targetDir)
  const picExtensions = [".png", ".jpg", ".jpeg", ".bmp", ".gif"]
  let pathExtension = path.extname(originPath).toLowerCase()
  if (picExtensions.includes(pathExtension)) {
    fs.copyFileSync(path.resolve(__dirname, originPath), targetPath)
  } else {
    await handleCodeFiles(originPath, targetPath)
  }
}

async function handleCodeFiles(originPath, targetPath) {
  let fileContent = fs.readFileSync(originPath, "utf-8");
  let currentDir = path.dirname(originPath)

  let writeContent = fileContent.replace(/import.+([\'\"\`].+[\'\"\`])/g, function (findStr, $1) {
    return replaceFunc(findStr, $1, currentDir)
      //replace函数正则增删改，getDependencies正则需同步修改
  }).replace(/\}? from ([\'\"\`].+[\'\"\`])/g, function (findStr, $1) {
    return replaceFunc(findStr, $1, currentDir)
  }).replace(/background[-image]?: url\(([\'\"\`]?.*[\'\"\`]?)\)/g, function (findStr, $1) {
    return replaceFunc(findStr, $1, currentDir)
  }).replace(/require\(([\'\"\`].*[\'\"\`])\)/g, function (findStr, $1) {
    return replaceFunc(findStr, $1, currentDir)
  });
  fs.writeFileSync(targetPath, writeContent)
  let dependencies = getDependencies(fileContent);
  dependencies = dependencies.map(dependence => {
    if (dependence.startsWith(".")) {
      return path.join(currentDir, dependence).replaceAll("\\", "/")
    } else {
      return dependence
    }
  })
  for (let i = 0; i < dependencies.length; i++) {
    let dependence = dependencies[i]
    //todo 此处有坑，fs.existsSync不区分大小写？？？加入upCaseExcludeArr规避
    const upCaseExcludeArr = ["src/common/Constant"]
    if (fs.existsSync(dependence) && !upCaseExcludeArr.includes(dependence)) {
      let isFile = await stat(dependence)
      dependence = isFile ? dependence : `${dependence}/index.js`
      if (!fileContainer.has(dependence)) {
        fileContainer.add(dependence)
        await copyFile(dependence, mirrmorDir)
      }
    } else if (fs.existsSync(`${dependence}.js`) && !fileContainer.has(dependence)) {
      fileContainer.add(dependence)
      await copyFile(`${dependence}.js`, mirrmorDir)
    } else if (fs.existsSync(`${dependence}.jsx`) && !fileContainer.has(dependence)) {
      fileContainer.add(dependence)
      await copyFile(`${dependence}.jsx`, mirrmorDir)
    }
  }
}

function generateRelativeStr(dir) {
  let result = ""
  dir.split("/").forEach(() => {
    result += "../"
  })
  return result
}

//异步函数包裹成promise
async function stat(file) {
  return new Promise((resolve, reject) => {
    fs.stat(path.resolve(__dirname, file), (err, data) => {
      if (err) {
        throw err
      }
      resolve(data.isFile())
    })
  })
}

function getDependencies(fileContent) {
  //此处把引号一起包进去，方便后边处理路径映射
  let allDependencies = Array.from(new Set([
          //getDependencies函数正则增删改，handleCodeFiles正则需同步修改
    ...(fileContent.match(/(?<=import.+)[\'\"\`].*[\'\"\`]/g) || []),
    ...(fileContent.match(/(?<=require\()[\'\"\`].*[\'\"\`]/g) || []),
    ...(fileContent.match(/(?<=\}? from )[\'\"\`].*[\'\"\`]/g) || []),
    ...(fileContent.match(/(?<=background[-image]?: url\([\'\"\`]?).*[\'\"\`]?(?=\))/g) || [])
  ])) || [];
  let dependencies = allDependencies.map(dependence => {
    return dependence.replace(/[\'\"\`]~?common\//, "'src/common/")
                     .replace("'utils/", "'src/common/utils/")
                     .replace("'service/", "'src/common/service/")
                     .replace("'core/", "'src/common/core/")
                     .replace("'components/", "'src/components/")
                     .replace("'@/", "'src/")
                     .replace(/'/g, "")
                     .replace(/"/g, "")
                     .replace(/`/g, "")
  })
  //将package.json依赖存起来
  packageJsonDependencies = [
    ...packageJsonDependencies,
    ...dependencies.filter(dependence => !(dependence.startsWith(".") || dependence.startsWith("src/") || dependence.startsWith("~")))
  ]
  return dependencies.filter(dependence => dependence.startsWith(".") || dependence.startsWith("src/") || dependence.startsWith("~"))
}

function replaceFunc(findStr, $1, currentDir) {
  let originStr = $1;
  $1 = $1.replace(/[\'\"\`]~?common\//, "'src/common/")
         .replace(/[\'\"\`]utils\//, "'src/common/utils/")
         .replace(/[\'\"\`]service\//, "'src/common/service/")
         .replace(/[\'\"\`]core\//, "'src/common/core/")
         .replace(/[\'\"\`]components\//, "'src/components/")
         .replace(/[\'\"\`]@\//, "'src/")
  if ($1.startsWith("'src")) {
    //因为引入文件为简写，需要补充完整的路径
    const upCaseExcludeArr = ["src/common/Constant"]
    $1 = $1.replaceAll("'", "").replaceAll("\"", "").replaceAll("\`", "")
    if (fs.existsSync($1) && !upCaseExcludeArr.includes($1)) {
      stat($1).then(isFile => $1 = isFile ? $1 : `${$1}/index.js`)
    } else if (fs.existsSync(`${$1}.js`) && !fileContainer.has($1)) {
      $1 = `${$1}.js`
    } else if (fs.existsSync(`${$1}.jsx`) && !fileContainer.has($1)) {
      $1 = `${$1}.jsx`
    }
    let relativeStr = generateRelativeStr(currentDir)
    $1 = `\'${relativeStr + $1}\'`
  }
  return findStr.replace(originStr, $1)
}

function mkdirSync(dirname) {
  if (fs.existsSync(dirname)) {
    return true;
  } else {
    //如果父级目录已经创建，然后才能创建子级目录
    if (mkdirSync(path.dirname(dirname))) {
      fs.mkdirSync(dirname);
      return true;
    }
  }
}



