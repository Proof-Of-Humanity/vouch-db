import {
  Model, Schema, model
} from 'mongoose';
import TimeStampPlugin, {
  ITimeStampedDocument
} from './plugins/timestamp-plugin';

export interface IVouch extends ITimeStampedDocument {
  /** The profile that received the vouch */
  submissionId: string;
  /** The addresses of the vouchers */
  vouchers: string[];
  /** The signatures from the vouchers */
  signatures: string[];
  /** Expiration timestamps of the vouches */
  expirationTimetamps: number[];
}

interface IVouchModel extends Model<IVouch> { }

const schema = new Schema<IVouch>({
  submissionId: { type: String, index: true, required: true },
  vouchers: { type: [String], index: true, required: true },
  signatures: { type: [String], index: true, required: true },
  expirationTimetamps: { type: [Number], index: true, required: true }
});

// Add timestamp plugin for createdAt and updatedAt in miliseconds from epoch
schema.plugin(TimeStampPlugin);

const Vouch: IVouchModel = model<IVouch, IVouchModel>('Vouch', schema);

export default Vouch;
