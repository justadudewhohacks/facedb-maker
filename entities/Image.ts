import { ImageFaceDescriptions } from './ImageFaceDescriptions';
import { Rect } from './Rect';

export class ImageBase {
  uri: string
  filename: string
  queries: string[]
  faceLocations?: Rect[] | null

  constructor(imgBase : IImageBase) {
    this.uri = imgBase.uri
    this.filename = imgBase.filename
    this.queries = imgBase.queries
    imgBase.faceLocations && (this.faceLocations = imgBase.faceLocations.map(rect => new Rect(rect)))
  }
}

export interface IImageBase extends ImageBase {}

export class Image extends ImageBase {
  imageFaceDescriptions?: ImageFaceDescriptions[] | null

  constructor(img : IImage & any) {
    super(img)
    img.imageFaceDescriptions && (this.imageFaceDescriptions = img.imageFaceDescriptions)
  }
}

export interface IImage extends Image {}