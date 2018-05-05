import { Document, Model, model, Schema } from 'mongoose';

import { RectType } from './rectType';
import { IFaceDescription } from '../entities/FaceDescription';

export interface IFaceDescriptionModel extends IFaceDescription, Document {}

const FaceDescriptionSchema = new Schema({
  filename: { type: String, required: true },
  rect: {
    type: RectType,
    required: true,
    _id: false
  },
  faceSize: { type: Number, required: true },
  angle: { type: Number, required: true },
  descriptor: {
    type: [Number],
    _id: false,
    required: true
  },
  isDuplicate: {
    type: Boolean
  }
})

FaceDescriptionSchema.index({ filename: 1 }, { unique: false })

export const FaceDescriptionModel: Model<IFaceDescriptionModel> = model<IFaceDescriptionModel>('FaceDescriptions', FaceDescriptionSchema)