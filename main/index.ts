import { close, connect } from '../persistence/db';
import { CustomImageDownloader } from './CustomImageDownloader';
import { FaceDescriptorExtractor } from './FaceDescriptorExtractor';
import { FaceDetector } from './FaceDetector';
import { promiseChain } from './utils';

const downloader = new CustomImageDownloader()
const readImageFunction = downloader.fileHandler.readImage.bind(downloader.fileHandler)
const faceDetector = new FaceDetector(readImageFunction)
const faceDescriptorExtractor = new FaceDescriptorExtractor(readImageFunction)

const queries = [
  'game of thrones stannis baratheon',
  'stephen dillane',
  'game of thrones hodor',
  'kristian nairn',
  'game of thrones daario naharis',
  'michiel huisman',
  'game of thrones jorah mormont',
  'iain glen',
  'game of thrones lord varys',
  'conleth hill',
  'game of thrones gendry',
  'joe dempsie',
  'game of thrones oberyn martell',
  'pedro pascal',
  'game of thrones missandei',
  'nathalie emmanuel',
  'game of thrones tormund giantsbane',
  'kristofer hivju',
  'game of thrones samwell tarly',
  'john bradley-west',
  'game of thrones grey worm',
  'jacob anderson',
  'game of thrones catelyn stark',
  'michelle fairley',
  'game of thrones goldy',
  'hannah murray',
  'game of thrones davos seaworth',
  'liam cunningham'
]


async function run() {
  await connect()
  await promiseChain(queries.map(query => async () => downloader.downloadImagesForQuery(query)))
  await faceDetector.locateRemainingFaces()
  await faceDescriptorExtractor.computeRemainingDescriptors()
  await close()
}

run()