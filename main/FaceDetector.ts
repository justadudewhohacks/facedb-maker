import { IImage } from 'entities/Image';
import * as cv from 'opencv4nodejs';

import * as ImageDao from '../persistence/image.dao';
import { ReadImageFunction } from './CustomImageDownloader';
import { promiseChain } from './utils';

const FOURK = 8847360

export class FaceDetector {
  cc: cv.CascadeClassifier
  readImage: ReadImageFunction

  constructor(readImage: ReadImageFunction) {
    this.cc = new cv.CascadeClassifier(cv.HAAR_FRONTALFACE_ALT2)
    this.readImage = readImage
  }

  async locateFacesInMat(mat: cv.Mat): Promise<cv.Rect[]> {
    return (await this.cc.detectMultiScaleAsync(mat, 1.05, 10)).objects
  }

  async locateAndSafeFaceLocations(img: IImage): Promise<void> {
    console.log('locateAndSafeFaceLocations %s', img.filename, img.queries.join(', '))
    const data = await this.readImage(img.filename)
    if (!data.length) {
      console.log('locateAndSafeFaceLocations skipping file, buffer empty')
      return
    }

    const mat = cv.imdecode(data)
    if (mat.rows * mat.cols > FOURK) {
      console.log('locateAndSafeFaceLocations skipping file, mat dimensions too large:', mat.rows, mat.cols)
      return
    }
    console.log('locateAndSafeFaceLocations mat dimensions: ', mat.rows, mat.cols)
    const faceLocations = await this.locateFacesInMat(mat)
    await ImageDao.updateFaceLocations(img.filename, faceLocations)
    console.log('locateAndSafeFaceLocations saved %s faceLocations', faceLocations.length)
  }

  async locateRemainingFaces() {
    const images = await ImageDao.findForLocateFaces()
    console.log('locateRemainingFaces for %s images', images.length)
    await promiseChain(images.map((img: IImage) => async () => await this.locateAndSafeFaceLocations(img)))
    console.log('locateRemainingFaces done')
  }
}