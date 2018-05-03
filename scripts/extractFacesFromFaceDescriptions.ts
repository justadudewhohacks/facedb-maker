import * as fs from 'fs';
import * as cv from 'opencv4nodejs';
import * as path from 'path';

import { close, connect } from '../persistence/db';
import { FaceDescriptionModel, IFaceDescriptionModel } from '../persistence/faceDescription.model';
import { IImageModel, ImageModel } from '../persistence/image.model';
import { jsonToCvRect, readImage } from './utils';

const outDir = path.resolve(__dirname, 'output')
const labeledDir = path.resolve(outDir, 'labeled105')
const resultDir = path.resolve(outDir, 'faces105')

function isInBounds({ cols, rows }: cv.Mat, { x, y, width, height }: cv.Rect): boolean {
  return x > 0 && y > 0 && (x + width) < cols && (y + height) < rows
}

function writeImage(filename: string, img: cv.Mat) {
  cv.imwrite(path.resolve(resultDir, filename), img)
}

function extractHash(filename: string, splitChar: string): string {
  const hash = filename.split(splitChar)[0]
  if (!hash) {
    throw new Error(`invalid filename '${filename}' for splitChar '${splitChar}'`)
  }
  return hash
}

function getAlreadyProcessedFileHashes(): string[] {
  const labeledDirs = fs.readdirSync(labeledDir)
  let hashes: string[] = []

  labeledDirs.forEach(dir => {
    const newHashes = fs.readdirSync(path.resolve(labeledDir, dir)).map(filename => extractHash(filename, '_'))
    hashes = hashes.concat(newHashes)
  })

  return hashes
}

async function findWithSizeForQuery(faceSize: number, query: string, exclusions: string[]): Promise<IFaceDescriptionModel[]> {
  const filenamesWithQuery = (await ImageModel.find({ queries: query }).lean().exec())
    .map((doc: IImageModel) => doc.filename)
  const filenamesNotProcessedYet = filenamesWithQuery
    .filter((filename: string) => !exclusions.some(ex => ex === extractHash(filename, '.')))
  console.log('filenamesWithQuery:', filenamesWithQuery.length)
  console.log('filenamesNotProcessedYet:', filenamesNotProcessedYet.length)
  return FaceDescriptionModel.find({ faceSize, filename: { $in: filenamesNotProcessedYet } }).lean().exec()
}

const outOfBounds: string[] = []

const FACE_SIZE = 105
const QUERY = 'fear the walking dead troy'

// big bang theory series
// big bang theory howard
// big bang theory rajesh
// big bang theory kunal nayyar
// big bang theory kevin sussman

async function run() {
  await connect()
  console.log('connected')
  const all = await findWithSizeForQuery(FACE_SIZE, QUERY, getAlreadyProcessedFileHashes())
  console.log('files with descriptors:', all.length)
  all.forEach((desc) => {
    const { rect, filename } = desc
    const img = readImage(filename)

    const cvRect = jsonToCvRect(rect)
    if (!isInBounds(img, cvRect)) {
      outOfBounds.push(filename)
      console.log('skipping %s because rect out of bounds', filename)
      return
    }

    const [hash, ext] = filename.split('.')
    const faceFilename = `${hash}_${ext}_${rect.x}_${rect.y}_${rect.width}_${rect.height}.png`
    console.log('writing', faceFilename)
    writeImage(faceFilename, img.getRegion(cvRect).bgrToGray().resize(FACE_SIZE, FACE_SIZE))
  })

  console.log('skipped %s descriptors, because rect out of bounds', outOfBounds.length)
  close()
}

run()