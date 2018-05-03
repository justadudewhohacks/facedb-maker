import { close, connect } from '../persistence/db';
import { ImageModel } from '../persistence/image.model';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  await connect()
  console.log('connected')

  const queries = await ImageModel.find().distinct('queries')
  console.log(queries.length)
  fs.writeFileSync(path.resolve(__dirname, 'output', 'queries.json'), JSON.stringify(queries))
  close()
}

run()