import { Model, Schema, model } from 'mongoose';
import TimeStampPlugin, {
  ITimeStampedDocument
} from './plugins/timestamp-plugin';

export interface ISyncBlock extends ITimeStampedDocument {
  id: string;
  lastBlock: number;
}

type ISyncBlockModel = Model<ISyncBlock>;

const schema = new Schema<ISyncBlock>({
  id: { type: String, required: true, index: true },
  lastBlock: { type: Number, required: true, index: true }
});

// Add timestamp plugin for createdAt and updatedAt in miliseconds from epoch
schema.plugin(TimeStampPlugin);

const SyncBlock: ISyncBlockModel = model<ISyncBlock, ISyncBlockModel>(
  'SyncBlock',
  schema,
);

export default SyncBlock;
