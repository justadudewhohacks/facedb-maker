import { IImageBase } from '../entities/Image';
import { IRect, Rect } from '../entities/Rect';
import { IFaceDescriptionsForSize, IImageModel, ImageModel, IPopulatedImageModel } from './image.model';

export function findByUriHash(hash: string): Promise<IImageModel | null> {
  return ImageModel
    .findOne({ filename: { $regex: hash } })
    .lean()
    .exec()
}

export function findByFilename(filename: string): Promise<IImageModel | null> {
  return ImageModel.findOne({ filename }).lean().exec()
}

export function findByUri(uri: string): Promise<IImageModel | null> {
  return ImageModel.find({ uri }).lean().exec()
}

export function findByQuery(query: string, skip: number, limit: number): Promise<IPopulatedImageModel[]> {
  return ImageModel.find({ queries: query }).skip(skip).limit(limit).populate('faceDescriptionsForSize.faceDescriptionRefs').lean().exec()
}

export function findForLocateFaces(): Promise<IImageModel[]> {
  return ImageModel.find({ faceLocations: null }).lean().exec()
}

export async function findForComputeFaceDescriptions(faceSize: number): Promise<IImageModel[]> {
  return await ImageModel.find({ 'faceDescriptionsForSize.faceSize': { $ne: faceSize } }).lean().exec()
}

export function findAll(): Promise<IImageModel[]> {
  return ImageModel.find().lean().exec()
}

export function upsertImageDownloadResult(image: IImageBase): Promise<void> {
  const { filename } = image
  return ImageModel.update({ filename }, image, { upsert: true }).lean().exec()
}

export function updateQueries(filename: string, queries: string[]): Promise<void> {
  return ImageModel.update({ filename }, { $set: { queries } }).lean().exec()
}

export function updateFaceLocations(filename: string, faceLocations: IRect[]): Promise<void> {
  return ImageModel.update({ filename }, { $set: { faceLocations: faceLocations.map(rect => new Rect(rect)) } }).lean().exec()
}

export function storeFaceDescriptions(filename: string, faceDescriptionForSize: IFaceDescriptionsForSize): Promise<void> {
  return ImageModel.update({ filename }, { $push: { faceDescriptionsForSize: faceDescriptionForSize } }).lean().exec()
}