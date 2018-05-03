import * as fs from 'fs';
import * as path from 'path';

import { IRect } from '../entities/Rect';
import { close, connect } from '../persistence/db';
import { FaceDescriptionModel, IFaceDescriptionModel } from '../persistence/faceDescription.model';
import { decodeFaceFilename } from './utils';

const outDir = path.resolve(__dirname, 'output')
const inputDir = path.resolve(outDir, 'labeled105')
const resultDir = path.resolve(outDir, 'descriptors105')

function isSameRect(r1: IRect, r2: IRect) {
  return r1.x === r2.x && r1.y === r2.y && r1.width === r2.width && r1.height === r2.height
}

function writeDescriptor(classname: string, filename: string, desc: number[]) {
  fs.writeFileSync(path.resolve(resultDir, classname, filename), JSON.stringify(desc))
}

async function findFaceDescription(faceSize: number, filename: string, rect: IRect): Promise<IFaceDescriptionModel | null> {
  return (await FaceDescriptionModel.find({ faceSize, filename }).lean().exec())
    .find((desc: IFaceDescriptionModel) => isSameRect(desc.rect, rect))
}

const exclusions = ['trash', 'unknown']

const notFound = []

const FACE_SIZE = 105

async function downloadDescriptorsForClassName(className: string) {
  const classDir = path.resolve(resultDir, className)
  if (!fs.existsSync(classDir)) {
    fs.mkdirSync(classDir)
  }

  return Promise.all(fs.readdirSync(path.resolve(inputDir, className))
    .map(decodeFaceFilename)
    .map(async ({ faceFileId, imgFilename, rect }) => {
      const faceDescription = await findFaceDescription(FACE_SIZE, imgFilename, rect)
      if (!faceDescription) {
        console.log(rect)
        throw new Error(`no faceDescription found for imgFilename '${imgFilename}'`)
      }
      writeDescriptor(className, `${faceFileId}.json`, faceDescription.descriptor)
    })
  )
}

async function step(remainingClassNames: string[]) {
  const className = remainingClassNames[0]
  if (!className)
    return

  console.log(className)
  await downloadDescriptorsForClassName(className)
  console.log('%s done', className)
  await step(remainingClassNames.slice(1))
}

async function run() {
  const classNames = fs.readdirSync(inputDir).filter(dir => !exclusions.some(d => d === dir))
  await connect()
  console.log('connected')
  await step(classNames)
  console.log('done')
  close()
}

run()