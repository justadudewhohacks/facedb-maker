import { ImageDownloader } from 'google-image-downloader';

import { Image } from '../entities/Image';
import * as ImageDao from '../persistence/image.dao';

const MAX_IMAGES_PER_QUERYS = 100
const NUM_DOWNLOAD_IMAGES_PER_QUERY = 20

export type ReadImageFunction = (filename: string) => Promise<Buffer>

export class CustomImageDownloader extends ImageDownloader {
  constructor() {
    super('./', true, false)
  }

  async haveImage(uriHash: string, _: string, query: string): Promise<boolean> {
    try {
      const existingImg = await ImageDao.findByUriHash(uriHash)
      if (existingImg) {
        if (!existingImg.queries.some(q => q === query)) {
          // upsert query
          await ImageDao.updateQueries(
            existingImg.filename,
            existingImg.queries.concat(query)
          )
        }
        return true
      }
    } catch (error) {
      console.log('haveImage - error:')
      console.log(error)
    }
    return false
  }

  async downloadImagesForQuery(query: string) {
    const iterate = async (iteration: number) => {
      try {
        const results = await this.downloadImages(query, NUM_DOWNLOAD_IMAGES_PER_QUERY)
        const failedDownloads = results.filter(res => res.error)
        const successfulDownloads = results.filter(res => !res.error)
        failedDownloads.forEach((res) => {
          const { uri, error, message } = res
          console.log('downloading image failed')
          console.log(uri)
          console.log(error)
          console.log(message)
        })
  
        await Promise.all(
          successfulDownloads.map(
            res => ImageDao.upsertImageDownloadResult(new Image({ ...res, queries: [query] }))
              .catch((error: any) => {
                console.log('persisting ImageDownloadResult failed')
                console.log(res)
                console.log(error)
              })
          )
        )
  
        console.log('downloading images iteration %s done', iteration)
  
        if (iteration < (MAX_IMAGES_PER_QUERYS / NUM_DOWNLOAD_IMAGES_PER_QUERY)) {
          await iterate(iteration + 1)
        }
      } catch (error) {
        console.log('downloading images failed')
        console.log(query)
        console.log(error)
      }
    }
  
    return await iterate(0)
  }
}