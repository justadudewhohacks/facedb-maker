import { Rect } from './Rect';

export class FaceDescription {
  filename: string
  faceSize: number
  rect: Rect
  angle: number
  descriptor: number[]
  isDuplicate?: boolean

  constructor(faceDescription: IFaceDescription) {
    this.filename = faceDescription.filename
    this.faceSize = faceDescription.faceSize
    this.rect = faceDescription.rect
    this.angle = faceDescription.angle
    this.descriptor = faceDescription.descriptor
    faceDescription.isDuplicate && (this.isDuplicate = faceDescription.isDuplicate)
  }
}

export interface IFaceDescription extends FaceDescription {}