import { promiseChain } from '../main/utils';
import * as cv from 'opencv4nodejs';
import * as path from 'path';
import * as fs from 'fs';
import { FaceDescriptionModel } from '../persistence/faceDescription.model';
import { connect, close } from '../persistence/db';
import { decodeFaceFilename } from './utils';

const duplicates = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'output', 'duplicates.json')).toString())

async function updateIsDuplicate(duplicate: any) {
  const filename = decodeFaceFilename(duplicate.fileName.replace('.json', '')).imgFilename
  const m = await FaceDescriptionModel.findOne({ filename })
  if (!m) {
    console.log(filename)
    console.log(duplicate)
    throw new Error('failed to find m')
  }

  await FaceDescriptionModel.update({ filename }, { $set: { isDuplicate: true }})
}

async function run() {
  await connect()
  console.log('connected')

  await promiseChain(duplicates.map((duplicate: any) => async () => {
    console.log(duplicate.fileName)
    const img = cv.imread(duplicate.imagePath)
    cv.imshow('duplicate', img)
    cv.waitKey()

    await updateIsDuplicate(duplicate)
    console.log('updateIsDuplicate success')

    fs.unlinkSync(duplicate.descriptorPath)
    fs.unlinkSync(duplicate.imagePath)
    console.log('unlinkSync success')
  }))

  close()
}

run()
