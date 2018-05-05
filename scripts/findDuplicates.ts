import * as cv from 'opencv4nodejs'
import * as path from 'path';
import * as fs from 'fs';

const outputDir = path.resolve(__dirname, 'output')
const descriptorsDir = path.resolve(outputDir, 'descriptors105')
const facesDir = path.resolve(outputDir, 'labeled105')
const resultFile = path.resolve(outputDir, 'duplicates.json')

function euclideanDistance(desc1: number[], desc2: number[]): number {
  return Math.sqrt(
    desc1
      .map((val, i) => val - desc2[i])
      .reduce((res, diff) => res + Math.pow(diff, 2), 0)
  )
}

function readDescriptor(filePath: string): number[] {
  return JSON.parse(fs.readFileSync(filePath).toString())
}

function getMetaInfo(className: string, fileName: string) {
  return {
    fileName,
    descriptorPath: path.resolve(descriptorsDir, className, fileName),
    imagePath: path.resolve(facesDir, className, fileName.replace('.json', '.png'))
  }
}

const classDatas = fs.readdirSync(descriptorsDir)
  .map((className: string) => ({
    className,
    metaInfos: fs.readdirSync(path.resolve(descriptorsDir, className))
        .map((descriptorFile: string) => getMetaInfo(className, descriptorFile))
  }))

const THRESH = 0.3

const KEY_REMOVE_LEFT = 97 // a
const KEY_REMOVE_RIGHT = 100 // d
const KEY_SAVE = 8 // backspace

const toRemove: any = []

function waitForKey(onRemove: (isLeft: boolean) => void, onSave: () => void) {
  const key = cv.waitKey()
  if (key === KEY_REMOVE_LEFT) {
    onRemove(true)
  } else if (key === KEY_REMOVE_RIGHT) {
    onRemove(false)
  } else if (key === KEY_SAVE) {
    onSave()
    waitForKey(onRemove, onSave)
  }
}

classDatas.forEach(({ className, metaInfos }) => {
  console.log(className)
  metaInfos.forEach((info1, i) => {
    const desc1 = readDescriptor(info1.descriptorPath)

    metaInfos.forEach((info2, j) => {
      if (
        i === j
        || toRemove.some((r: any) => (r.imagePath === info1.imagePath || r.imagePath === info2.imagePath))
      ) return

      const desc2 = readDescriptor(info2.descriptorPath)

      const dist = euclideanDistance(desc1, desc2)
      if (dist < THRESH) {
        console.log(dist)
        const img1 = cv.imread(info1.imagePath)
        const img2 = cv.imread(info2.imagePath)

        console.log('left:', info1.fileName)
        console.log('right:', info2.fileName)
        cv.imshow('img1', img1)
        cv.imshow('img2', img2)
        waitForKey(
          (isLeft: boolean) => {
            if (isLeft) {
              console.log('remove left image:', info1.imagePath)
              toRemove.push(info1)
            } else {
              console.log('remove right image:', info2.imagePath)
              toRemove.push(info2)
            }
          },
          () => {
            console.log('saving...')
            fs.writeFileSync(resultFile, JSON.stringify(toRemove))
          }
        )
      }
    })
  })
  console.log('saving...')
  fs.writeFileSync(resultFile, JSON.stringify(toRemove))
})
