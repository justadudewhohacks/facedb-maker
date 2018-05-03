import * as cv from 'opencv4nodejs';

export function jsonToCvRect({ x, y, width, height } : any): cv.Rect {
  return new cv.Rect(x, y, width, height)
}

type PromiseCreator<T> = () => Promise<T>

export async function promiseChain<T>(promiseCreators: PromiseCreator<T>[]): Promise<T[]> {
  const results: T[] = []

  async function next(remainingPromiseCreators: PromiseCreator<T>[]): Promise<void> {
    const curr = remainingPromiseCreators[0]

    if (curr) {
      const result = await curr()
      results.push(result)
      await next(remainingPromiseCreators.slice(1))
    }
  }

  await (next(promiseCreators))
  return results
}
