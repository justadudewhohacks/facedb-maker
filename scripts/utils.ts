import * as cv from 'opencv4nodejs';
import * as path from 'path';

import { IRect } from '../entities/Rect';

export function readImage(filename: string): cv.Mat {
  return cv.imread(path.resolve(__dirname, '../main/output/images', filename))
}

export function jsonToCvRect({ x, y, width, height } : any): cv.Rect {
  return new cv.Rect(x, y, width, height)
}

export type DecodedFaceFilename = {
  faceFileId: string
  imgFilename: string
  rect: IRect
}

export function decodeFaceFilename(faceFilename: string): DecodedFaceFilename {
  const faceFileId = faceFilename.replace(/.png$/, '')
  const parts = faceFileId.split('_')
  if (!parts || parts.length !== 6 || parts.some(p => !p)) {
    console.log(parts)
    throw new Error(`invalid faceFilename '${faceFilename}'`)
  }

  const [hash, ext, ...rest] = parts
  const rectProps = rest.map(p => parseInt(p))

  if (rectProps.some(p => isNaN(p))) {
    console.log(rest)
    console.log(rectProps)
    throw new Error(`invalid rectProps`)
  }

  const [x, y, width, height] = rectProps
  return {
    faceFileId,
    imgFilename: `${hash}.${ext}`,
    rect: { x, y, width, height }
  }
}