import * as fr from 'face-recognition';
import * as cv from 'opencv4nodejs';

import { FaceDescription } from '../entities/FaceDescription';
import { IImage } from '../entities/Image';
import { IRect } from '../entities/Rect';
import { FaceDescriptionModel, IFaceDescriptionModel } from '../persistence/faceDescription.model';
import * as ImageDao from '../persistence/image.dao';
import { jsonToCvRect } from '../scripts/utils';
import { ReadImageFunction } from './CustomImageDownloader';
import { promiseChain } from './utils';

fr.withCv(cv)

function isSizeOk(rect: cv.Rect, size: number): boolean {
  return (rect.height >= size && rect.width >= size)
}

export class FaceDescriptorExtractor {
 faceLandmarkPredictor: fr.ShapePredictor
 faceRecognizerNet: fr.FaceRecognizerNet
 readImage: ReadImageFunction

  constructor(readImage: ReadImageFunction) {
    this.faceLandmarkPredictor = new fr.ShapePredictor(fr.models.faceLandmarks5Model)
    this.faceRecognizerNet = new fr.FaceRecognizerNet(fr.models.faceRecognitionModel)
    this.readImage = readImage
  }

  async computeFaceDescriptor(faceImage: fr.ImageRGB, i: number): Promise<fr.Array> {
    console.time('computeFaceDescriptor' + i)
    const res = await this.faceRecognizerNet.computeFaceDescriptorAsync(faceImage)
    console.timeEnd('computeFaceDescriptor' + i)
    return res
  }

  async computeDescriptors(mat: cv.Mat, faceLocations: IRect[], filename: string, faceSize: number): Promise<FaceDescription[]> {
    console.log('computeDescriptors', filename, faceSize)

    const frImg = fr.cvImageToImageRGB(new fr.CvImage(
      mat.channels === 1
        ? mat.cvtColor(cv.COLOR_GRAY2BGR)
        : mat
    ))
    const validRects = faceLocations
      .map(jsonToCvRect)
      .filter(rect => isSizeOk(rect, faceSize))
      .map(fr.fromCvRect)

    if (!validRects.length) {
      console.log('computeDescriptors no rects for faceSize', filename, faceSize)
      return []
    }

    console.time('faceLandmarkPredictor.predictAsync')
    const shapes = await Promise.all(validRects.map(rect => this.faceLandmarkPredictor.predictAsync(frImg, rect)))
    console.timeEnd('faceLandmarkPredictor.predictAsync')

    console.time('getFaceChipDetails')
    const allChipDetails = fr.getFaceChipDetails(shapes, faceSize)
    console.timeEnd('getFaceChipDetails')

    console.time('all computeFaceDescriptors')
    const descriptors = await promiseChain(
      fr.extractImageChips(frImg, allChipDetails)
        .map((faceImage, i) => async () => this.computeFaceDescriptor(faceImage, i))
    )
    console.timeEnd('all computeFaceDescriptors')

    const faceDescriptions = allChipDetails.map((chipDetails, i) => new FaceDescription({
      filename,
      angle: chipDetails.angle,
      faceSize: chipDetails.rows,
      rect: fr.toCvRect(chipDetails.rect),
      descriptor: descriptors[i].getData()
    }))

    return faceDescriptions
  }

  async computeAndStoreFaceDescriptors(img: IImage, faceSize: number) {
    const imageToUpdate = await ImageDao.findByFilename(img.filename)
    if (imageToUpdate && imageToUpdate.faceDescriptionsForSize && imageToUpdate.faceDescriptionsForSize.some(fd => fd.faceSize === faceSize)) {
      throw new Error(`image with filename '${img.filename}' already has descriptors for faceSize '${faceSize}' stored`)
    }

    if (!img.faceLocations) {
      console.log('computeAndStoreFaceDescriptors skipping file, faceLocations null', img.filename)
      return
    }

    const data = await this.readImage(img.filename)
    if (!data.length) {
      console.log('computeAndStoreFaceDescriptors skipping file, buffer empty', img.filename)
      return
    }

    const mat = cv.imdecode(data)

    const faceDescriptions = await this.computeDescriptors(mat, img.faceLocations as IRect[], img.filename, faceSize)

    const models = faceDescriptions.map((desc: any) => new FaceDescriptionModel(desc)) as IFaceDescriptionModel[]
    const faceDescriptionsForSize = {
      faceSize,
      faceDescriptionRefs: models.map(m => m._id)
    }
    await ImageDao.storeFaceDescriptions(img.filename, faceDescriptionsForSize)
    return await Promise.all(models.map(m => m.save()))
  }

  async computeRemainingDescriptors() {
    const remaining105 = await ImageDao.findForComputeFaceDescriptions(105)
    const remaining150 = await ImageDao.findForComputeFaceDescriptions(150)
    console.log('computeRemainingDescriptors faceSize 105 for %s images', remaining105.length)
    console.log('computeRemainingDescriptors faceSize 150 for %s images', remaining150.length)
    await promiseChain(remaining105.map(img => async () => this.computeAndStoreFaceDescriptors(img, 105)))
    console.log('computeRemainingDescriptors faceSize 105 done')
    await promiseChain(remaining150.map(img => async () => this.computeAndStoreFaceDescriptors(img, 150)))
    console.log('computeRemainingDescriptors faceSize 150 done')
  }
}