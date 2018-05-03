import './.env';

import * as mongoose from 'mongoose';


export function connect() {
  return mongoose.connect(`mongodb://${process.env.MLAB_USER}:${process.env.MLAB_PW}@${process.env.MLAB_ADDRESS}`)
}

export function close() {
  return mongoose.connection.close()
}

export const connection = {
  connect,
  close
}