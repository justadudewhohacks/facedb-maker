import { FaceDescription } from './FaceDescription';

export class ImageFaceDescriptions {
  faceSize: number
  faceDescriptions: FaceDescription[]

  constructor(imageFaceDescriptions: ImageFaceDescriptions) {
    this.faceSize = imageFaceDescriptions.faceSize
    this.faceDescriptions = imageFaceDescriptions.faceDescriptions
  }
}

export interface IImageFaceDescriptions extends ImageFaceDescriptions {}