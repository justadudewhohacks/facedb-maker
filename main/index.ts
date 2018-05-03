import { close, connect } from '../persistence/db';
import { CustomImageDownloader } from './CustomImageDownloader';
import { FaceDescriptorExtractor } from './FaceDescriptorExtractor';
import { FaceDetector } from './FaceDetector';

const downloader = new CustomImageDownloader()
const readImageFunction = downloader.fileHandler.readImage.bind(downloader.fileHandler)
const faceDetector = new FaceDetector(readImageFunction)
const faceDescriptorExtractor = new FaceDescriptorExtractor(readImageFunction)

const query = 'big bang theory sheldon'

async function run() {
  await connect()
  await downloader.downloadImagesForQuery(query)
  await faceDetector.locateRemainingFaces()
  await faceDescriptorExtractor.computeRemainingDescriptors()
  await close()
}

run()