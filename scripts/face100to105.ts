import * as fs from 'fs';
import * as cv from 'opencv4nodejs';
import * as path from 'path';

import { readImage, jsonToCvRect, decodeFaceFilename } from './utils';

const outDir = path.resolve(__dirname, 'output')
const inputDir = path.resolve(outDir, 'faceFiles100')
const resultDir = path.resolve(outDir, 'faceFiles105')

const FACE_SIZE = 105

async function run() {
  const classNames = fs.readdirSync(inputDir)

  classNames.forEach((className) => {
    const classDir = path.resolve(resultDir, className)
    if (!fs.existsSync(classDir)) {
      fs.mkdirSync(classDir)
    }

    const faceFiles = fs.readdirSync(path.resolve(inputDir, className))
    faceFiles.forEach((faceFilename) => {
      const { imgFilename, rect } = decodeFaceFilename(faceFilename)
      const img = readImage(imgFilename)
      const faceImg = img.getRegion(jsonToCvRect(rect)).bgrToGray().resize(FACE_SIZE, FACE_SIZE)
      cv.imwrite(path.resolve(classDir, faceFilename), faceImg)
    })
  })
}

run()