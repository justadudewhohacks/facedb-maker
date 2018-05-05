import * as fs from 'fs';
import * as cv from 'opencv4nodejs';
import * as path from 'path';

import { promiseChain } from '../main/utils';
import { close, connect } from '../persistence/db';
import { FaceDescriptionModel, IFaceDescriptionModel } from '../persistence/faceDescription.model';
import { IImageModel, ImageModel } from '../persistence/image.model';
import { jsonToCvRect, readImage } from './utils';

const outDir = path.resolve(__dirname, 'output')
const resultDir = path.resolve(outDir, 'extractedFaces')
const labeledDir = path.resolve(outDir, 'labeled105')

function isInBounds({ cols, rows }: cv.Mat, { x, y, width, height }: cv.Rect): boolean {
  return x > 0 && y > 0 && (x + width) < cols && (y + height) < rows
}

function writeImage(dirname: string, filename: string, img: cv.Mat) {
  const dirpath = path.resolve(resultDir, dirname)
  if (!fs.existsSync(dirpath)) {
    fs.mkdirSync(dirpath)
  }
  cv.imwrite(path.resolve(dirpath, filename), img)
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
  const faceDescriptions = await FaceDescriptionModel.find({ faceSize, filename: { $in: filenamesNotProcessedYet } }).lean().exec() as IFaceDescriptionModel[]
  console.log('faceDescriptions:', faceDescriptions.length)
  return faceDescriptions.filter(fd => !fd.isDuplicate)
}

const outOfBounds: string[] = []

const FACE_SIZE = 105

async function extractFaceImagesForQuery(query: string) {
  console.log('extractFaceImagesForQuery:', query)
  const all = await findWithSizeForQuery(FACE_SIZE, query, getAlreadyProcessedFileHashes())
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
    let dirname = query.split(' ').join('_')
    // remove accent from letter i
    dirname = dirname.startsWith('danay_garc') ? 'danay_garcia' : dirname
    const faceFilename = `${hash}_${ext}_${rect.x}_${rect.y}_${rect.width}_${rect.height}.png`
    console.log('writing', dirname, faceFilename)
    writeImage(
      dirname,
      faceFilename,
      img.getRegion(cvRect).bgrToGray().resize(FACE_SIZE, FACE_SIZE)
    )
  })

  console.log('skipped %s descriptors, because rect out of bounds', outOfBounds.length)
}

const queries: string[] = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'output', 'queries.json')).toString())

async function run() {
  await connect()
  console.log('connected')
  await promiseChain(queries.map(query => async () => extractFaceImagesForQuery(query)))
  close()
}

run()