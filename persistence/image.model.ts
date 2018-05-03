import { Document, Model, model, Schema } from 'mongoose';

import { IFaceDescription } from '../entities/FaceDescription';
import { IImageBase } from '../entities/Image';
import { RectType } from './rectType';

export interface IPopulatedFaceDescriptionsForSize {
  faceSize: number
  faceDescriptionRefs: IFaceDescription[]
}

export interface IFaceDescriptionsForSize {
  faceSize: number
  faceDescriptionRefs: any[]
}

export interface IImageModel extends IImageBase, Document {
  faceDescriptionsForSize: IFaceDescriptionsForSize[]
}

export interface IPopulatedImageModel extends IImageModel {
  faceDescriptionsForSize: IPopulatedFaceDescriptionsForSize[]
}

const ImageSchema = new Schema({
  uri: { type: String, required: true, unique: true },
  filename: { type: String, required: true, unique: true },
  queries: { type: [String] },
  faceLocations: {
    type: [RectType],
    _id: false
  },
  faceDescriptionsForSize: {
    type: [{
      faceSize: Number,
      faceDescriptionRefs: [{ type: Schema.Types.ObjectId, ref: 'FaceDescriptions' }],
      _id: false
    }]
  }
})

ImageSchema.index({ filename: 1 }, { unique: true })

export const ImageModel: Model<IImageModel> = model<IImageModel>('Images', ImageSchema)